"""YouTube Analytics API wrapper com cache 24h em Supabase.

Cada chamada à API custa 1 unit (cota default 10k/dia). Como os dados
do YT Analytics têm delay natural de 24-48h, o cache de 24h não causa
perda de precisão e reduz drasticamente o consumo de quota.

T7.2 do _tasks-fase2-analytics.md.
"""
from __future__ import annotations

import logging
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any, Callable

import requests

from app.services import youtube_oauth
from app.services.supabase_service import get_admin_client

logger = logging.getLogger(__name__)

REPORTS_URL = "https://youtubeanalytics.googleapis.com/v2/reports"
CACHE_TTL_HOURS = 24

# Períodos suportados (string -> dias)
PERIODOS: dict[str, int] = {"7d": 7, "30d": 30, "90d": 90}


# ──────────────────────────────────────────────────────────────────────
# Helpers internos
# ──────────────────────────────────────────────────────────────────────

def _periodo_para_datas(periodo: str, anterior: bool = False) -> tuple[date, date]:
    """Converte '7d'/'30d'/'90d' em (start_date, end_date).

    IMPORTANTE: a YouTube Analytics API não consolida dados do dia atual.
    Se o endDate incluir "hoje", a API tende a retornar zeros pra todo o
    intervalo. Por isso terminamos em ONTEM, igual ao YT Studio faz.

    Pra periodo='7d':
      - atual    = (hoje-7, ontem)        — 7 dias completos terminando ontem
      - anterior = (hoje-14, hoje-8)      — 7 dias antes desses
    """
    dias = PERIODOS.get(periodo)
    if dias is None:
        raise ValueError(f"Período inválido: {periodo!r}. Use {list(PERIODOS)}")
    # Termina em "ontem" (último dia consolidado)
    end = date.today() - timedelta(days=1)
    if anterior:
        end = end - timedelta(days=dias)
    start = end - timedelta(days=dias - 1)
    return start, end


