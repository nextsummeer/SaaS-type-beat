"""Builder v3 -- orquestrador da geracao de prompt da capa IA.

ADR 2026-05-22-prompt-dna-capa-v3.md

Pipeline v3:
    1. sanitize_free_note(brief.nota_livre)
    2. get_universe(artista_primario, artista_secundario)
    3. (opcional) fetch_recent_seeds(user_id, artista_primario) se force_variation
    4. sample_for_brief(brief, universe, force_variation, recent_seeds, seed)
    5. build_user_prompt(brief, universe, seeds)
    6. Claude Sonnet 4.6 COM prompt caching no system (SYSTEM_PROMPT v3)
    7. extrai texto, strip cercas markdown se vier
    8. validate_prompt(prompt, brief) -- 6 checagens
    9. usage_tracker (tokens IN/OUT/CACHE-READ/CACHE-WRITE)
    10. retorna BuildResult com variation_seeds (a salvar em cover_library)

NUNCA logar SYSTEM_PROMPT em texto puro (receita secreta).
"""
import logging
import os
import time
from dataclasses import replace

from app.services import usage_tracker
from app.services.cover_prompt_builder.artist_universe import get_universe
from app.services.cover_prompt_builder.sanitizer import sanitize_free_note
from app.services.cover_prompt_builder.system_prompt import SYSTEM_PROMPT
from app.services.cover_prompt_builder.types import BuildResult, CoverBrief
from app.services.cover_prompt_builder.user_prompt import build_user_prompt
from app.services.cover_prompt_builder.validators import validate_prompt
from app.services.cover_prompt_builder.variation_engine import (
    fetch_recent_seeds,
    sample_for_brief,
)

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = "claude-sonnet-4-6"
MAX_TOKENS = 2000
TEMPERATURE = 0.9  # diversidade alta entre cliques


