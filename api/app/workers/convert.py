import logging
import os

from fastapi import APIRouter, HTTPException

from app.services.supabase_service import get_admin_client
from app.services.qstash_service import dispatch_analyze_job

router = APIRouter(prefix="/internal/beats", tags=["workers"])
logger = logging.getLogger(__name__)

# Ordem da state machine — worker só avança se o status anterior bate
STATUS_ORDER = ["uploaded", "converting", "converted", "analyzing", "analyzed",
                "generating", "ready_for_review", "publishing", "published"]


def _status_index(status: str) -> int:
    try:
        return STATUS_ORDER.index(status)
    except ValueError:
        return -1


@router.post("/{beat_id}/convert")
def convert_beat(beat_id: str):
    """
    Worker chamado pelo QStash após o upload.
    Valida o arquivo no Storage e avança status para 'converted'.
    Não toca no áudio — o produtor entrega o MP3 já masterizado com a tag de produtor.
    """
    client = get_admin_client()

    # Busca o beat
    result = client.table("beats").select("*").eq("id", beat_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Beat não encontrado")

    beat = result.data

    # Idempotência: se já passou desta etapa, retorna sem fazer nada
    if _status_index(beat["status"]) >= _status_index("converted"):
        logger.info("Beat %s já convertido (status=%s) — pulando", beat_id, beat["status"])
        return {"ok": True, "skipped": True}

    # Verifica que o arquivo existe no Storage
    audio_path = beat.get("audio_path")
    if not audio_path:
        _mark_failed(client, beat_id, "audio_path ausente na row do beat")
        raise HTTPException(status_code=422, detail="audio_path ausente")

    try:
        bucket, path = audio_path.split("/", 1) if "/" in audio_path else ("audios", audio_path)
        # Tenta gerar signed URL como validação de existência
        signed = client.storage.from_("audios").create_signed_url(audio_path, 60)
        if not signed or not signed.get("signedURL"):
            raise ValueError("Arquivo não encontrado no Storage")
    except Exception as exc:
        _mark_failed(client, beat_id, f"arquivo ausente no Storage: {exc}")
        raise HTTPException(status_code=422, detail="Arquivo de áudio não encontrado no Storage")

    # Avança o status
    client.table("beats").update({"status": "converted"}).eq("id", beat_id).execute()
    logger.info("Beat %s: status → converted", beat_id)

    # Dispara próximo job (analyze)
    try:
        dispatch_analyze_job(beat_id)
    except Exception as exc:
        logger.error("Falha ao enviar job analyze: beat=%s erro=%s", beat_id, exc)

    return {"ok": True, "beat_id": beat_id, "status": "converted"}


def _mark_failed(client, beat_id: str, reason: str):
    logger.error("Beat %s falhou na conversão: %s", beat_id, reason)
    client.table("beats").update({"status": "failed"}).eq("id", beat_id).execute()
