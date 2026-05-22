"""Service que monta o prompt final pro fal.ai usando Claude.

ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md

Fluxo:
    brief (5 campos) + artista_nome
        ↓
    PROMPT_BASE_TEMPLATE + system prompt
        ↓
    Claude Sonnet 4.6 monta prompt final (300-600 palavras)
        ↓
    Validacao: rejeita se contem nome do artista (likeness) ou se < 200 chars
        ↓
    Retorna string final pro fal_service.generate_cover()

NOTA — PROMPT_BASE_TEMPLATE ainda e PLACEHOLDER (prompt do Lil Baby validado
em 2026-05-21). T4.6 (curadoria do prompt base mestre real) vai substituir
essa constante pelo prompt mestre final do Gustavo. NUNCA logar essa
constante em texto puro — e receita secreta.
"""
import logging
import os
import time

from app.services import usage_tracker

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = "claude-sonnet-4-6"

# Placeholder do prompt base mestre — validado em 2026-05-21 como capaz de gerar
# capa underground type beat de qualidade. Sera substituido pela curadoria final
# da T4.6.
# CRITICO: nao logar. nao expor em endpoint publico.
PROMPT_BASE_TEMPLATE = """Analog film photograph taken with a disposable camera or early 2000s point-and-shoot, scanned slightly imperfectly. Heavy 35mm film grain, chromatic aberration on the edges, faint VHS-like color bleed, washed contrast like a frame pulled from a low-budget music video. Mid-2010s Atlanta trap documentary energy meets candid street moment.

The image features a young man in his early twenties, face partially obscured — head turned down under a fitted cap or designer hood, hand covering part of his face flashing jewelry, motion blur from movement, or backlit by harsh sun. Dark skin catching gold reflections. He wears layered chains stacked thick on his neck — Cuban links, tennis chains, a heavy pendant — diamond grills catching light when his mouth opens, designer hoodie or vintage jersey, distressed denim or cargo pants, fresh sneakers. A stack of cash fanned in one hand, or a styrofoam cup, or just hands in pockets. The styling reads street wealth, real and lived-in, not costume. Magnetic, untouchable, hood famous.

Setting: a working-class American neighborhood during the day or golden hour — cracked concrete in front of a corner store, the parking lot of a strip mall with faded signage, the steps of a brick apartment complex with bars on the windows, a gas station with a beat-up car in frame, a porch with peeling paint, or a dead-end street with telephone wires crossing the sky. Trap house energy. Atlanta or Memphis or any Southern American hood. Real concrete, real chain-link fences, real life.

Lighting is harsh and natural: high sun blowing out the sky to white, hard shadows under cap brims and chain links, gold jewelry exploding with reflections, lens flare hitting the camera lens.

Color palette: bleached daylight whites, warm beige concrete, deep blue sky washed pale, gold and diamond reflections, faded brick red, dusty green from neighborhood trees, deep shadow blacks, warm skin tones glowing in the sun.

The energy is: real, lived-in, untouchable, code-of-the-streets cinematic.

Shot on: Canon Sure Shot, Olympus Stylus Epic, or early Sony Cyber-shot. Looks like a frame grab from a low-budget music video. Imperfect. Real. Hard."""


# Mapeamento slug → label descritivo (Claude entende melhor frase do que slug)
SUJEITO_LABELS = {
    "jovem": "a young man in his early-to-mid twenties",
    "mulher": "a woman in her early-to-mid twenties",
    "grupo": "a group of friends or crew (3-5 people)",
    "sem_pessoa": "no human subject in frame (object/scenery only)",
    "so_objeto": "a single object as the main subject (no people)",
}

AMBIENTE_LABELS = {
    "rua_hood": "a working-class American neighborhood, street level, hood/projects setting",
    "interior_luxo": "an upscale private interior at night (penthouse, hotel suite, club booth, luxury car)",
    "noturno": "a nocturnal urban setting (empty downtown, rooftop, parking garage)",
    "natureza": "an outdoor natural setting (open landscape, beach, desert, mountain)",
    "neon": "a neon-lit nightlife environment (city street with signs, club exterior, arcade)",
    "minimalista": "a minimalist studio or empty architectural space (clean, geometric)",
}

ILUMINACAO_LABELS = {
    "sol_duro": "harsh high-noon sunlight, blown-out highlights, hard shadows",
    "golden_hour": "warm golden hour light, long shadows, amber tones wrapping everything",
    "vermelho": "deep crimson and ruby red dominating the frame, intentional saturated lighting",
    "azul_neon": "cool blue and violet neon, electric pop colors, nightlife glow",
    "noturno": "dark nocturnal lighting with cool blues, sparse warm pops from streetlights",
    "vintage": "vintage analog film look, faded contrast, VHS color bleed, slight chromatic aberration",
}

ENERGIA_LABELS = {
    "agressivo": "aggressive, hostile, confrontational energy",
    "melancolico": "melancholic, lonely, after-hours sadness",
    "sexy": "sensual, intimate, expensive, magnetic",
    "hood_famous": "hood famous, lived-in, code-of-the-streets cinematic, untouchable",
    "atmosferico": "atmospheric, dreamlike, otherworldly, suspended",
    "festa": "celebratory, high-energy, party, crowd, motion",
}


def _label(mapping: dict[str, str], slug: str | None, fallback: str) -> str:
    """Resolve slug → label descritivo. Retorna fallback se slug invalido."""
    if not slug:
        return fallback
    return mapping.get(slug, fallback)