def build_cover_prompt(
    brief: CoverBrief,
    seed: int | None = None,
    user_id: str | None = None,
    force_variation: bool = False,
    safety_mode: bool = False,
) -> BuildResult:
    """Monta o prompt final v3 pra geracao de capa.

    Args:
        brief: brief v3 do produtor (sem campo cenario).
        seed: seed deterministica do sorteio (default None = random).
        user_id: dono da chamada, pra usage_tracker E pra anti-repeticao.
        force_variation: True quando produtor clicou "Gerar variacao" --
            ativa query DB nas ultimas 5 capas pra excluir sub_locations
            recentemente usadas.
        safety_mode: True quando este e um RETRY apos content_policy_violation
            do OpenAI gpt-image-2. Injeta instrucao EXTRA no user_prompt
            pedindo prompt ULTRA-conservador (strip sensualidade do
            wardrobe, expressa mood APENAS via luz/atmosfera/setting).

    Returns:
        BuildResult. Em sucesso: prompt_final populado, validation_passed=True,
        variation_seeds populado (worker persiste em cover_library).
        Em falha: prompt_final=None, validation_error com motivo.
    """
    if not ANTHROPIC_API_KEY:
        logger.error("builder v3: ANTHROPIC_API_KEY ausente")
        return BuildResult(
            prompt_final=None,
            validation_error="ANTHROPIC_API_KEY ausente",
        )

    # 1. Sanitiza nota livre
    sanitized_note = sanitize_free_note(brief.nota_livre)
    if brief.nota_livre and not sanitized_note:
        logger.info(
            "builder v3: nota livre rejeitada pelo sanitizer (segue sem nota). "
            "raw_len=%d",
            len(brief.nota_livre),
        )
    effective_brief = replace(brief, nota_livre=sanitized_note)

    # 2. Pega universe do artista
    universe = get_universe(
        effective_brief.artista_primario,
        effective_brief.artista_secundario,
    )

    # 3. Anti-repeticao (so quando force_variation + user_id presentes)
    recent_seeds: list[dict] = []
    if force_variation and user_id:
        recent_seeds = fetch_recent_seeds(
            user_id=user_id,
            artista_primario=effective_brief.artista_primario,
        )
        logger.info(
            "builder v3: force_variation ativo, %d recent seeds carregadas",
            len(recent_seeds),
        )

    # 4. Sorteia variation seeds
    seeds_dict = sample_for_brief(
        brief=effective_brief,
        universe=universe,
        force_variation=force_variation,
        recent_seeds=recent_seeds,
        seed=seed,
    )

    # 5. Monta user prompt
    user_prompt_text = build_user_prompt(effective_brief, universe, seeds_dict)

    # Safety mode: injeta aviso EXTRA pro Sonnet ser ultra-conservador.
    # Usado quando worker faz retry apos content_policy_violation.
    if safety_mode:
        user_prompt_text = (
            "=== RETRY MODE -- SAFETY MAXIMUM ===\n"
            "The PREVIOUS prompt for this brief was REJECTED by OpenAI "
            "gpt-image-2 moderation. You MUST be EXTRA conservative this "
            "time. STRIP all sensuality from clothing description. Use ONLY "
            "the safest possible language. Express the mood ONLY through "
            "LIGHT, ATMOSPHERE, and SETTING. The subject paragraph should "
            "be 2 sentences MAX with NO body/face details beyond ethnicity, "
            "hair color, and obscuring method. SKIP describing clothing in "
            "detail -- use only 'minimal clothing in neutral tones'. SKIP "
            "the masterphrase if it contains 'private', 'shouldn't', "
            "'intimate'. Use 'caught on tape, never meant to be a still' "
            "instead.\n"
            "===\n\n"
            + user_prompt_text
        )
        logger.info("builder v3: safety_mode ATIVADO (retry pos-moderacao)")

    # 6. Chama Claude com prompt caching
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
        logger.error("builder v3: erro na chamada Claude: %s", exc)
        return BuildResult(
            prompt_final=None,
            validation_error=f"claude_error: {exc}",
            variation_seeds=seeds_dict,
        )

    duration_ms = int((time.monotonic() - started) * 1000)

    # 7. Extrai texto
    try:
        prompt_final = response.content[0].text.strip()
    except (AttributeError, IndexError) as exc:
        logger.error("builder v3: response sem texto: %s", exc)
        return BuildResult(
            prompt_final=None,
            validation_error="claude_response_empty",
            variation_seeds=seeds_dict,
            claude_latency_ms=duration_ms,
        )

    # 8. Remove cercas markdown se Claude colocou
    if prompt_final.startswith("```"):
        parts = prompt_final.split("```")
        if len(parts) >= 2:
            prompt_final = parts[1]
            if prompt_final.startswith("text"):
                prompt_final = prompt_final[4:]
            prompt_final = prompt_final.strip()

    # 9. Captura usage (tokens normais + cache)
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
        cache_read_tokens=cache_read,
        cache_write_tokens=cache_write,
        duration_ms=duration_ms,
        metadata={
            "purpose": "cover_prompt_builder_v3",
            "model": MODEL,
            "cache_read_tokens": cache_read,
            "cache_write_tokens": cache_write,
            "force_variation": force_variation,
        },
    )

    # 10. Valida
    result = validate_prompt(prompt_final, effective_brief)
    if not result.ok:
        logger.error(
            "builder v3: validacao falhou: %s | prompt_preview=%r",
            result.error,
            prompt_final[:120],
        )
        # IMPORTANTE: retorna o prompt EM prompt_final mesmo quando validacao
        # falha -- worker decide via validation_passed se vai usar ou marcar
        # como failed. Isso preserva o texto rejeitado pra debug no DB.
        return BuildResult(
            prompt_final=prompt_final,
            variation_seeds=seeds_dict,
            validation_passed=False,
            validation_error=result.error,
            tokens_input=tokens_in,
            tokens_output=tokens_out,
            cache_read_tokens=cache_read,
            cache_write_tokens=cache_write,
            claude_latency_ms=duration_ms,
        )

    for warn in result.warnings:
        logger.warning("builder v3: %s", warn)

    logger.info(
        "builder v3: prompt gerado (%d chars) em %dms tokens=%s/%s cache=%s/%s",
        len(prompt_final),
        duration_ms,
        tokens_in,
        tokens_out,
        cache_read,
        cache_write,
    )

    return BuildResult(
        prompt_final=prompt_final,
        variation_seeds=seeds_dict,
        validation_passed=True,
        tokens_input=tokens_in,
        tokens_output=tokens_out,
        cache_read_tokens=cache_read,
        cache_write_tokens=cache_write,
        claude_latency_ms=duration_ms,
    )
