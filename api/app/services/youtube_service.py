"""Upload de video pro YouTube usando OAuth do user (refresh token cifrado em youtube_accounts)."""
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

from app.services.supabase_service import get_admin_client

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


def upload_video(
    user_id: str,
    mp4_path: str,
    title: str,
    description: str,
    tags: list[str],
    scheduled_at: Optional[datetime] = None,
    privacy_status: str = "public",
    cover_path: Optional[str] = None,
) -> dict:
    """
    Faz upload do MP4 no canal conectado do user.
    Retorna {video_id, url, scheduled, privacy_status_final}.
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

    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            logger.info("[YT_UPLOAD] progresso %d%%", int(status.progress() * 100))

    video_id = response["id"]
    logger.info("[YT_UPLOAD] concluido video_id=%s", video_id)

    if cover_path and os.path.exists(cover_path):
        try:
            youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(cover_path, mimetype="image/jpeg"),
            ).execute()
            logger.info("[YT_UPLOAD] thumbnail custom aplicada video=%s", video_id)
        except HttpError as exc:
            logger.warning(
                "[YT_UPLOAD] thumbnail rejeitada (canal nao verificado?) video=%s erro=%s",
                video_id, exc,
            )

    return {
        "video_id": video_id,
        "url": f"https://youtu.be/{video_id}",
        "scheduled": is_scheduled,
        "privacy_status_final": privacy_status if not is_scheduled else "private",
    }
