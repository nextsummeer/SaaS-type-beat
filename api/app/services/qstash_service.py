import os
import logging
import requests

logger = logging.getLogger(__name__)

QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
API_BASE_URL = os.getenv("API_BASE_URL", "https://saas-type-beat-production.up.railway.app")
QSTASH_PUBLISH_URL = "https://qstash.upstash.io/v2/publish/"


def _dispatch(endpoint: str, beat_id: str, job_name: str) -> bool:
    """Envia job genérico pro QStash. Retorna True se enviado."""
    if not QSTASH_TOKEN:
        logger.warning(
            "QSTASH_TOKEN não configurado — job %s não enviado (beat=%s)", job_name, beat_id
        )
        return False

    target_url = f"{API_BASE_URL}{endpoint}"
    resp = requests.post(
        f"{QSTASH_PUBLISH_URL}{target_url}",
        headers={
            "Authorization": f"Bearer {QSTASH_TOKEN}",
            "Content-Type": "application/json",
        },
        json={"beat_id": beat_id},
        timeout=10,
    )
    resp.raise_for_status()
    logger.info("Job QStash enviado: beat=%s → %s", beat_id, target_url)
    return True


def dispatch_convert_job(beat_id: str) -> bool:
    """Envia job pro QStash para validar e avançar o beat para 'converted'."""
    return _dispatch(f"/internal/beats/{beat_id}/convert", beat_id, "convert")


def dispatch_analyze_job(beat_id: str) -> bool:
    """Envia job pro QStash para analisar o beat com librosa."""
    return _dispatch(f"/internal/beats/{beat_id}/analyze", beat_id, "analyze")


def dispatch_generate_job(beat_id: str) -> bool:
    """Envia job pro QStash para gerar as 3 variações A/B/C com Claude."""
    return _dispatch(f"/internal/beats/{beat_id}/generate", beat_id, "generate")
