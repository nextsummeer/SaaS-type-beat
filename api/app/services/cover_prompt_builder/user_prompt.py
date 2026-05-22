"""Template do user prompt + funcao de preenchimento.

ADR 2026-05-21-prompt-dna-capa-v2.md (secao 8)

Estrutura do user prompt entregue ao Claude:

    --- BRIEF ---
    8 linhas com os campos do brief v2 traduzidos pros labels EN

    --- VARIATION SEEDS ---
    7 linhas com os eixos sorteados traduzidos pros labels EN

    --- TASK ---
    Instrucao final pra gerar o prompt seguindo system prompt.
"""
from app.services.cover_prompt_builder.types import CoverBrief, VariationAxes
from app.services.cover_prompt_builder.vocabulary import (
    ATMOSFERA_LUZ_LABELS,
    CAMERA_ANGLE_LABELS,
    CENARIO_LABELS,
    FILM_QUIRK_LABELS,
    GENERO_LABELS,
    MOOD_LABELS,
    MOTION_STATE_LABELS,
    QUEM_LABELS,
    SECONDARY_PROP_LABELS,
    SUBJECT_FRAMING_LABELS,
    TIME_OF_DAY_LABELS,
)


def build_user_prompt(brief: CoverBrief, axes: VariationAxes) -> str:
    """Monta o user prompt completo pra mandar ao Claude.

    Brief.nota_livre deve VIR JA SANITIZADA pelo builder antes de chegar
    aqui (sanitize_free_note pode ter devolvido None, nesse caso o
    builder ja substituiu por None pra omitir do prompt).
    """
    genero_pri_label = GENERO_LABELS[brief.genero_primario]
    genero_sec_label = (
        GENERO_LABELS[brief.genero_secundario]
        if brief.genero_secundario
        else "none"
    )

    # Labels dos eixos resolvidos (usam slug pos-resolucao de aleatorio)
    quem_label = QUEM_LABELS.get(axes.resolved_quem, axes.resolved_quem)
    cenario_label = CENARIO_LABELS.get(axes.resolved_cenario, axes.resolved_cenario)
    luz_label = ATMOSFERA_LUZ_LABELS.get(axes.resolved_luz, axes.resolved_luz)

    mood_label = MOOD_LABELS[brief.mood]

    artista_sec = brief.artista_secundario or "none"
    nota = brief.nota_livre or "none"

    # 7 eixos -> labels EN
    framing_label = SUBJECT_FRAMING_LABELS[axes.subject_framing]
    angle_label = CAMERA_ANGLE_LABELS[axes.camera_angle]
    time_label = TIME_OF_DAY_LABELS[axes.time_of_day]
    sub_loc = axes.sub_location or "(no specific sub-location)"
    motion_label = MOTION_STATE_LABELS[axes.motion_state]

    # Prop e quirk com "none" sao OMITIDOS do prompt (label vazio em vocabulary)
    prop_label = SECONDARY_PROP_LABELS[axes.secondary_prop]
    prop_line = (
        f"Secondary prop: {prop_label}\n"
        if axes.secondary_prop != "none"
        else ""
    )

    quirk_label = FILM_QUIRK_LABELS[axes.film_quirk]
    quirk_line = (
        f"Film quirk: {quirk_label}\n"
        if axes.film_quirk != "none"
        else ""
    )

    return (
        "--- BRIEF ---\n"
        f"Primary genre: {genero_pri_label}\n"
        f"Secondary genre: {genero_sec_label}\n"
        f"Primary artist reference (aesthetic only, DO NOT mention name): {brief.artista_primario}\n"
        f"Secondary artist reference (aesthetic only, DO NOT mention name): {artista_sec}\n"
        f"Subject type: {quem_label}\n"
        f"Mood: {mood_label}\n"
        f"Scene type: {cenario_label}\n"
        f"Light atmosphere: {luz_label}\n"
        f"Producer's free note: {nota}\n"
        "\n"
        "--- VARIATION SEEDS ---\n"
        f"Subject framing: {framing_label}\n"
        f"Camera angle: {angle_label}\n"
        f"Time of day: {time_label}\n"
        f"Sub-location: {sub_loc}\n"
        f"{prop_line}"
        f"Motion state: {motion_label}\n"
        f"{quirk_line}"
        "\n"
        "--- TASK ---\n"
        "Generate the final 7-block photography prompt for this brief. "
        "Follow all rules from the system prompt. End with an \"AVOID:\" "
        "negation block of 8-12 items most relevant to this specific brief."
    )
