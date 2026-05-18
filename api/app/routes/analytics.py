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
    period: str = Query("7d", description="Mantido por compat — stats agora sao lifetime via Data API"),
    force_refresh: bool = Query(False, description="Bypassa cache de 5min (botao RELOAD da UI)"),
    authorization: str = Header(...),
):
    """Lista beats publicados pelo BeatPost com stats lifetime quase em tempo real.

    Usa YouTube Data API (`videos.list?part=statistics,snippet,status`) que retorna
    metricas em minutos (vs Analytics API que tem delay 24-48h). Stats sao LIFETIME
    (totais desde upload), nao por periodo — por isso `period` virou no-op aqui.

    Cache 5min via `analytics_cache`. `force_refresh=true` ignora cache (botao RELOAD).

    Detecta videos deletados automaticamente: se video_id nao volta no response,
    foi removido do YouTube → persiste `youtube_deleted_at`.

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
              "privacy_status": "public",
              "view_count": 1243,
              "like_count": 27,
              "comment_count": 3,
              "published_at": "2026-05-18T15:30:00Z"
            },
            ...
          ]
        }
    """
    user_id = _autentica(authorization)
    periodo = _valida_periodo(period)

    from app.services.supabase_service import get_admin_client
    from app.services import youtube_service

    client = get_admin_client()
    try:
        # titulo mora em posts (escolhido pela IA na revisao); artista_nome e cover_path moram em beats
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

    # Filtrar manualmente os posts com video_id e beat valido, e que ainda existem no YouTube
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

    # 1 unica chamada Data API (1 unit/chunk de 50) traz: stats + privacy + detecta deletados.
    # Substitui a combinacao antiga (list_videos_status + Analytics get_beats_stats = 2 units).
    try:
        stats_por_video, was_fresh_call = youtube_service.get_realtime_stats(
            user_id, video_ids, force_refresh=force_refresh
        )
    except Exception as exc:
        logger.warning("my-beats: falha em get_realtime_stats user=%s: %s", user_id, exc)
        stats_por_video, was_fresh_call = {}, False

    # Detectar deletados: video_ids que nao voltaram do response.
    # So confiavel quando `was_fresh_call=True` (chamada fresh da API) — ausencia no
    # cache pode ser so video novo nao indexado, nao deletado.
    if was_fresh_call:
        deletados_agora = [vid for vid in video_ids if vid not in stats_por_video]
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
                    beat_por_video.pop(vid, None)
                except Exception as exc:
                    logger.warning(
                        "my-beats: falha ao marcar deleted vid=%s post=%s: %s",
                        vid, post_id, exc,
                    )

    # Montar lista final: TODOS os beats publicados (mesmo sem stats — entram com zeros)
    items = []
    for vid, info in beat_por_video.items():
        stats = stats_por_video.get(vid, {})
        items.append({
            "beat_id": info["beat_id"],
            "video_id": vid,
            "titulo": info["titulo"],
            "artista_nome": info["artista_nome"],
            "cover_path": info["cover_path"],
            "youtube_url": info["youtube_url"],
            "privacy_status": stats.get("privacy_status") or "public",
            "view_count": stats.get("view_count", 0),
            "like_count": stats.get("like_count", 0),
            "comment_count": stats.get("comment_count", 0),
            "published_at": stats.get("published_at"),
            "duration_seconds": stats.get("duration_seconds", 0),
        })

    # Ordenar default: published_at desc (mais recente primeiro), fallback titulo
    items.sort(key=lambda x: (x["published_at"] or "", (x["titulo"] or "").lower()), reverse=True)

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


# Labels amigáveis pros tipos de tráfego do YT Analytics
TRAFFIC_SOURCE_LABELS = {
    "YT_SEARCH": "Pesquisa YouTube",
    "RELATED_VIDEO": "Vídeos sugeridos",
    "EXT_URL": "Sites externos",
    "EXT_APP": "Apps externos",
    "YT_OTHER_PAGE": "Outras páginas YouTube",
    "YT_CHANNEL": "Página do canal",
    "YT_PLAYLIST": "Playlists",
    "SUBSCRIBER": "Notificações de inscrito",
    "NOTIFICATION": "Notificações",
    "PLAYLIST": "Playlists",
    "ADVERTISING": "Anúncios",
    "NO_LINK_OTHER": "Direto / desconhecido",
    "NO_LINK_EMBEDDED": "Vídeo incorporado",
    "SHORTS": "YouTube Shorts",
    "HASHTAGS": "Hashtags",
    "END_SCREEN": "Tela final",
    "ANNOTATION": "Anotação",
    "CAMPAIGN_CARD": "Cards",
}