def _cache_get(user_id: str, cache_key: str) -> dict | None:
    """Retorna o payload cacheado se ainda válido, ou None."""
    client = get_admin_client()
    result = (
        client.table("analytics_cache")
        .select("payload, expires_at")
        .eq("user_id", user_id)
        .eq("cache_key", cache_key)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    row = result.data[0]
    expires_at = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
    if expires_at <= datetime.now(timezone.utc):
        return None
    return row["payload"]


def _cache_set(user_id: str, cache_key: str, payload: dict) -> None:
    """Upsert no cache com TTL fixo (24h)."""
    expires_at = datetime.now(timezone.utc) + timedelta(hours=CACHE_TTL_HOURS)
    client = get_admin_client()
    client.table("analytics_cache").upsert(
        {
            "user_id": user_id,
            "cache_key": cache_key,
            "payload": payload,
            "expires_at": expires_at.isoformat(),
        },
        on_conflict="user_id,cache_key",
    ).execute()


def _get_channel_id(user_id: str) -> str:
    """Busca o channel_id real do canal conectado pelo user.

    Critico pra contas Brand: `channel==MINE` na YouTube Analytics API
    pega o canal default da conta Google, nao o Brand. Pra evitar isso,
    sempre passamos o channel_id explicito da tabela youtube_accounts.
    """
    client = get_admin_client()
    result = (
        client.table("youtube_accounts")
        .select("channel_id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise ValueError(f"User {user_id} não tem canal YouTube conectado")
    return result.data[0]["channel_id"]


def _log_api_usage(user_id: str, cache_key: str, duration_ms: int) -> None:
    """Registra a chamada paga no api_usage (regra obrigatória do projeto)."""
    try:
        client = get_admin_client()
        client.table("api_usage").insert(
            {
                "user_id": user_id,
                "feature": "youtube_analytics_api",
                "duration_ms": duration_ms,
                "cost_usd": 0,  # quota free, sem custo monetário direto
                "metadata": {"cache_key": cache_key, "units": 1},
            }
        ).execute()
    except Exception as exc:
        # Não falhar a request principal se o tracking quebrar
        logger.warning("Falha ao registrar api_usage: %s", exc)


def _reports_query(access_token: str, channel_id: str, params: dict[str, Any]) -> dict:
    """Chamada genérica ao endpoint /v2/reports da YouTube Analytics API.

    Usa `channel==<channel_id>` explicito (NÃO `channel==MINE`) pra funcionar
    com contas Brand (canal padrão diferente do canal real do produtor).
    """
    resp = requests.get(
        REPORTS_URL,
        params={"ids": f"channel=={channel_id}", **params},
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    if not resp.ok:
        logger.error(
            "YouTube Analytics API erro: %s %s body=%s",
            resp.status_code,
            resp.reason,
            resp.text[:500],
        )
        raise RuntimeError(
            f"YouTube Analytics rejeitou a request: {resp.status_code} {resp.reason}"
        )
    return resp.json()


def _get_or_fetch(
    user_id: str,
    cache_key: str,
    fetcher: Callable[[str, str], dict],
) -> dict:
    """Pattern: cache hit retorna; cache miss chama fetcher + persiste + registra.

    `fetcher` recebe (access_token, channel_id) e devolve o payload bruto.
    O channel_id é buscado do banco — necessário pra contas Brand onde
    `channel==MINE` retorna o canal default (vazio) em vez do canal real.
    """
    cached = _cache_get(user_id, cache_key)
    if cached is not None:
        logger.info("[analytics] cache HIT user=%s key=%s", user_id, cache_key)
        return cached

    logger.info("[analytics] cache MISS user=%s key=%s", user_id, cache_key)
    access_token = youtube_oauth.get_access_token(user_id)
    channel_id = _get_channel_id(user_id)
    started = time.monotonic()
    payload = fetcher(access_token, channel_id)
    duration_ms = int((time.monotonic() - started) * 1000)

    _cache_set(user_id, cache_key, payload)
    _log_api_usage(user_id, cache_key, duration_ms)
    return payload


# ──────────────────────────────────────────────────────────────────────
# API pública — 4 relatórios
# ──────────────────────────────────────────────────────────────────────

def get_overview(user_id: str, periodo: str = "7d", anterior: bool = False) -> dict:
    """Métricas agregadas do canal no período.

    Retorna o JSON cru da API com `rows` contendo
    [views, subscribersGained, averageViewPercentage].

    Se `anterior=True`, busca o intervalo IMEDIATAMENTE anterior de mesmo
    tamanho — usado pelo endpoint pra calcular delta % vs período anterior.
    """
    start, end = _periodo_para_datas(periodo, anterior=anterior)
    cache_key = f"overview:{periodo}:anterior" if anterior else f"overview:{periodo}"

    def fetcher(access_token: str, channel_id: str) -> dict:
        return _reports_query(
            access_token,
            channel_id,
            {
                "startDate": start.isoformat(),
                "endDate": end.isoformat(),
                "metrics": "views,subscribersGained,averageViewPercentage",
            },
        )

    return _get_or_fetch(user_id, cache_key, fetcher)


def parse_overview_row(payload: dict) -> dict[str, float]:
    """Extrai métricas do payload bruto da API.

    Mapeia `rows[0]` aos `columnHeaders` por nome. Retorna 0 pra cada
    métrica se `rows` estiver vazio (canal sem atividade no período).

    Métricas esperadas: views, subscribersGained, averageViewPercentage.
    """
    rows = payload.get("rows") or []
    if not rows:
        return {"views": 0, "subscribersGained": 0, "averageViewPercentage": 0.0}

    headers = [h["name"] for h in payload.get("columnHeaders", [])]
    row = rows[0]
    valores = dict(zip(headers, row))
    return {
        "views": int(valores.get("views") or 0),
        "subscribersGained": int(valores.get("subscribersGained") or 0),
        "averageViewPercentage": float(valores.get("averageViewPercentage") or 0.0),
    }


def calcula_delta_pct(atual: float, anterior: float) -> float:
    """Calcula delta % entre dois valores.

    - Se anterior == 0 e atual > 0 → 100% (cresceu do zero)
    - Se ambos == 0 → 0%
    - Caso normal → arredondado a 1 casa decimal
    """
    if anterior == 0:
        return 100.0 if atual > 0 else 0.0
    return round(((atual - anterior) / anterior) * 100, 1)


def get_top_beats(user_id: str, periodo: str = "7d", limite: int = 5) -> dict:
    """Top vídeos por views no período (até `limite`)."""
    if not (1 <= limite <= 20):
        raise ValueError("limite deve estar entre 1 e 20")
    start, end = _periodo_para_datas(periodo)
    cache_key = f"top-beats:{periodo}:{limite}"

    def fetcher(access_token: str, channel_id: str) -> dict:
        return _reports_query(
            access_token,
            channel_id,
            {
                "startDate": start.isoformat(),
                "endDate": end.isoformat(),
                "dimensions": "video",
                "metrics": "views,averageViewPercentage",
                "sort": "-views",
                "maxResults": limite,
            },
        )

    return _get_or_fetch(user_id, cache_key, fetcher)


def get_traffic_sources(user_id: str, periodo: str = "7d") -> dict:
    """Quebra de tráfego por fonte (pesquisa, sugeridos, externo, outros)."""
    start, end = _periodo_para_datas(periodo)
    cache_key = f"traffic-sources:{periodo}"

    def fetcher(access_token: str, channel_id: str) -> dict:
        return _reports_query(
            access_token,
            channel_id,
            {
                "startDate": start.isoformat(),
                "endDate": end.isoformat(),
                "dimensions": "insightTrafficSourceType",
                "metrics": "views",
                "sort": "-views",
            },
        )

    return _get_or_fetch(user_id, cache_key, fetcher)


def get_views_timeline(user_id: str, periodo: str = "7d") -> dict:
    """Série temporal de views (dia a dia em 7d/30d, mês a mês em 90d)."""
    start, end = _periodo_para_datas(periodo)
    # 90d → granularidade mensal pra não retornar 90 pontos no gráfico
    dimensao = "month" if periodo == "90d" else "day"
    cache_key = f"views-timeline:{periodo}"

    def fetcher(access_token: str, channel_id: str) -> dict:
        return _reports_query(
            access_token,
            channel_id,
            {
                "startDate": start.isoformat(),
                "endDate": end.isoformat(),
                "dimensions": dimensao,
                "metrics": "views",
                "sort": dimensao,
            },
        )

    return _get_or_fetch(user_id, cache_key, fetcher)
