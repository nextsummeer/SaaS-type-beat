import logging
import os
import tempfile

import requests as http_requests
from fastapi import APIRouter, HTTPException

from app.services.supabase_service import get_admin_client
from app.services.qstash_service import dispatch_analyze_job
from app.services.ffmpeg_service import transcode_to_mp3

router = APIRouter(prefix="/internal/beats", tags=["workers"])
logger = logging.getLogger(__name__)

AUDIOS_BUCKET = "audios"

# Ordem da state machine — worker só avança se o status anterior bate
STATUS_ORDER = ["uploaded", "converting", "converted", "analyzing", "analyzed",
                "generating", "ready_for_review", "publishing", "published"]


def _status_index(status: str) -> int:
    try:
        return STATUS_ORDER.index(status)
    except ValueError:
        return -1


def _precisa_converter(audio_path: str) -> bool:
    """True se o arquivo NAO e MP3 (ex: WAV) e precisa transcodificar (T2.15)."""
    return not audio_path.lower().endswith(".mp3")


@router.post("/{beat_id}/convert")
def convert_beat(beat_id: str):
    """
    Worker chamado pelo QStash após o upload.

    - MP3: o produtor entrega ja masterizado com a tag de produtor; nao
      tocamos no audio, so validamos e avancamos status (comportamento original).
    - WAV (T2.15): convertemos pra MP3 320kbps no servidor (sem loudnorm,
      preserva a master), trocamos o audio_path pro MP3 e seguimos o pipeline.
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
        # Signed URL serve de validacao de existencia E de fonte do download
        # quando precisamos converter. 300s cobre o tempo de baixar um WAV grande.
        signed = client.storage.from_(AUDIOS_BUCKET).create_signed_url(audio_path, 300)
        if not signed or not signed.get("signedURL"):
            raise ValueError("Arquivo não encontrado no Storage")
    except Exception as exc:
        _mark_failed(client, beat_id, f"arquivo ausente no Storage: {exc}")
        raise HTTPException(status_code=422, detail="Arquivo de áudio não encontrado no Storage")

    if _precisa_converter(audio_path):
        # WAV (ou outro nao-MP3) → transcodifica pra MP3 320k no servidor
        try:
            novo_path = _converter_para_mp3(beat_id, audio_path, signed["signedURL"], client)
        except Exception as exc:
            _mark_failed(client, beat_id, f"falha na conversao pra MP3: {exc}")
            raise HTTPException(status_code=500, detail="Falha ao converter o áudio pra MP3")

        # Troca o audio_path pro MP3 + avanca status numa unica update.
        # So depois disso removemos o WAV original (idempotencia: se um retry
        # acontecer antes deste update, o WAV ainda esta la pra re-converter).
        client.table("beats").update({
            "audio_path": novo_path,
            "status": "converted",
        }).eq("id", beat_id).execute()
        logger.info("Beat %s: WAV convertido → %s, status → converted", beat_id, novo_path)

        if novo_path != audio_path:
            try:
                client.storage.from_(AUDIOS_BUCKET).remove([audio_path])
            except Exception as exc:
                logger.warning("Beat %s: falha ao remover WAV original %s: %s", beat_id, audio_path, exc)
    else:
        # MP3 ja masterizado — nao tocamos no audio
        client.table("beats").update({"status": "converted"}).eq("id", beat_id).execute()
        logger.info("Beat %s: status → converted", beat_id)

    # Dispara próximo job (analyze)
    try:
        dispatch_analyze_job(beat_id)
    except Exception as exc:
        logger.error("Falha ao enviar job analyze: beat=%s erro=%s", beat_id, exc)

    return {"ok": True, "beat_id": beat_id, "status": "converted"}


def _converter_para_mp3(beat_id: str, audio_path: str, signed_url: str, client) -> str:
    """
    Baixa o arquivo do Storage, converte pra MP3 320k via ffmpeg e sobe o MP3.
    NAO remove o original (o caller faz isso depois do UPDATE, por idempotencia).
    Retorna o novo audio_path (do MP3 gerado).
    """
    base_dir = audio_path.rsplit("/", 1)[0] if "/" in audio_path else ""
    novo_path = f"{base_dir}/original.mp3" if base_dir else "original.mp3"

    src_tmp = None
    out_tmp = None
    try:
        # Baixa o arquivo original (WAV) pra um temporario
        ext = os.path.splitext(audio_path)[1] or ".wav"
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            src_tmp = tmp.name
            resp = http_requests.get(signed_url, timeout=120)
            resp.raise_for_status()
            tmp.write(resp.content)

        # Transcodifica pra MP3 320k (sem loudnorm)
        out_handle = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        out_tmp = out_handle.name
        out_handle.close()
        transcode_to_mp3(src_tmp, out_tmp)

        # Sobe o MP3 (upsert=true pra sobrescrever em caso de retry do QStash)
        with open(out_tmp, "rb") as f:
            mp3_bytes = f.read()
        client.storage.from_(AUDIOS_BUCKET).upload(
            path=novo_path,
            file=mp3_bytes,
            file_options={"content-type": "audio/mpeg", "upsert": "true"},
        )
    finally:
        for p in (src_tmp, out_tmp):
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except OSError:
                    pass

    logger.info("Beat %s: MP3 320k subido em %s", beat_id, novo_path)
    return novo_path


def _mark_failed(client, beat_id: str, reason: str):
    logger.error("Beat %s falhou na conversão: %s", beat_id, reason)
    client.table("beats").update({"status": "failed", "error_message": reason}).eq("id", beat_id).execute()
