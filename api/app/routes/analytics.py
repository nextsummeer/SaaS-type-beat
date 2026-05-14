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


@router.get("/my-beats")
def my_beats(
    period: str = Query("7d", description="7d, 30d ou 90d"),
    authorization: str = Header(...),
):
    """Lista beats publicados pelo BeatPost com suas stats individuais.

    Diferente de /top-beats que pega TOP global do canal, esse filtra
    APENAS pelos beats que existem na tabela `posts` do user (ou seja,
    beats publicados via BeatPost). Ignora videos antigos do canal.

    Beats que ainda não têm views (api retorna 0 ou nem retorna) entram
    na lista mesmo assim, com views=0, pra UI mostrar tudo que foi publicado.

    Retorna:
        {
          "period": "7d",
          "items": [
            {
              "beat_id": "uuid",
              "video_id": "yt-id",
              "titulo": "...",
              "artista_nome": "...",
              "cover_path": "...",
              "youtube_url": "https://...",
              "views": 1243,
              "retention_pct": 52.0
            },
            ...
          ]
        }
    """
    user_id = _autentica(authorization)
    periodo = _valida_periodo(period)

    # Buscar todos os beats publicados (posts com youtube_video_id)
    from app.services.supabase_service import get_admin_client

    client = get_admin_client()
    try:
        # titulo mora em posts (escolhido pela IA na revisão); artista_nome e cover_path moram em beats
        posts_data = (
            client.table("posts")
            .select(
                "id, youtube_video_id, youtube_url, titulo, youtube_deleted_at, beats(id, artista_nome, cover_path)"
            )
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:
        logger.error("my-beats: falha ao buscar posts user=%s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail=f"Erro ao consultar banco: {exc}")

    # Filtrar manualmente os posts com video_id e beat válido, e que ainda existem no YouTube
    posts_lista = [
        p for p in (posts_data.data or [])
        if p.get("youtube_video_id") and p.get("beats") and not p.get("youtube_deleted_at")
    ]
    if not posts_lista:
        return {"period": periodo, "items": []}

    # Mapear video_id → beat info
    beat_por_video: dict[str, dict] = {}
    post_id_por_video: dict[str, str] = {}
    video_ids: list[str] = []
    for p in posts_lista:
        vid = p["youtube_video_id"]
        beat = p["beats"]
        video_ids.append(vid)
        post_id_por_video[vid] = p["id"]
        beat_por_video[vid] = {
            "beat_id": beat["id"],
            "titulo": p.get("titulo"),
            "artista_nome": beat.get("artista_nome"),
            "cover_path": beat.get("cover_path"),
            "youtube_url": p.get("youtube_url"),
        }

    # Verificar estado atual de cada video no YouTube.
    # Custa 1 unit (videos.list até 50 IDs). Aqui:
    #   - retorna privacy_status atual (public/private/unlisted)
    #   - se video sumiu da resposta, foi deletado → persiste em youtube_deleted_at
    privacy_por_video: dict[str, str] = {}
    try:
        from app.services import youtube_service

        status_map = youtube_service.list_videos_status(user_id, video_ids)
        deletados_agora: list[str] = []
        for vid, status in status_map.items():
            if status is None:
                deletados_agora.append(vid)
            else:
                privacy_por_video[vid] = status

        # Persistir os deletados pra próxima vez nem precisar consultar
        if deletados_agora:
            from datetime import datetime, timezone
            agora_iso = datetime.now(timezone.utc).isoformat()
            for vid in deletados_agora:
                post_id = post_id_por_video.get(vid)
                if not post_id:
                    continue
                try:
                    client.table("posts").update(
                        {"youtube_deleted_at": agora_iso}
                    ).eq("id", post_id).execute()
                    # Remove da listagem
                    beat_por_video.pop(vid, None)
                except Exception as exc:
                    logger.warning(
                        "my-beats: falha ao marcar deleted vid=%s post=%s: %s",
                        vid, post_id, exc,
                    )
            # Atualiza video_ids pra chamada do Analytics ignorar os deletados
            video_ids = [v for v in video_ids if v not in deletados_agora]
    except Exception as exc:
        # Não derrubar o endpoint inteiro se a checagem de status falhar
        logger.warning("my-beats: falha em list_videos_status user=%s: %s", user_id, exc)

    if not video_ids:
        return {"period": periodo, "items": []}

    # Buscar stats do YouTube Analytics filtrado por esses video_ids
    try:
        raw = youtube_analytics.get_beats_stats(user_id, video_ids, periodo)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except RuntimeError as exc:
        logger.error("my-beats falhou no Google pra user=%s: %s", user_id, exc)
        # Em vez de retornar 502, retorna a lista com zeros pra UI nao quebrar
        raw = {"columnHeaders": [], "rows": []}

    # Parse: mapear video_id → stats
    headers = [h["name"] for h in raw.get("columnHeaders", [])]
    stats_por_video: dict[str, dict] = {}
    for row in raw.get("rows") or []:
        valores = dict(zip(headers, row))
        vid = valores.get("video")
        if vid:
            stats_por_video[vid] = {
                "views": int(valores.get("views") or 0),
                "retention_pct": round(float(valores.get("averageViewPercentage") or 0), 1),
            }

    # Montar lista final: TODOS os beats publicados (mesmo sem views)
    items = []
    for vid, info in beat_por_video.items():
        stats = stats_por_video.get(vid, {"views": 0, "retention_pct": 0.0})
        items.append({
            "beat_id": info["beat_id"],
            "video_id": vid,
            "titulo": info["titulo"],
            "artista_nome": info["artista_nome"],
            "cover_path": info["cover_path"],
            "youtube_url": info["youtube_url"],
            "privacy_status": privacy_por_video.get(vid, "public"),
            "views": stats["views"],
            "retention_pct": stats["retention_pct"],
        })

    # Ordenar por views desc, depois por título
    items.sort(key=lambda x: (-x["views"], (x["titulo"] or "").lower()))

    return {"period": periodo, "items": items}


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
    # IMPORTANTE: nunca deixar o join quebrar a request — se Supabase falhar,
    # retorna items com beat=null e loga, mas a UI ainda recebe video_id+views
    video_ids = [p["video_id"] for p in parsed if p["video_id"]]
    beats_por_video: dict[str, dict] = {}
    if video_ids:
        try:
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
        except Exception as exc:
            logger.warning(
                "Falha no join posts/beats em /top-beats user=%s: %s",
                user_id, exc,
            )

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
