"""Upload de video pro YouTube usando OAuth do user (refresh token cifrado em youtube_accounts)."""
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

from app.services import usage_tracker
from app.services.supabase_service import get_admin_client

# Quota oficial YouTube Data API v3: videos.insert = 1600, thumbnails.set = 50
# Total tipico por upload do MVP: 1650 units (registrado em api_usage.metadata)
YOUTUBE_UPLOAD_QUOTA_UNITS = 1600
YOUTUBE_THUMBNAIL_QUOTA_UNITS = 50
# videos.list = 1 unit por chunk de ate 50 IDs (usado em realtime stats)
YOUTUBE_LIST_QUOTA_UNITS = 1
# Cache curto pra realtime stats: balance entre frescor e custo de quota
CACHE_TTL_REALTIME_MINUTES = 5
REALTIME_CACHE_KEY = "realtime:my-beats"

logger = logging.getLogger(__name__)

YOUTUBE_CATEGORY_MUSIC = "10"
YOUTUBE_TITLE_MAX = 100
YOUTUBE_DESCRIPTION_MAX = 5000
YOUTUBE_TAGS_TOTAL_MAX = 500


def _vault_key() -> str:
    return os.environ["SUPABASE_VAULT_KEY"]


def _client_id() -> str:
    return os.environ["GOOGLE_OAUTH_CLIENT_ID"]


def _client_secret() -> str:
    return os.environ["GOOGLE_OAUTH_CLIENT_SECRET"]


