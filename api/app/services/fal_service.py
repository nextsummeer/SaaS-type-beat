"""Service de integracao com fal.ai gpt-image-2 (quality=low).

ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md
Configuracao final (corrigida em 2026-05-22):
- Modelo: openai/gpt-image-2
- Quality: low (~30s)
- Resolucao: 512x512 (image_size=square). Era 1024x1024 (square_hd)
  ate 2026-05-22 -- subia custo ~35% sem ganho visual real pra capa
  YouTube (que usa thumbnail pequeno).
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

# Custo confirmado em testes 2026-05-21 (1024x1024). Em 512x512 o custo
# real do fal.ai e' menor (~$0.003-0.005); este valor e' usado apenas
# pra tracking interno do usage_tracker e nao afeta cobranca real.
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
                "image_size": "square",  # 512x512 (era "square_hd"=1024x1024)
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
        # Detecta content policy violation do OpenAI gpt-image-2 e loga
        # mensagem curta em vez de jogar o exc enorme (que inclui o prompt
        # inteiro -- polui log + esconde a causa real).
        exc_str = str(exc)
        if "content_policy_violation" in exc_str or "content checker" in exc_str:
            logger.error(
                "fal_service: content_policy_violation do OpenAI -- prompt "
                "rejeitado pelo moderador da gpt-image-2. Comum quando brief "
                "tem mood sexy + luz vermelha + termos como sheer/lingerie. "
                "Tente outro brief ou aguarde proxima variacao."
            )
        elif "Exhausted balance" in exc_str or "User is locked" in exc_str:
            logger.error(
                "fal_service: SALDO ZERADO em fal.ai. Adicione credito em "
                "fal.ai/dashboard/billing antes de gerar mais capas."
            )
        else:
            logger.error("fal_service: erro ao gerar capa: %s", exc)
        return None
