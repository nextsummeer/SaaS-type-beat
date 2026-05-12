"""Worker que baixa MP3+capa, gera MP4 via ffmpeg e sobe no YouTube."""
import logging
import os
import tempfile
from datetime import datetime
from pathlib import Path

import requests as http_requests
from fastapi import APIRouter, HTTPException

from app.services.ffmpeg_service import audio_to_mp4
from app.services.supabase_service import get_admin_client
from app.services.youtube_service import upload_video

router = APIRouter(prefix="/internal/beats", tags=["workers"])
logger = logging.getLogger(__name__)

STATUS_ORDER = ["uploaded", "converting", "converted", "analyzing", "analyzed",
                "generating", "ready_for_review", "publishing", "published"]


def _status_index(status: str) -> int:
    try:
        return STATUS_ORDER.index(status)
    except ValueError:
        return -1


def _mark_failed(client, beat_id: str, post_id: str | None, reason: str):
    logger.error("Beat %s falhou na publicacao: %s", beat_id, reason)
    client.table("beats").update({"status": "failed", "error_message": reason}).eq("id", beat_id).execute()
    if post_id:
        client.table("posts").update({"status": "failed", "error_message": reason}).eq("id", post_id).execute()


def _download_from_storage(client, bucket: str, path: str, suffix: str) -> str:
    """Baixa arquivo do Supabase Storage via signed URL pra arquivo temporario. Retorna o path."""
    signed = client.storage.from_(bucket).create_signed_url(path, 600)
    if not signed or not signed.get("signedURL"):
        raise FileNotFoundError(f"{bucket}/{path} nao encontrado")

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = tmp.name
        resp = http_requests.get(signed["signedURL"], timeout=120)
        resp.raise_for_status()
        tmp.write(resp.content)
    return tmp_path


def _parse_scheduled_at(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    # Postgres timestamptz vem como string ISO; pode terminar em '+00:00' ou 'Z'
    text = str(value).replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        logger.warning("scheduled_at em formato inesperado: %s", value)
        return None


@router.post("/{beat_id}/publish")
def publish_beat(beat_id: str):
    """
    Worker chamado quando o user confirma agendamento na review page.
    Baixa MP3+capa, gera MP4, sobe no YouTube (com publishAt se scheduled_at no futuro).
    """
    client = get_admin_client()

    beat_result = client.table("beats").select("*").eq("id", beat_id).single().execute()
    if not beat_result.data:
        raise HTTPException(status_code=404, detail="Beat nao encontrado")
    beat = beat_result.data

    post_rows = (
        client.table("posts")
        .select("*")
        .eq("beat_id", beat_id)
        .eq("variacao", "A")
        .limit(1)
        .execute()
        .data
    )
    if not post_rows:
        raise HTTPException(status_code=404, detail="Post (variacao A) nao encontrado")
    post = post_rows[0]
    post_id = post["id"]

    if post.get("youtube_video_id"):
        logger.info("Beat %s ja publicado (video=%s) — pulando", beat_id, post["youtube_video_id"])
        return {"ok": True, "skipped": True, "video_id": post["youtube_video_id"]}

    if _status_index(beat["status"]) < _status_index("ready_for_review"):
        raise HTTPException(
            status_code=409,
            detail=f"Beat ainda nao pronto pra publicar (status={beat['status']})",
        )

    audio_path = beat.get("audio_path")
    cover_path = beat.get("cover_path")
    if not audio_path:
        _mark_failed(client, beat_id, post_id, "audio_path ausente")
        raise HTTPException(status_code=422, detail="audio_path ausente")
    if not cover_path:
        _mark_failed(client, beat_id, post_id, "cover_path ausente (capa obrigatoria no MVP)")
        raise HTTPException(status_code=422, detail="cover_path ausente")

    client.table("beats").update({"status": "publishing"}).eq("id", beat_id).execute()

    tmp_audio = tmp_cover = tmp_mp4 = None
    try:
        tmp_audio = _download_from_storage(client, "audios", audio_path, ".mp3")
        cover_suffix = Path(cover_path).suffix or ".jpg"
        tmp_cover = _download_from_storage(client, "covers", cover_path, cover_suffix)

        tmp_mp4 = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
        audio_to_mp4(tmp_audio, tmp_cover, tmp_mp4)

        scheduled_at = _parse_scheduled_at(post.get("scheduled_at"))
        privacy_status = post.get("privacy_status") or "public"

        result = upload_video(
            user_id=beat["user_id"],
            mp4_path=tmp_mp4,
            title=post["titulo"],
            description=post["descricao"],
            tags=post.get("tags") or [],
            scheduled_at=scheduled_at,
            privacy_status=privacy_status,
            cover_path=tmp_cover,
        )

        post_status = "scheduled" if result["scheduled"] else "published"
        published_at_value = None if result["scheduled"] else datetime.utcnow().isoformat() + "Z"

        client.table("posts").update({
            "youtube_video_id": result["video_id"],
            "youtube_url": result["url"],
            "status": post_status,
            "published_at": published_at_value,
            "error_message": None,
        }).eq("id", post_id).execute()

        client.table("beats").update({
            "status": "published",
            "error_message": None,
        }).eq("id", beat_id).execute()

        logger.info(
            "Beat %s publicado: video=%s scheduled=%s",
            beat_id, result["video_id"], result["scheduled"],
        )
        return {
            "ok": True,
            "beat_id": beat_id,
            "video_id": result["video_id"],
            "url": result["url"],
            "scheduled": result["scheduled"],
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Erro inesperado em publish_beat (beat=%s)", beat_id)
        _mark_failed(client, beat_id, post_id, f"Erro inesperado: {exc}")
        raise HTTPException(status_code=500, detail=f"Erro inesperado: {exc}")
    finally:
        for tmp in (tmp_audio, tmp_cover, tmp_mp4):
            if tmp and os.path.exists(tmp):
                try:
                    os.unlink(tmp)
                except OSError:
                    pass
