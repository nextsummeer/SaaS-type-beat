"""Service de integracao com fal.ai gpt-image-2 (quality=low).

ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md

Configuracao validada em testes 2026-05-21:
- Modelo: openai/gpt-image-2
- Quality: low (~30s, $0.0083/imagem)
- Resolucao: 1024x1024 (square_hd)
- Output: JPEG (menor que PNG, capa nao precisa de alpha)

Falha graceful: retorna None se erro. Worker cover.py decide retry ou failed.
"""
import logging
import os
import time

from app.services.usage_tracker import track

logger = logging.getLogger(__name__)

FAL_KEY = os.getenv("FAL_KEY")
FAL_MODEL_ID = "openai/gpt-image-2"

# Custo confirmado em testes (2026-05-21).
FAL_COST_USD = 0.0083


def generate_cover(
    prompt: str,
    user_id: str | None = None,
    beat_id: str | None = None,
) -> dict | None:
    """Gera 1 capa via fal.ai gpt-image-2 quality=low.

    NAO faz download da imagem — retorna so a URL temporaria do fal.ai.
    Worker cover.py (T4.9) e quem baixa e salva no Supabase Storage.

    Args:
        prompt: prompt final completo (montado pelo cover_prompt_builder).
        user_id: dono da geracao, pra usage_tracker.
        beat_id: opcional, ajuda agrupar custo por upload.

    Returns:
        {url: str, cost_usd: float, latency_ms: int} se sucesso.
        None se erro (key ausente, SDK nao instalado, timeout, content policy, etc).
    """
    if not FAL_KEY:
        logger.warning("FAL_KEY nao configurado — pulando geracao de capa")
        return None

    try:
        import fal_client  # type: ignore[import-untyped]
    except ImportError:
        logger.error("fal-client nao instalado. Adicionar fal-client>=0.5.0 ao requirements")
        return None

    start = time.time()

    try:
        result = fal_client.subscribe(
            FAL_MODEL_ID,
            arguments={
                "prompt": prompt,
                "image_size": "square_hd",
                "quality": "low",
                "num_images": 1,
                "output_format": "jpeg",
            },
            with_logs=False,
        )

        latency_ms = int((time.time() - start) * 1000)

        # Estrutura esperada: {"images": [{"url": "...", ...}], ...}
        images = result.get("images", []) if isinstance(result, dict) else []
        if not images:
            logger.error("fal_service: resposta sem imagens. result=%s", result)
            return None

        first = images[0] if isinstance(images[0], dict) else {}
        url = first.get("url")
        if not url:
            logger.error("fal_service: imagem sem url. images[0]=%s", first)
            return None

        logger.info("fal_service: capa gerada em %dms", latency_ms)

        track(
            user_id=user_id,
            feature="fal_gpt_image_2",
            duration_ms=latency_ms,
            beat_id=beat_id,
            cost_usd=FAL_COST_USD,
        )

        return {
            "url": url,
            "cost_usd": FAL_COST_USD,
            "latency_ms": latency_ms,
        }

    except Exception as exc:
        logger.error("fal_service: erro ao gerar capa: %s", exc)
        return None
