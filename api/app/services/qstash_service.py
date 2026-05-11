import os
import logging
import requests

logger = logging.getLogger(__name__)

QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
API_BASE_URL = os.getenv("API_BASE_URL", "https://saas-type-beat-production.up.railway.app")
QSTASH_PUBLISH_URL = "https://qstash.upstash.io/v2/publish/"


def dispatch_convert_job(beat_id: str) -> bool:
    """Envia job pro QStash para converter o áudio do beat.

    Retorna True se enviado, False se QSTASH_TOKEN não estiver configurado.
    Lança exceção se o envio falhar.
    """
    if not QSTASH_TOKEN:
        logger.warning(
            "QSTASH_TOKEN não configurado — job de conversão não enviado (beat=%s)", beat_id
        )
        return False

    target_url = f"{API_BASE_URL}/internal/beats/{beat_id}/convert"

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