@router.get("/traffic-sources")
def traffic_sources(
    period: str = Query("7d", description="7d, 30d ou 90d"),
    authorization: str = Header(...),
):
    """Quebra de tráfego por fonte (pesquisa, sugeridos, externo, etc).

    Retorna:
        {
          "period": "7d",
          "total_views": 1243,
          "sources": [
            { "key": "YT_SEARCH", "label": "Pesquisa YouTube", "views": 836, "pct": 67.3 },
            { "key": "RELATED_VIDEO", "label": "Vídeos sugeridos", "views": 273, "pct": 22.0 },
            ...
          ]
        }
    """
    user_id = _autentica(authorization)
    periodo = _valida_periodo(period)

    try:
        raw = youtube_analytics.get_traffic_sources(user_id, periodo)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except RuntimeError as exc:
        logger.error("traffic-sources falhou pra user=%s: %s", user_id, exc)
        return {"period": periodo, "total_views": 0, "sources": []}

    headers = [h["name"] for h in raw.get("columnHeaders", [])]
    rows = raw.get("rows") or []

    parsed: list[dict] = []
    total_views = 0
    for row in rows:
        valores = dict(zip(headers, row))
        key = valores.get("insightTrafficSourceType") or "NO_LINK_OTHER"
        views = int(valores.get("views") or 0)
        total_views += views
        parsed.append({
            "key": key,
            "label": TRAFFIC_SOURCE_LABELS.get(key, key.replace("_", " ").title()),
            "views": views,
        })

    # Calcular % e ordenar desc
    for item in parsed:
        item["pct"] = round((item["views"] / total_views * 100) if total_views > 0 else 0, 1)
    parsed.sort(key=lambda x: -x["views"])

    return {
        "period": periodo,
        "total_views": total_views,
        "sources": parsed,
    }


METRICS_VALIDAS = {"views", "subscribersGained"}


@router.get("/views-timeline")
def views_timeline(
    period: str = Query("7d", description="7d, 30d ou 90d"),
    metric: str = Query("views", description="views ou subscribersGained"),
    authorization: str = Header(...),
):
    """Série temporal de uma métrica (views ou inscritos) dia a dia.

    Retorna:
        {
          "period": "7d",
          "metric": "views",
          "granularity": "day",
          "max_views": 187,
          "points": [
            { "date": "2026-05-07", "views": 23 },
            ...
          ]
        }

    O campo `views` no payload representa o VALOR da métrica pedida,
    seja views ou subscribersGained — nome mantido por simplicidade.
    """
    user_id = _autentica(authorization)
    periodo = _valida_periodo(period)
    if metric not in METRICS_VALIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"metric inválida. Use uma de: {sorted(METRICS_VALIDAS)}",
        )

    try:
        raw = youtube_analytics.get_views_timeline(user_id, periodo, metric=metric)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except RuntimeError as exc:
        logger.error("views-timeline falhou pra user=%s: %s", user_id, exc)
        return {
            "period": periodo,
            "metric": metric,
            "granularity": "day",
            "max_views": 0,
            "points": [],
        }

    granularity = "day"
    headers = [h["name"] for h in raw.get("columnHeaders", [])]
    rows = raw.get("rows") or []

    pontos: list[dict] = []
    max_views = 0
    for row in rows:
        valores = dict(zip(headers, row))
        data_str = valores.get(granularity, "")
        # Campo no JSON da API tem o nome literal da métrica
        valor = int(valores.get(metric) or 0)
        if valor > max_views:
            max_views = valor
        pontos.append({"date": data_str, "views": valor})

    return {
        "period": periodo,
        "metric": metric,
        "granularity": granularity,
        "max_views": max_views,
        "points": pontos,
    }