def _load_account(user_id: str) -> dict:
    """Carrega youtube_accounts do user + decifra refresh_token via RPC."""
    client = get_admin_client()

    rows = (
        client.table("youtube_accounts")
        .select("id, channel_id, access_token, access_token_expires_at, scopes")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        raise RuntimeError(f"Usuario {user_id} nao tem canal YouTube conectado")
    row = rows[0]

    rpc = client.rpc(
        "get_youtube_refresh_token",
        {"p_user_id": user_id, "p_vault_key": _vault_key()},
    ).execute()
    refresh_token = rpc.data
    if not refresh_token:
        raise RuntimeError(f"Refresh token vazio para user {user_id}")

    return {
        "account_id": row["id"],
        "channel_id": row["channel_id"],
        "access_token": row["access_token"],
        "expires_at": row.get("access_token_expires_at"),
        "scopes": row.get("scopes") or [],
        "refresh_token": refresh_token,
    }


def _build_credentials(account: dict) -> Credentials:
    return Credentials(
        token=account["access_token"],
        refresh_token=account["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=_client_id(),
        client_secret=_client_secret(),
        scopes=account["scopes"],
    )


def _persist_refreshed_token(account_id: str, credentials: Credentials) -> None:
    if not credentials.token:
        return
    expires_at = credentials.expiry
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    client = get_admin_client()
    client.table("youtube_accounts").update({
        "access_token": credentials.token,
        "access_token_expires_at": expires_at.isoformat() if expires_at else None,
    }).eq("id", account_id).execute()


def _truncate_title(title: str) -> str:
    if len(title) <= YOUTUBE_TITLE_MAX:
        return title
    return title[: YOUTUBE_TITLE_MAX - 1].rstrip() + "…"


def _truncate_description(description: str) -> str:
    if len(description) <= YOUTUBE_DESCRIPTION_MAX:
        return description
    return description[: YOUTUBE_DESCRIPTION_MAX - 1] + "…"


def _trim_tags(tags: list[str]) -> list[str]:
    """YouTube limita soma de caracteres das tags (com aspas pra tags com espaco) a 500."""
    if not tags:
        return []
    selected: list[str] = []
    total = 0
    for tag in tags:
        tag = tag.strip()
        if not tag:
            continue
        cost = len(tag) + (2 if " " in tag else 0)
        if total + cost > YOUTUBE_TAGS_TOTAL_MAX:
            break
        selected.append(tag)
        total += cost
    return selected


def _build_status(privacy_status: str, scheduled_at: Optional[datetime]) -> dict:
    """
    Se scheduled_at no futuro: video sobe como 'private' + publishAt → YouTube agenda.
    Se passado ou ausente: sobe ja com privacy_status final (public/unlisted).
    """
    status: dict = {
        "selfDeclaredMadeForKids": False,
        "madeForKids": False,
    }
    now = datetime.now(timezone.utc)
    if scheduled_at and scheduled_at > now:
        status["privacyStatus"] = "private"
        status["publishAt"] = scheduled_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    else:
        status["privacyStatus"] = privacy_status
    return status


def list_videos_status(user_id: str, video_ids: list[str]) -> dict[str, Optional[str]]:
    """Verifica estado atual de cada video no YouTube.

    Custo: 1 unit por chamada (videos.list aceita ate 50 IDs por request).

    Returns:
        dict mapeando video_id → privacy_status ('public'|'private'|'unlisted')
        OU None se o video foi deletado (nao apareceu na resposta).
    """
    if not video_ids:
        return {}

    account = _load_account(user_id)
    credentials = _build_credentials(account)
    if not credentials.valid:
        credentials.refresh(GoogleRequest())
        _persist_refreshed_token(account["account_id"], credentials)

    youtube = build("youtube", "v3", credentials=credentials, cache_discovery=False)

    resultado: dict[str, Optional[str]] = {}
    # API aceita ate 50 IDs por chamada
    for i in range(0, len(video_ids), 50):
        chunk = video_ids[i : i + 50]
        try:
            resp = youtube.videos().list(
                part="status",
                id=",".join(chunk),
                maxResults=50,
            ).execute()
        except HttpError as exc:
            logger.error("[YT_LIST] erro ao listar videos: %s", exc)
            raise
        encontrados = {item["id"]: item.get("status", {}).get("privacyStatus") for item in resp.get("items", [])}
        for vid in chunk:
            # Se nao retornou, foi deletado
            resultado[vid] = encontrados.get(vid)
    return resultado


def _realtime_cache_get(user_id: str) -> Optional[dict]:
    """Retorna dict {video_id: stats} cacheado se ainda valido, senao None."""
    client = get_admin_client()
    result = (
        client.table("analytics_cache")
        .select("payload, expires_at")
        .eq("user_id", user_id)
        .eq("cache_key", REALTIME_CACHE_KEY)
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


def _realtime_cache_set(user_id: str, payload: dict) -> None:
    """Upsert do cache realtime com TTL curto (5min)."""
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CACHE_TTL_REALTIME_MINUTES)
    client = get_admin_client()
    client.table("analytics_cache").upsert(
        {
            "user_id": user_id,
            "cache_key": REALTIME_CACHE_KEY,
            "payload": payload,
            "expires_at": expires_at.isoformat(),
        },
        on_conflict="user_id,cache_key",
    ).execute()


def get_realtime_stats(
    user_id: str,
    video_ids: list[str],
    force_refresh: bool = False,
) -> tuple[dict[str, dict], bool]:
    """Busca views/likes/comments/published_at quase em tempo real via Data API.

    Diferente do YouTube Analytics API (delay 24-48h), `videos.list?part=statistics,snippet`
    retorna metricas com latencia de minutos. Custo: 1 unit por chunk de ate 50 IDs.

    Args:
        user_id: dono do canal (pra credenciais OAuth + cache + tracking)
        video_ids: lista de IDs de video do YouTube
        force_refresh: se True, ignora cache e chama API novamente (botao RELOAD da UI)

    Returns:
        Tupla (stats, was_fresh_call):
            stats: dict {video_id: {view_count, like_count, comment_count, published_at, title, privacy_status}}
                  Videos nao encontrados (deletados) nao aparecem no dict.
            was_fresh_call: True se chamou a API agora (cache miss ou force_refresh),
                           False se retornou dado do cache. Quando True, a ausencia de
                           um video_id no dict significa que ele foi deletado/removido.
                           Quando False, ausencia pode ser so cache desatualizado.
    """
    if not video_ids:
        return {}, False

    # Cache hit: retorna dict cacheado se ainda valido
    if not force_refresh:
        cached = _realtime_cache_get(user_id)
        if cached is not None:
            # Filtra apenas os video_ids pedidos (cache pode ter outros videos antigos)
            return {vid: cached[vid] for vid in video_ids if vid in cached}, False

    account = _load_account(user_id)
    credentials = _build_credentials(account)
    if not credentials.valid:
        credentials.refresh(GoogleRequest())
        _persist_refreshed_token(account["account_id"], credentials)

    youtube = build("youtube", "v3", credentials=credentials, cache_discovery=False)

    resultado: dict[str, dict] = {}
    chunks = [video_ids[i : i + 50] for i in range(0, len(video_ids), 50)]

    for chunk in chunks:
        t_start = time.time()
        try:
            # part="statistics,snippet,status" custa o mesmo 1 unit;
            # status traz privacy + permite detectar deletados (nao aparece na resposta)
            resp = youtube.videos().list(
                part="statistics,snippet,status",
                id=",".join(chunk),
                maxResults=50,
            ).execute()
        except HttpError as exc:
            logger.error("[YT_REALTIME] erro ao listar videos: %s", exc)
            raise
        duration_ms = int((time.time() - t_start) * 1000)

        for item in resp.get("items", []):
            stats = item.get("statistics", {})
            snippet = item.get("snippet", {})
            status = item.get("status", {})
            resultado[item["id"]] = {
                "view_count": int(stats.get("viewCount") or 0),
                "like_count": int(stats.get("likeCount") or 0),
                "comment_count": int(stats.get("commentCount") or 0),
                "published_at": snippet.get("publishedAt"),
                "title": snippet.get("title"),
                "privacy_status": status.get("privacyStatus"),
            }

        # Registra consumo de quota: 1 unit por chunk (regra P5 do CLAUDE.md)
        usage_tracker.track(
            user_id=user_id,
            feature="youtube_data_api",
            duration_ms=duration_ms,
            metadata={"endpoint": "videos.list", "quota_units": YOUTUBE_LIST_QUOTA_UNITS, "video_count": len(chunk)},
        )

    # Salva no cache (5min TTL)
    _realtime_cache_set(user_id, resultado)
    return resultado, True


def upload_video(
    user_id: str,
    mp4_path: str,
    title: str,
    description: str,
    tags: list[str],
    scheduled_at: Optional[datetime] = None,
    privacy_status: str = "public",
    cover_path: Optional[str] = None,
    beat_id: Optional[str] = None,
) -> dict:
    """
    Faz upload do MP4 no canal conectado do user.
    Retorna {video_id, url, scheduled, privacy_status_final}.
    Registra consumo de quota (1600 + 50 units) em api_usage via usage_tracker.
    """
    if privacy_status not in ("public", "unlisted"):
        raise ValueError(f"privacy_status invalido: {privacy_status}")
    if not os.path.exists(mp4_path):
        raise FileNotFoundError(f"MP4 nao existe: {mp4_path}")

    account = _load_account(user_id)
    credentials = _build_credentials(account)

    if not credentials.valid:
        logger.info("Access token expirado/ausente — fazendo refresh para user %s", user_id)
        credentials.refresh(GoogleRequest())
        _persist_refreshed_token(account["account_id"], credentials)

    youtube = build("youtube", "v3", credentials=credentials, cache_discovery=False)

    body = {
        "snippet": {
            "title": _truncate_title(title),
            "description": _truncate_description(description),
            "tags": _trim_tags(tags),
            "categoryId": YOUTUBE_CATEGORY_MUSIC,
        },
        "status": _build_status(privacy_status, scheduled_at),
    }
    is_scheduled = body["status"]["privacyStatus"] == "private" and "publishAt" in body["status"]

    media = MediaFileUpload(mp4_path, chunksize=-1, resumable=True, mimetype="video/mp4")
    logger.info(
        "[YT_UPLOAD] iniciando user=%s privacy=%s scheduled=%s file=%s",
        user_id, body["status"]["privacyStatus"], is_scheduled, mp4_path,
    )

    started = time.monotonic()
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            logger.info("[YT_UPLOAD] progresso %d%%", int(status.progress() * 100))

    video_id = response["id"]
    upload_duration_ms = int((time.monotonic() - started) * 1000)
    logger.info("[YT_UPLOAD] concluido video_id=%s", video_id)

    quota_units = YOUTUBE_UPLOAD_QUOTA_UNITS
    thumbnail_applied = False
    if cover_path and os.path.exists(cover_path):
        try:
            youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(cover_path, mimetype="image/jpeg"),
            ).execute()
            logger.info("[YT_UPLOAD] thumbnail custom aplicada video=%s", video_id)
            quota_units += YOUTUBE_THUMBNAIL_QUOTA_UNITS
            thumbnail_applied = True
        except HttpError as exc:
            logger.warning(
                "[YT_UPLOAD] thumbnail rejeitada (canal nao verificado?) video=%s erro=%s",
                video_id, exc,
            )

    # Registra consumo de quota (cost_usd = 0 — YouTube API e free, mas a quota e o gargalo)
    usage_tracker.track(
        user_id=user_id,
        feature="youtube_upload",
        duration_ms=upload_duration_ms,
        beat_id=beat_id,
        metadata={
            "video_id": video_id,
            "quota_units": quota_units,
            "thumbnail_applied": thumbnail_applied,
            "scheduled": is_scheduled,
        },
    )

    return {
        "video_id": video_id,
        "url": f"https://youtu.be/{video_id}",
        "scheduled": is_scheduled,
        "privacy_status_final": privacy_status if not is_scheduled else "private",
    }
