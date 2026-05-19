import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services.qstash_service import dispatch_publish_job
from app.services.supabase_service import get_admin_client, validate_token

router = APIRouter(prefix="/posts", tags=["posts"])
logger = logging.getLogger(__name__)


class ReschedulePostRequest(BaseModel):
    scheduled_at: str


class PatchPostRequest(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    tags: Optional[list[str]] = None
    purchase_link: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = None
    privacy_status: Optional[str] = None


@router.get("/{beat_id}")
def get_post_by_beat(
    beat_id: str,
    authorization: str = Header(...),
):
    """Retorna o post (variacao='A') do beat. Valida ownership via JWT."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")

    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    client = get_admin_client()
    result = (
        client.table("posts")
        .select("*")
        .eq("beat_id", beat_id)
        .eq("user_id", str(user.id))
        .eq("variacao", "A")
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Post não encontrado")

    return result.data


@router.patch("/{post_id}")
def patch_post(
    post_id: str,
    body: PatchPostRequest,
    authorization: str = Header(...),
):
    """Atualiza campos editáveis do post. Valida ownership via JWT.

    Quando o user envia status='scheduled' (confirmar agendamento na review page),
    dispara o worker publish.py pra gerar MP4 e subir no YouTube.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")

    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    if body.privacy_status is not None and body.privacy_status not in ("public", "unlisted"):
        raise HTTPException(status_code=400, detail="privacy_status invalido")

    client = get_admin_client()

    check = (
        client.table("posts")
        .select("id, beat_id")
        .eq("id", post_id)
        .eq("user_id", str(user.id))
        .maybe_single()
        .execute()
    )
    if not check.data:
        raise HTTPException(status_code=404, detail="Post não encontrado")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    client.table("posts").update(updates).eq("id", post_id).execute()
    logger.info("Post %s atualizado: %s", post_id, list(updates.keys()))

    if updates.get("status") == "scheduled":
        beat_id = check.data["beat_id"]
        try:
            dispatch_publish_job(beat_id)
            logger.info("Job publish disparado para beat=%s", beat_id)
        except Exception as exc:
            logger.error("Falha ao disparar publish: beat=%s erro=%s", beat_id, exc)

    return {"ok": True, "updated": list(updates.keys())}


@router.patch("/{post_id}/reschedule")
def reschedule_post(
    post_id: str,
    body: ReschedulePostRequest,
    authorization: str = Header(...),
):
    """Reagenda um post (drag-and-drop no calendario).

    Aceita reagendamento enquanto o video ainda esta como private+agendado no YouTube.
    Bloqueia se ja virou public (status='published') ou se ainda esta em processamento
    (status='publishing'). Se o video ja existe no YouTube, chama videos.update pra
    atualizar publishAt; senao, so atualiza scheduled_at no banco e o worker pega na hora.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")

    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    try:
        new_dt = datetime.fromisoformat(body.scheduled_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="scheduled_at em formato invalido (use ISO 8601)")
    if new_dt.tzinfo is None:
        new_dt = new_dt.replace(tzinfo=timezone.utc)
    if new_dt <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Nova data precisa ser no futuro")

    client = get_admin_client()
    row = (
        client.table("posts")
        .select("id, user_id, status, scheduled_at, youtube_video_id, published_at")
        .eq("id", post_id)
        .eq("user_id", str(user.id))
        .maybe_single()
        .execute()
    )
    if not row or not row.data:
        raise HTTPException(status_code=404, detail="Post não encontrado")
    post = row.data

    if post.get("status") == "publishing":
        raise HTTPException(
            status_code=409,
            detail="Beat esta sendo publicado agora — aguarde alguns segundos",
        )

    # Bloqueio amplo: qualquer beat ja enviado pro YouTube (mesmo agendado pra
    # futuro) nao pode ser reagendado por aqui. Isso evita 403 'insufficient
    # scopes' (videos.update precisa de scope 'youtube' full, nao temos) e
    # cobre o gotcha do post.status='scheduled' preso apos publicacao.
    if post.get("youtube_video_id"):
        raise HTTPException(
            status_code=409,
            detail="Vídeo já está no YouTube — pra mudar o agendamento, edite pelo YouTube Studio.",
        )

    client.table("posts").update({"scheduled_at": new_dt.isoformat()}).eq("id", post_id).execute()
    logger.info("Post %s reagendado para %s (DB-only)", post_id, new_dt.isoformat())

    return {
        "ok": True,
        "post_id": post_id,
        "scheduled_at": new_dt.isoformat(),
        "synced_with_youtube": False,
    }
