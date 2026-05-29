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

# Precos do gpt-image-2 na fal.ai, em USD por TOKEN (doc fal, 2026-05).
# O custo real de cada geracao = soma dos tokens da resposta * preco. Antes
# usavamos um valor fixo ($0.0083) que subestimava o real (~$0.011) -- agora
# calculamos pelo bloco `usage` que a fal devolve. T4.43.
FAL_PRICE_PER_TOKEN = {
    "text_input": 5.0 / 1_000_000,
    "text_output": 10.0 / 1_000_000,
    "image_input": 8.0 / 1_000_000,
    "image_output": 30.0 / 1_000_000,
}

# Fallback caso a resposta venha sem `usage` (nao deveria, mas defensivo).
# Aproxima o que o dashboard da fal mostra pra 1 capa quality=low.
FAL_COST_USD_FALLBACK = 0.0111


def _cost_from_usage(usage: dict | None) -> float | None:
    """Custo real em USD a partir do bloco `usage` da resposta da fal.

    Estrutura esperada (doc fal gpt-image-2):
        {
          "input_tokens": int,
          "input_tokens_details":  {"text_tokens": int, "image_tokens": int},
          "output_tokens": int,
          "output_tokens_details": {"text_tokens": int, "image_tokens": int},
          "total_tokens": int,
        }

    Retorna None se `usage` ausente/malformado (caller usa o fallback).
    """
    if not isinstance(usage, dict):
        return None
    inp = usage.get("input_tokens_details") or {}
    out = usage.get("output_tokens_details") or {}
    try:
        cost = (
            (inp.get("text_tokens") or 0) * FAL_PRICE_PER_TOKEN["text_input"]
            + (inp.get("image_tokens") or 0) * FAL_PRICE_PER_TOKEN["image_input"]
            + (out.get("text_tokens") or 0) * FAL_PRICE_PER_TOKEN["text_output"]
            + (out.get("image_tokens") or 0) * FAL_PRICE_PER_TOKEN["image_output"]
        )
    except (TypeError, ValueError):
        return None
    return round(cost, 6)


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

        # Custo REAL pelos tokens da resposta (T4.43). Fallback se vier sem usage.
        usage = result.get("usage") if isinstance(result, dict) else None
        real_cost = _cost_from_usage(usage)
        if real_cost is None:
            logger.warning(
                "fal_service: resposta sem `usage` utilizavel -- usando fallback "
                "de custo ($%.4f). result keys=%s",
                FAL_COST_USD_FALLBACK,
                list(result.keys()) if isinstance(result, dict) else type(result),
            )
        cost_usd = real_cost if real_cost is not None else FAL_COST_USD_FALLBACK

        logger.info("fal_service: capa gerada em %dms, custo=$%.6f", latency_ms, cost_usd)

        track(
            user_id=user_id,
            feature="fal_gpt_image_2",
            tokens_in=usage.get("input_tokens") if isinstance(usage, dict) else None,
            tokens_out=usage.get("output_tokens") if isinstance(usage, dict) else None,
            duration_ms=latency_ms,
            beat_id=beat_id,
            cost_usd=cost_usd,
            metadata={"usage": usage} if usage else None,
        )

        return {
            "ok": True,
            "url": url,
            "cost_usd": cost_usd,
            "latency_ms": latency_ms,
        }

    except Exception as exc:
        # Classifica o erro pra worker decidir se vale retry automatico.
        # Retorna dict estruturado em vez de None (None = nao processavel).
        exc_str = str(exc)
        if "content_policy_violation" in exc_str or "content checker" in exc_str:
            logger.warning(
                "fal_service: content_policy_violation do OpenAI -- "
                "worker pode tentar retry com safety_mode."
            )
            return {
                "ok": False,
                "error": "content_policy_violation",
                "message": "prompt rejeitado pelo moderador da gpt-image-2",
            }
        elif "Exhausted balance" in exc_str or "User is locked" in exc_str:
            logger.error(
                "fal_service: SALDO ZERADO em fal.ai. Adicione credito em "
                "fal.ai/dashboard/billing antes de gerar mais capas."
            )
            return {
                "ok": False,
                "error": "exhausted_balance",
                "message": "saldo fal.ai zerado",
            }
        else:
            logger.error("fal_service: erro ao gerar capa: %s", exc)
            return None
