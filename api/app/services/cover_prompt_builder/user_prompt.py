"""Template do user prompt v3 + funcao de preenchimento.

ADR 2026-05-22-prompt-dna-capa-v3.md (secao 4)

Entrega ao Sonnet 4.6 um pacote estruturado:
- BRIEF (campos do produtor)
- UNIVERSE PACK (do artist_universe + helpers de mood/genre)
- CAMERA DNA (variante padrao ou underground)
- LIGHTING SETUP (texto rico do lighting_setups)
- SHOT ON CLOSER (fixo)
- GUARD-RAIL + MOOD CLOSER (combinado)
- TASK (instrucao final)

Sonnet 4.6 monta os 12 elementos seguindo o SYSTEM_PROMPT.
"""
from app.services.cover_prompt_builder.genre_dna import GENRE_DNA
from app.services.cover_prompt_builder.lighting_setups import get_lighting
from app.services.cover_prompt_builder.mood_modulation import (
    MOOD_DNA,
    get_punch_phrase,
)
from app.services.cover_prompt_builder.prompt_skeleton import (
    SHOT_ON_CLOSER,
    pick_camera_dna,
    pick_guard_rail,
)
from app.services.cover_prompt_builder.types import CoverBrief


def _format_bullet_list(items: list[str], empty_label: str = "(none)") -> str:
    """Formata lista de strings como bullets indentados. Vazia -> empty_label."""
    if not items:
        return empty_label
    return "\n".join(f"  - {item}" for item in items)


def build_user_prompt(
    brief: CoverBrief,
    universe: dict,
    seeds: dict,
) -> str:
    """Monta o user prompt v3 completo pra mandar ao Claude.

    Args:
        brief: CoverBrief v3 (sem campo cenario).
        universe: dict de `artist_universe.get_universe()`.
        seeds: dict de `variation_engine.sample_for_brief()`.

    Returns:
        String pronta pra entrar como `content` da messages do Claude.
    """
    # ---------- BRIEF ----------
    genre_primary_label = GENRE_DNA.get(brief.genero_primario, {}).get(
        "era_anchor", brief.genero_primario
    )
    genre_secondary_label = (
        GENRE_DNA.get(brief.genero_secundario, {}).get("era_anchor", brief.genero_secundario)
        if brief.genero_secundario
        else "none"
    )

    # ---------- UNIVERSE PACK ----------
    thematic = universe.get("thematic_sentence") or GENRE_DNA.get(
        brief.genero_primario, {}
    ).get("thematic_template", "")
    masterphrase = universe.get("masterphrase", "")
    hair_directives = universe.get("hair_directives") or "(infer hair from artist's natural ethnicity and genre aesthetic)"
    sub_location_chosen = seeds.get("sub_location_chosen") or "(none -- artist out of dictionary, infer setting from genre + mood)"
    wardrobe_pool = universe.get("wardrobe_pool") or GENRE_DNA.get(
        brief.genero_primario, {}
    ).get("vocabulary_pool", [])
    wardrobe_anchor = universe.get("wardrobe_anchor_phrase", "")
    references = universe.get("references") or GENRE_DNA.get(
        brief.genero_primario, {}
    ).get("fallback_references", [])
    city_anchor = universe.get("city_anchor") or "(none -- placeless)"
    punch_phrase = get_punch_phrase(brief.mood, universe)
    closer_3 = universe.get("closer_3_words", "Imperfect. Real. Heavy.")

    # ---------- MOOD info ----------
    mood_data = MOOD_DNA.get(brief.mood, {})
    mood_energy = mood_data.get("energy_phrase", "")
    mood_body_language = mood_data.get("body_language", "")
    mood_palette_hue = mood_data.get("palette_hue", "mixed")

    # ---------- CAMERA + LIGHTING + GUARD-RAIL ----------
    camera_dna = pick_camera_dna(brief)
    guard_rail = pick_guard_rail(brief)
    lighting = get_lighting(brief.atmosfera_luz)
    lighting_full = lighting["full_description"]
    lighting_palette = lighting["color_implications"]

    # ---------- Genre vocabulary (extras) ----------
    genre_vocab = GENRE_DNA.get(brief.genero_primario, {}).get("vocabulary_pool", [])
    genre_palette = GENRE_DNA.get(brief.genero_primario, {}).get("palette_anchors", [])

    # ---------- Secundary artist info ----------
    artist_secondary = brief.artista_secundario or "none"
    nota = brief.nota_livre or "none"

    return f"""=== BRIEF ===
Primary genre: {brief.genero_primario} -- {genre_primary_label}
Secondary genre: {brief.genero_secundario or "none"} -- {genre_secondary_label}
Primary artist reference (aesthetic only, DO NOT mention name): {brief.artista_primario}
Secondary artist reference (aesthetic only, DO NOT mention name): {artist_secondary}
Subject type: {brief.quem_aparece}
Mood: {brief.mood} -- {mood_energy}
Lighting atmosphere: {brief.atmosfera_luz}
Producer's free note: {nota}

=== UNIVERSE PACK (use literally as input to elements 2, 3, 5, 6, 7, 12) ===
Thematic sentence:
  {thematic}

Masterphrase:
  {masterphrase}

Hair directives (USE LITERALLY in element 4 SUBJECT -- this overrides any default tendencies. If it says "bleached blonde DEFAULT 70%", actually generate blonde hair in this output):
  {hair_directives}

Sub-location seed (EXPAND this into element 7 with 4-6 rich descriptive sentences + 2-3 culturally iconic objects + 1 sensory detail + 1 atmospheric sentence -- DO NOT use OR-lists, focus on ONE specific scene):
  {sub_location_chosen}

Wardrobe pool (draw items for element 6, no shared uniform):
{_format_bullet_list(wardrobe_pool)}

Wardrobe anchor phrase (end element 6 with this exact sentence):
  {wardrobe_anchor}

References (use 3-5 of these in element 12):
{_format_bullet_list(references)}

City anchor: {city_anchor}
Punch phrase for this mood (use as element 5, on its own line): {punch_phrase}
3-word closer (final line of element 12, on its own line): {closer_3}

=== MOOD MODULATION ===
Palette hue orientation: {mood_palette_hue}
Body language: {mood_body_language}
Energy phrase (use 1-2 sentences from this vibe in element 12): {mood_energy}

=== GENRE VOCABULARY (extra wardrobe / palette suggestions if universe pool is thin) ===
Genre vocabulary pool:
{_format_bullet_list(genre_vocab)}
Genre palette anchors:
{_format_bullet_list(genre_palette)}

=== CAMERA DNA (paste LITERALLY at the very start of your output, element 1) ===
{camera_dna}

=== LIGHTING SETUP (use as base for element 8, expand with 1-2 lines tying it to the specific setting) ===
{lighting_full}
Lighting palette implications: {lighting_palette}

=== SHOT ON CLOSER (paste LITERALLY at the start of element 12) ===
{SHOT_ON_CLOSER}

=== GUARD-RAIL + MOOD CLOSER (paste LITERALLY as element 9, between LIGHTING and COLOR PALETTE) ===
{guard_rail}

=== TASK ===
Assemble the 12-element prompt for this brief following the SYSTEM PROMPT rules. Paste CAMERA DNA, SHOT ON CLOSER, and GUARD-RAIL literally. Expand the sub-location seed into a rich element 7. Use the artist's punch phrase and 3-word closer. Output ONLY the final prompt -- no markdown headers, no numbered list, no AVOID block, no preamble."""
