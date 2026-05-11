import logging
import tempfile
import os
import requests as http_requests

from fastapi import APIRouter, HTTPException

from app.services.supabase_service import get_admin_client
from app.services.qstash_service import dispatch_generate_job
from app.services.audio_service import detect_bpm_and_key

router = APIRouter(prefix="/internal/beats", tags=["workers"])
logger = logging.getLogger(__name__)

STATUS_ORDER = ["uploaded", "converting", "converted", "analyzing", "analyzed",
                "generating", "ready_for_review", "publishing", "published"]


def _status_index(status: str) -> int:
    try:
        return STATUS_ORDER.index(status)
    except ValueError:
        return -1


@router.post("/{beat_id}/analyze")
def analyze_beat(beat_id: str):
    """
    Worker chamado pelo QStash após a conversão.
    Baixa o MP3 do Storage, detecta BPM e tom com librosa,
    salva no banco e avança status para 'analyzed'.
    """
    client = get_admin_client()

    result = client.table("beats").select("*").eq("id", beat_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Beat não encontrado")

    beat = result.data

    # Idempotência
    if _status_index(beat["status"]) >= _status_index("analyzed"):
        logger.info("Beat %s já analisado (status=%s) — pulando", beat_id, beat["status"])
        return {"ok": True, "skipped": True}

    audio_path = beat.get("audio_path")
    if not audio_path:
        _mark_failed(client, beat_id, "audio_path ausente")
        raise HTTPException(status_code=422, detail="audio_path ausente")

    # Baixa o MP3 para um arquivo temporário
    try:
        signed = client.storage.from_("audios").create_signed_url(audio_path, 300)
        if not signed or not signed.get("signedURL"):
            raise ValueError("Arquivo não encontrado no Storage")
        signed_url = signed["signedURL"]
    except Exception as exc:
        _mark_failed(client, beat_id, f"Storage inacessível: {exc}")
        raise HTTPException(status_code=422, detail="Arquivo de áudio não encontrado no Storage")

    try:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = tmp.name
            resp = http_requests.get(signed_url, timeout=60)
            resp.raise_for_status()
            tmp.write(resp.content)

        analysis = detect_bpm_and_key(tmp_path)
    except Exception as exc:
        _mark_failed(client, beat_id, f"Falha na análise: {exc}")
        raise HTTPException(status_code=500, detail=f"Erro na análise de áudio: {exc}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # Salva resultado e avança status
    client.table("beats").update({
        "bpm": analysis["bpm"],
        "music_key": analysis["music_key"],
        "status": "analyzed",
    }).eq("id", beat_id).execute()

    logger.info("Beat %s: bpm=%d key=%s → analyzed", beat_id, analysis["bpm"], analysis["music_key"])

    try:
        dispatch_generate_job(beat_id)
    except Exception as exc:
        logger.error("Falha ao enviar job generate: beat=%s erro=%s", beat_id, exc)

    return {"ok": True, "beat_id": beat_id, **analysis, "status": "analyzed"}


def _mark_failed(client, beat_id: str, reason: str):
    logger.error("Beat %s falhou na análise: %s", beat_id, reason)
    client.table("beats").update({"status": "failed"}).eq("id", beat_id).execute()
