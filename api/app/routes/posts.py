import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services.supabase_service import get_admin_client, validate_token

router = APIRouter(prefix="/posts", tags=["posts"])
logger = logging.getLogger(__name__)


class PatchPostRequest(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    tags: Optional[list[str]] = None
    purchase_link: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: Optional[str] = None


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
    """Atualiza campos editáveis do post. Valida ownership via JWT."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")

    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    client = get_admin_client()

    # Verifica ownership
    check = (
        client.table("posts")
        .select("id")
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
    return {"ok": True, "updated": list(updates.keys())}
