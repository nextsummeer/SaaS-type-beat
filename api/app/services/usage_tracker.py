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
    "youtube_data_api": {"flat_usd": 0.0},   # videos.list 1 unit/chunk, sem custo monetario
    # fal_service.py calcula o custo REAL pelos tokens da resposta e passa via
    # cost_usd (override). Este flat_usd so e usado se algum caller chamar sem
    # cost_usd -- mantido como fallback grosseiro. T4.43.
    "fal_gpt_image_2": {"flat_usd": 0.0111},
}

# Multiplicadores do prompt caching da Anthropic (ephemeral, TTL 5min):
# gravar tokens no cache custa 1.25x o preco de input; ler do cache custa 0.1x.
# Aplicados sobre o `input` do modelo. So afetam features com tokens de cache
# (hoje so o Claude da capa via cover_prompt_builder). T4.45.
CACHE_WRITE_MULT = 1.25
CACHE_READ_MULT = 0.10


def _calculate_cost(
    feature: str,
    tokens_in: int | None,
    tokens_out: int | None,
    cache_read: int | None = None,
    cache_write: int | None = None,
) -> float:
    """Calcula cost_usd com base no PRICING. Retorna 0.0 se feature desconhecida.

    Quando ha prompt caching (Claude), `tokens_in` ja vem SEM os tokens de cache
    -- a Anthropic devolve `cache_read_input_tokens`/`cache_creation_input_tokens`
    em campos separados. Por isso somamos os tres baldes de input sem dupla
    contagem: input normal + cache write (1.25x) + cache read (0.1x). T4.45.
    """
    pricing = PRICING.get(feature)
    if not pricing:
        logger.warning("usage_tracker: feature '%s' sem precificacao", feature)
        return 0.0

    if "flat_usd" in pricing:
        return float(pricing["flat_usd"])

    input_price = pricing.get("input", 0.0)
    output_price = pricing.get("output", 0.0)
    cost = (
        (tokens_in or 0) * input_price
        + (cache_write or 0) * input_price * CACHE_WRITE_MULT
        + (cache_read or 0) * input_price * CACHE_READ_MULT
        + (tokens_out or 0) * output_price
    ) / 1_000_000
    return round(cost, 6)


def track(
    user_id: str | None,
    feature: str,
    tokens_in: int | None = None,
    tokens_out: int | None = None,
    duration_ms: int | None = None,
    beat_id: str | None = None,
    cost_usd: float | None = None,
    cache_read_tokens: int | None = None,
    cache_write_tokens: int | None = None,
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
        cache_read_tokens / cache_write_tokens: tokens de prompt caching (Claude).
            Entram no cost_usd com os multiplicadores corretos (read 0.1x, write
            1.25x). Sem isso o custo de quem usa cache fica subestimado. T4.45.
        metadata: dict extra que vai pra coluna jsonb.
    """
    if not user_id:
        logger.warning("usage_tracker: chamada sem user_id (feature=%s) — pulando", feature)
        return

    final_cost = (
        cost_usd
        if cost_usd is not None
        else _calculate_cost(
            feature, tokens_in, tokens_out, cache_read_tokens, cache_write_tokens
        )
    )

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
