import os
import logging
import threading
import requests

logger = logging.getLogger(__name__)

QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
API_BASE_URL = os.getenv("API_BASE_URL", "https://saas-type-beat-production.up.railway.app")
QSTASH_PUBLISH_URL = "https://qstash.upstash.io/v2/publish/"


def _call_direct(url: str, beat_id: str, job_name: str):
    """Chama o endpoint do worker diretamente (fallback sem QStash)."""
    try:
        resp = requests.post(url, json={"beat_id": beat_id}, timeout=180)
        logger.info("Fallback direto: beat=%s job=%s status=%d", beat_id, job_name, resp.status_code)
    except Exception as exc:
        logger.error("Fallback direto falhou: beat=%s job=%s erro=%s", beat_id, job_name, exc)


def _dispatch(endpoint: str, beat_id: str, job_name: str) -> bool:
    """Envia job pro QStash. Se QSTASH_TOKEN ausente, chama o endpoint diretamente em background."""
    target_url = f"{API_BASE_URL}{endpoint}"

    if not QSTASH_TOKEN:
        logger.warning("QSTASH_TOKEN ausente — chamando %s diretamente (beat=%s)", target_url, beat_id)
        threading.Thread(target=_call_direct, args=(target_url, beat_id, job_name), daemon=True).start()
        return True

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
