"""Builder v2 -- orquestrador da geracao de prompt da capa IA.

ADR 2026-05-21-prompt-dna-capa-v2.md (secao 9)

Pipeline:
    1. sanitize_free_note(brief.nota_livre)
    2. sample_variation_axes(brief, seed)
    3. build_user_prompt(brief, axes)
    4. chama Claude Sonnet 4.6 COM prompt caching (cache_control ephemeral
       no system block -- reduz ~90% dos tokens de input apos o 1o hit)
    5. extrai texto da response, remove cercas markdown se vier
    6. validate_prompt(prompt, brief) -- 6 validacoes
    7. registra usage_tracker (tokens IN/OUT/CACHE-READ/CACHE-WRITE)
    8. retorna BuildResult

Esta funcao ainda NAO esta plugada no __init__.py do pacote (T4.23 vai
fazer o switch quando o worker for atualizado pro brief v2). Por
enquanto, acessivel via:

    from app.services.cover_prompt_builder.builder import build_cover_prompt

NUNCA logar SYSTEM_PROMPT em texto puro (receita secreta).
"""
import logging
import os
import time
from dataclasses import replace

from app.services import usage_tracker
from app.services.cover_prompt_builder.sanitizer import sanitize_free_note
from app.services.cover_prompt_builder.system_prompt import SYSTEM_PROMPT
from app.services.cover_prompt_builder.types import BuildResult, CoverBrief
from app.services.cover_prompt_builder.user_prompt import build_user_prompt
from app.services.cover_prompt_builder.validators import validate_prompt
from app.services.cover_prompt_builder.variation import sample_variation_axes

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2000
TEMPERATURE = 0.9  # diversidade alta -- variacao real entre cliques


def build_cover_prompt(
    brief: CoverBrief,
    seed: int | None = None,
    user_id: str | None = None,
) -> BuildResult:
    """Monta o prompt final pra geracao de capa via Claude + DNA v2.

    Args:
        brief: brief v2 do produtor (CoverBrief, dataclass).
        seed: seed deterministica do sorteio dos eixos (default None = random).
        user_id: dono da chamada, pra usage_tracker.

    Returns:
        BuildResult sempre. Em sucesso, `prompt_final` populado e
        `validation_passed=True`. Em falha, `prompt_final=None`,
        `validation_error` com motivo.
    """
    if not ANTHROPIC_API_KEY:
        logger.error("builder v2: ANTHROPIC_API_KEY ausente")
        return BuildResult(
            prompt_final=None,
            validation_error="ANTHROPIC_API_KEY ausente",
        )

    # 1. Sanitiza nota livre (se rejeitar, segue sem nota -- nota e opcional)
    sanitized_note = sanitize_free_note(brief.nota_livre)
    if brief.nota_livre and not sanitized_note:
        logger.info(
            "builder v2: nota livre rejeitada pelo sanitizer (segue sem nota). "
            "raw_len=%d",
            len(brief.nota_livre),
        )
    effective_brief = replace(brief, nota_livre=sanitized_note)

    # 2. Sorteia os 7 eixos
    axes = sample_variation_axes(effective_brief, seed=seed)

    # 3. Monta user prompt
    user_prompt_text = build_user_prompt(effective_brief, axes)

    # 4. Chama Claude com prompt caching
    from anthropic import Anthropic

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    started = time.monotonic()
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_prompt_text}],
            timeout=60,
        )
    except Exception as exc:
        logger.error("builder v2: erro na chamada Claude: %s", exc)
        return BuildResult(
            prompt_final=None,
            validation_error=f"claude_error: {exc}",
            variation_seeds=axes.as_dict(),
        )

    duration_ms = int((time.monotonic() - started) * 1000)

    # 5. Extrai texto
    try:
        prompt_final = response.content[0].text.strip()
    except (AttributeError, IndexError) as exc:
        logger.error("builder v2: response sem texto: %s", exc)
        return BuildResult(
            prompt_final=None,
            validation_error="claude_response_empty",
            variation_seeds=axes.as_dict(),
            claude_latency_ms=duration_ms,
        )

    # 6. Remove cercas markdown se Claude colocou (apesar do system prompt pedir pra nao)
    if prompt_final.startswith("```"):
        parts = prompt_final.split("```")
        if len(parts) >= 2:
            prompt_final = parts[1]
            if prompt_final.startswith("text"):
                prompt_final = prompt_final[4:]
            prompt_final = prompt_final.strip()

    # 7. Captura usage (tokens normais + tokens de cache)
    usage = getattr(response, "usage", None)
    tokens_in = getattr(usage, "input_tokens", None) if usage else None
    tokens_out = getattr(usage, "output_tokens", None) if usage else None
    cache_read = getattr(usage, "cache_read_input_tokens", None) if usage else None
    cache_write = getattr(usage, "cache_creation_input_tokens", None) if usage else None

    usage_tracker.track(
        user_id=user_id,
        feature="claude_sonnet_4_6",
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        duration_ms=duration_ms,
        metadata={
            "purpose": "cover_prompt_builder_v2",
            "model": MODEL,
            "cache_read_tokens": cache_read,
            "cache_write_tokens": cache_write,
        },
    )

    # 8. Valida
    result = validate_prompt(prompt_final, effective_brief)
    if not result.ok:
        logger.error(
            "builder v2: validacao falhou: %s | prompt_preview=%r",
            result.error,
            prompt_final[:120],
        )
        return BuildResult(
            prompt_final=None,
            variation_seeds=axes.as_dict(),
            validation_passed=False,
            validation_error=result.error,
            tokens_input=tokens_in,
            tokens_output=tokens_out,
            cache_read_tokens=cache_read,
            cache_write_tokens=cache_write,
            claude_latency_ms=duration_ms,
        )

    for warn in result.warnings:
        logger.warning("builder v2: %s", warn)

    logger.info(
        "builder v2: prompt gerado (%d chars) em %dms tokens=%s/%s cache=%s/%s",
        len(prompt_final),
        duration_ms,
        tokens_in,
        tokens_out,
        cache_read,
        cache_write,
    )

    return BuildResult(
        prompt_final=prompt_final,
        variation_seeds=axes.as_dict(),
        validation_passed=True,
        tokens_input=tokens_in,
        tokens_output=tokens_out,
        cache_read_tokens=cache_read,
        cache_write_tokens=cache_write,
        claude_latency_ms=duration_ms,
    )
