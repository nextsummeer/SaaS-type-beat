"""Endpoints REST do painel de Analytics do YouTube.

Cada endpoint:
- Valida o JWT do Supabase
- Aceita query param `period` (whitelist: 7d/30d/90d, default 7d)
- Usa o service `youtube_analytics` que faz cache automático de 24h
- Retorna JSON já mastigado pra UI consumir direto

T7.3-T7.6 do _tasks-fase2-analytics.md.
"""
import logging

from fastapi import APIRouter, Header, HTTPException, Query

from app.services import youtube_analytics
from app.services.supabase_service import validate_token

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)

PERIODOS_VALIDOS = {"7d", "30d", "90d"}


def _autentica(authorization: str) -> str:
    """Valida o JWT no header e retorna o user_id. Lança 401 se inválido."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")
    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    return str(user.id)


def _valida_periodo(periodo: str) -> str:
    if periodo not in PERIODOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"period deve ser um de {sorted(PERIODOS_VALIDOS)}",
        )
    return periodo


@router.get("/top-beats")
def top_beats(
    period: str = Query("7d", description="7d, 30d ou 90d"),
    limit: int = Query(5, ge=1, le=20, description="Quantos beats retornar"),
    authorization: str = Header(...),
):
    """Top vídeos do canal por views no período.

    Cruza dados YT Analytics (video_id → views, retenção) com a tabela
    `beats` do Supabase pra trazer título + cover URL + artista junto.

    Retorna:
        {
          "period": "7d",
          "items": [
            {
              "video_id": "abc123",
              "views": 1243,
              "retention_pct": 52.0,
              "beat": {  // null se YT video não está no nosso banco
                "id": "uuid",
                "titulo": "Travis Scott Type Beat - Dark Trap",
                "artista_nome": "Travis Scott",
                "cover_path": "user-x/beat-y/cover.jpg"
              }
            },
            ...
          ]
        }
    """
    user_id = _autentica(authorization)
    periodo = _valida_periodo(period)

    try:
        raw = youtube_analytics.get_top_beats(user_id, periodo, limite=limit)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except RuntimeError as exc:
        logger.error("Top beats falhou no Google pra user=%s: %s", user_id, exc)
        raise HTTPException(status_code=502, detail="Erro ao falar com YouTube Analytics")

    # Parse das linhas: [video_id, views, averageViewPercentage]
    headers = [h["name"] for h in raw.get("columnHeaders", [])]
    rows = raw.get("rows") or []
    parsed: list[dict] = []
    for row in rows:
        valores = dict(zip(headers, row))
        video_id = valores.get("video") or ""
        parsed.append(
            {
                "video_id": video_id,
                "views": int(valores.get("views") or 0),
                "retention_pct": round(float(valores.get("averageViewPercentage") or 0), 1),
            }
        )

    # Enriquecer com dados do nosso banco (titulo, cover, artista)
    # video_id mora em posts; beats traz metadados via join
    video_ids = [p["video_id"] for p in parsed if p["video_id"]]
    beats_por_video: dict[str, dict] = {}
    if video_ids:
        from app.services.supabase_service import get_admin_client

        client = get_admin_client()
        posts_data = (
            client.table("posts")
            .select("youtube_video_id, beats(id, titulo, artista_nome, cover_path)")
            .eq("user_id", user_id)
            .in_("youtube_video_id", video_ids)
            .execute()
        )
        for p in posts_data.data or []:
            vid = p.get("youtube_video_id")
            beat = p.get("beats")
            if vid and beat:
                beats_por_video[vid] = beat

    for item in parsed:
        item["beat"] = beats_por_video.get(item["video_id"])

    return {
        "period": periodo,
        "items": parsed,
    }


@router.get("/overview")
def overview(
    period: str = Query("7d", description="7d, 30d ou 90d"),
    debug: bool = Query(False, description="Se true, inclui JSON cru da API do YouTube"),
    authorization: str = Header(...),
):
    """KPIs do canal: views, inscritos ganhos, retenção — com delta vs período anterior.

    Retorna:
        {
          "period": "7d",
          "views":              { "value": 187, "previous": 142, "delta_pct": 31.7 },
          "subscribers_gained": { "value": 3,   "previous": 1,   "delta_pct": 200.0 },
          "retention":          { "value": 47.5, "previous": 42.1, "delta_pct": 12.8 }
        }

    Se `debug=true`, adiciona `raw_atual` e `raw_anterior` com o JSON
    literal devolvido pela YouTube Analytics API (sem cache, sem parse).
    """
    user_id = _autentica(authorization)
    periodo = _valida_periodo(period)

    try:
        atual_raw = youtube_analytics.get_overview(user_id, periodo)
        anterior_raw = youtube_analytics.get_overview(user_id, periodo, anterior=True)
    except ValueError as exc:
        # Usuário sem canal conectado
        logger.warning("Overview falhou pra user=%s: %s", user_id, exc)
        raise HTTPException(status_code=409, detail=str(exc))
    except RuntimeError as exc:
        # Google rejeitou (token expirado, scope faltando, etc)
        logger.error("Overview falhou no Google pra user=%s: %s", user_id, exc)
        raise HTTPException(status_code=502, detail="Erro ao falar com YouTube Analytics")

    atual = youtube_analytics.parse_overview_row(atual_raw)
    anterior = youtube_analytics.parse_overview_row(anterior_raw)

    resposta = {
        "period": periodo,
        "views": {
            "value": atual["views"],
            "previous": anterior["views"],
            "delta_pct": youtube_analytics.calcula_delta_pct(
                atual["views"], anterior["views"]
            ),
        },
        "subscribers_gained": {
            "value": atual["subscribersGained"],
            "previous": anterior["subscribersGained"],
            "delta_pct": youtube_analytics.calcula_delta_pct(
                atual["subscribersGained"], anterior["subscribersGained"]
            ),
        },
        "retention": {
            "value": round(atual["averageViewPercentage"], 1),
            "previous": round(anterior["averageViewPercentage"], 1),
            "delta_pct": youtube_analytics.calcula_delta_pct(
                atual["averageViewPercentage"], anterior["averageViewPercentage"]
            ),
        },
    }

    if debug:
        from datetime import date, timedelta

        dias = youtube_analytics.PERIODOS[periodo]
        end_atual = date.today()
        start_atual = end_atual - timedelta(days=dias)
        end_ant = end_atual - timedelta(days=dias)
        start_ant = end_ant - timedelta(days=dias)
        resposta["_debug"] = {
            "data_hoje": date.today().isoformat(),
            "intervalo_atual": f"{start_atual} → {end_atual}",
            "intervalo_anterior": f"{start_ant} → {end_ant}",
            "raw_atual": atual_raw,
            "raw_anterior": anterior_raw,
        }

    return resposta