def _has_artist_name(prompt: str, artista_nome: str) -> bool:
    """True se o prompt final menciona o nome do artista (case-insensitive).

    Considera nome completo e cada palavra separada (>= 3 chars pra evitar
    falso positivo em palavras curtas tipo 'AL' que podem aparecer naturalmente).
    """
    p_lower = prompt.lower()
    nome_lower = artista_nome.strip().lower()

    if nome_lower in p_lower:
        return True

    # Checa cada palavra do nome (ex: "Lil Baby" → ["lil", "baby"])
    for palavra in nome_lower.split():
        if len(palavra) >= 4 and palavra in p_lower:
            return True

    return False


def build_cover_prompt(
    brief: dict,
    artista_nome: str,
    user_id: str | None = None,
) -> str | None:
    """Monta prompt final pro fal.ai a partir do brief estruturado.

    Args:
        brief: dict com chaves opcionais sujeito, ambiente, iluminacao,
               energia, nota_livre.
        artista_nome: nome do artista de referencia (usado como contexto pro
                      Claude, mas NUNCA aparece no prompt final).
        user_id: dono da chamada, pra usage_tracker.

    Returns:
        Prompt final (string ~300-600 palavras) se sucesso.
        None se erro (key ausente, falha no Claude, validacao falhou).
    """
    if not ANTHROPIC_API_KEY:
        logger.error("ANTHROPIC_API_KEY nao configurada — pulando cover_prompt_builder")
        return None

    if not artista_nome or not artista_nome.strip():
        logger.error("cover_prompt_builder: artista_nome obrigatorio")
        return None

    sujeito = _label(SUJEITO_LABELS, brief.get("sujeito"), "a person with face obscured")
    ambiente = _label(AMBIENTE_LABELS, brief.get("ambiente"), "an urban setting")
    iluminacao = _label(ILUMINACAO_LABELS, brief.get("iluminacao"), "natural cinematic lighting")
    energia = _label(ENERGIA_LABELS, brief.get("energia"), "cinematic, candid energy")
    nota_livre = (brief.get("nota_livre") or "").strip()
    nota_str = nota_livre if nota_livre else "none"

    system_prompt = (
        "You are an expert at writing cinematic photography prompts for AI image generation. "
        "You will receive a TEMPLATE (master photography prompt) and INPUTS from a music producer "
        "describing what they want for a type beat cover.\n\n"
        "Your job: take the structure of the template (analog film + subject + setting + "
        "lighting + color palette + energy + shot on) and rewrite it with the specific details "
        "from the inputs, keeping the same dense, descriptive style.\n\n"
        "CRITICAL RULES:\n"
        "1. NEVER mention the real artist name in your output. The artist is reference for "
        "the visual AESTHETIC ONLY. Use generic descriptors like 'a young man with that "
        "specific energy' instead.\n"
        "2. Keep the template's structure: analog film aesthetic, partially obscured subject, "
        "detailed setting, specific lighting, color palette, energy, camera reference.\n"
        "3. Output ONLY the final prompt — no explanation, no markdown, no preamble, no headings.\n"
        "4. Length: 300-600 words. Dense and specific. No filler."
    )

    user_prompt = (
        f"TEMPLATE:\n{PROMPT_BASE_TEMPLATE}\n\n"
        f"INPUTS:\n"
        f"- Artist reference (aesthetic only, do NOT mention name): {artista_nome}\n"
        f"- Subject: {sujeito}\n"
        f"- Setting / Environment: {ambiente}\n"
        f"- Lighting / Color palette: {iluminacao}\n"
        f"- Energy / Mood: {energia}\n"
        f"- Producer's free note: {nota_str}\n\n"
        "Generate the final photography prompt now."
    )

    from anthropic import Anthropic

    client = Anthropic(api_key=ANTHROPIC_API_KEY)

    started = time.monotonic()
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            timeout=60,
        )
    except Exception as exc:
        logger.error("cover_prompt_builder: erro na chamada Claude: %s", exc)
        return None

    duration_ms = int((time.monotonic() - started) * 1000)

    usage = getattr(response, "usage", None)
    tokens_in = getattr(usage, "input_tokens", None) if usage else None
    tokens_out = getattr(usage, "output_tokens", None) if usage else None
    usage_tracker.track(
        user_id=user_id,
        feature="claude_sonnet_4_6",
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        duration_ms=duration_ms,
        metadata={"purpose": "cover_prompt_builder", "model": MODEL},
    )

    try:
        prompt_final = response.content[0].text.strip()
    except (AttributeError, IndexError) as exc:
        logger.error("cover_prompt_builder: resposta Claude sem texto: %s", exc)
        return None

    # Remove cercas markdown se Claude colocou (apesar do system prompt pedir pra nao)
    if prompt_final.startswith("```"):
        parts = prompt_final.split("```")
        if len(parts) >= 2:
            prompt_final = parts[1]
            if prompt_final.startswith("text"):
                prompt_final = prompt_final[4:]
            prompt_final = prompt_final.strip()

    # Validacao 1: comprimento minimo
    if len(prompt_final) < 200:
        logger.error(
            "cover_prompt_builder: prompt muito curto (%d chars), rejeitando. prompt=%r",
            len(prompt_final), prompt_final[:100],
        )
        return None

    # Validacao 2: nao pode citar nome do artista
    if _has_artist_name(prompt_final, artista_nome):
        logger.error(
            "cover_prompt_builder: prompt final cita o artista '%s' — likeness violado, rejeitando",
            artista_nome,
        )
        return None

    logger.info(
        "cover_prompt_builder: prompt gerado (%d chars) em %dms tokens=%s/%s",
        len(prompt_final), duration_ms, tokens_in, tokens_out,
    )

    return prompt_final
