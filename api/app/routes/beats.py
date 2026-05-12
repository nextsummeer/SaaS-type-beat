import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services.supabase_service import get_admin_client, validate_token
from app.services.qstash_service import dispatch_convert_job

router = APIRouter(prefix="/beats", tags=["beats"])
logger = logging.getLogger(__name__)


class CreateBeatRequest(BaseModel):
    audio_path: str
    cover_path: Optional[str] = None
    artista_nome: Optional[str] = None


@router.post("", status_code=201)
def create_beat(
    body: CreateBeatRequest,
    authorization: str = Header(...),
):
    """Registra um beat no banco e dispara o job de conversão via QStash."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")

    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    client = get_admin_client()
    result = (
        client.table("beats")
        .insert(
            {
                "user_id": str(user.id),
                "audio_path": body.audio_path,
                "cover_path": body.cover_path,
                "artista_nome": body.artista_nome,
                "status": "uploaded",
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Erro ao salvar beat no banco")

    beat = result.data[0]

    try:
        dispatch_convert_job(beat["id"])
    except Exception as exc:
        logger.error("Falha ao enviar job QStash: beat=%s erro=%s", beat["id"], exc)

    return {"id": beat["id"], "status": "uploaded"}
