"""Tracker centralizado de custo por chamada paga (regra P3 do CLAUDE.md).

Toda chamada a Gemini, Claude, YouTube upload, fal.ai etc. deve passar por
`track()` apos a request, com tokens reais retornados pela API. O tracker
calcula `cost_usd` a partir de `PRICING` e insere uma row em `api_usage`.

Falha silenciosa: se o INSERT no Supabase quebrar, loga warning mas NAO
propaga — nunca derrubar o pipeline por causa do tracking.
"""
import logging
from typing import Any

from app.services.supabase_service import get_admin_client

logger = logging.getLogger(__name__)

# Precos em USD por 1M de tokens (atualizar quando provider mudar tabela).
# Para servicos com custo fixo por chamada (fal.ai), usar `flat_usd`.
PRICING: dict[str, dict[str, float]] = {
    "claude_sonnet_4_6": {"input": 3.0, "output": 15.0},
    "gemini_2_5_flash": {"input": 0.30, "output": 2.50},
    "youtube_upload": {"flat_usd": 0.0},     # quota free, sem custo monetario
    "fal_gpt_image_2": {"flat_usd": 0.05},   # capa IA (quando ativar)
}


def _calculate_cost(
    feature: str,
    tokens_in: int | None,
    tokens_out: int | None,
) -> float:
    """Calcula cost_usd com base no PRICING. Retorna 0.0 se feature desconhecida."""
    pricing = PRICING.get(feature)
    if not pricing:
        logger.warning("usage_tracker: feature '%s' sem precificacao", feature)
        return 0.0

    if "flat_usd" in pricing:
        return float(pricing["flat_usd"])

    input_price = pricing.get("input", 0.0)
    output_price = pricing.get("output", 0.0)
    cost = (
        (tokens_in or 0) * input_price / 1_000_000
        + (tokens_out or 0) * output_price / 1_000_000
    )
    return round(cost, 6)


def track(
    user_id: str | None,
    feature: str,
    tokens_in: int | None = None,
    tokens_out: int | None = None,
    duration_ms: int | None = None,
    beat_id: str | None = None,
    cost_usd: float | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Registra uma chamada paga em `api_usage`.

    Args:
        user_id: dono da chamada (RLS). Se None, pula o tracking (chamada sem dono).
        feature: chave em PRICING (ex.: 'claude_sonnet_4_6').
        tokens_in / tokens_out: tokens reais retornados pela API.
        duration_ms: tempo da chamada em ms (opcional).
        beat_id: beat associado (opcional, ajuda a agregar custo por upload).
        cost_usd: override manual (usar quando a API ja devolve o preco pronto).
        metadata: dict extra que vai pra coluna jsonb.
    """
    if not user_id:
        logger.warning("usage_tracker: chamada sem user_id (feature=%s) — pulando", feature)
        return

    final_cost = cost_usd if cost_usd is not None else _calculate_cost(feature, tokens_in, tokens_out)

    row = {
        "user_id": user_id,
        "beat_id": beat_id,
        "feature": feature,
        "cost_usd": final_cost,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "duration_ms": duration_ms,
        "metadata": metadata,
    }
    # Remove chaves None (Supabase aceita, mas deixa a row mais limpa).
    row = {k: v for k, v in row.items() if v is not None}

    try:
        client = get_admin_client()
        client.table("api_usage").insert(row).execute()
        logger.info(
            "usage_tracker: feature=%s user=%s cost=$%.6f tokens=%s/%s",
            feature, user_id, final_cost, tokens_in, tokens_out,
        )
    except Exception as exc:
        # Nunca derrubar o pipeline por causa do tracking.
        logger.warning("usage_tracker: falha ao registrar api_usage (%s): %s", feature, exc)
