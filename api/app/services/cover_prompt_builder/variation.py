"""Sistema de variacao por 7 eixos sorteados em runtime.

ADR 2026-05-21-prompt-dna-capa-v2.md (secao 6)

Mesmo brief -> prompts (e imagens) legitimamente diferentes a cada
chamada do builder, mantendo a familia visual.

Os 7 eixos sao persistidos em `cover_library.variation_seeds` (JSONB)
por capa pra debug e analytics futuras.

Versao MINIMA (T4.20): compatibilidade basica. Versao RICA (proxima
sessao): matriz scene x light x mood quando brief tem `aleatorio`.
"""
import random

from app.services.cover_prompt_builder.types import CoverBrief, VariationAxes
from app.services.cover_prompt_builder.vocabulary import SUB_LOCATIONS

# ============================================================================
# LISTAS DE SLUGS POR EIXO -- frases descritivas ficam em vocabulary.py
# ============================================================================

FRAMING_OPTIONS: list[str] = [
    "close_face",
    "medium_torso",
    "full_body",
    "hands_detail",
    "over_shoulder",
    "wide_environment",
]

ANGLE_OPTIONS: list[str] = [
    "eye_level",
    "low_angle",
    "high_angle",
    "dutch_tilt",
    "from_behind",
    "awkward_crop",
]

TIME_OPTIONS: list[str] = [
    "harsh_noon",
    "golden_hour",
    "blue_hour",
    "night_practical",
    "predawn",
    "overcast",
]

PROP_OPTIONS: list[str] = [
    "none",
    "cash",
    "drink",
    "phone",
    "cigarette",
    "jewelry_detail",
    "food_wrapper",
    "car_keys",
]
# Peso maior pra "none" pra nao ficar com prop em capa toda hora
PROP_WEIGHTS: list[int] = [50, 8, 8, 8, 6, 8, 4, 8]

MOTION_OPTIONS: list[str] = [
    "still",
    "mid_stride",
    "turning_away",
    "gesturing",
    "interrupted_action",
    "slight_blur",
]

QUIRK_OPTIONS: list[str] = [
    "none",
    "light_leak_corner",
    "chromatic_edge",
    "dust_spot",
    "scan_line",
    "slight_color_bleed",
]
# Peso maior pra "none" -- quirk demais polui
QUIRK_WEIGHTS: list[int] = [60, 8, 8, 8, 8, 8]


# ============================================================================
# RESOLUCAO DE `aleatorio` DO BRIEF
# ============================================================================

# Quando brief.quem_aparece='aleatorio', sorteia entre opcoes com pessoa.
# sem_pessoa NAO entra no sorteio (e uma escolha estetica deliberada).
QUEM_ALEATORIO_OPTIONS: list[str] = [
    "homem_solo", "mulher_solo", "casal", "grupo",
]

# Quando brief.cenario='aleatorio', sorteia entre os 8 reais.
# Versao MINIMA: lista flat. Versao rica vai usar matriz por genero+mood.
CENARIO_ALEATORIO_OPTIONS: list[str] = [
    "rua_americana", "interior_intimo", "interior_luxo",
    "festa_underground", "paisagem_urbana", "paisagem_aberta",
    "closeup_objeto", "lugar_simbolico",
]

# Quando brief.atmosfera_luz='aleatorio', sorteia entre as 6 reais.
LUZ_ALEATORIO_OPTIONS: list[str] = [
    "sol_duro_dia", "golden_hour", "noite_natural",
    "flash_duro", "luz_colorida", "meia_luz",
]


# ============================================================================
# COMPATIBILIDADE BASICA -- time_of_day x atmosfera_luz
# ============================================================================

# Pra cada slug de atmosfera_luz, quais time_of_day fazem sentido.
# Se atmosfera_luz forca uma janela temporal (ex: luz_colorida exige noite),
# limita o sorteio do time_of_day.
TIME_COMPATIBLE_WITH_LUZ: dict[str, list[str]] = {
    "sol_duro_dia": ["harsh_noon", "overcast"],
    "golden_hour": ["golden_hour"],
    "noite_natural": ["blue_hour", "night_practical", "predawn"],
    "flash_duro": ["night_practical", "blue_hour"],
    "luz_colorida": ["night_practical"],
    "meia_luz": ["blue_hour", "night_practical", "overcast", "predawn"],
}


def sample_variation_axes(
    brief: CoverBrief,
    seed: int | None = None,
) -> VariationAxes:
    """Sorteia os 7 eixos respeitando dependencias do brief.

    Se `seed` e fornecida, o sorteio e deterministico -- util pra
    reproduzir uma combinacao especifica (feature futura "regerar com
    mesma seed").

    Resolucao de `aleatorio`:
    - brief.quem_aparece='aleatorio' -> sorteia entre opcoes com pessoa
    - brief.cenario='aleatorio' -> sorteia entre os 8 cenarios reais
    - brief.atmosfera_luz='aleatorio' -> sorteia entre as 6 luzes reais

    Dependencias resolvidas:
    - secondary_prop='none' forcado se resolved_quem='sem_pessoa'
    - time_of_day filtrado por resolved_luz (luz_colorida forca noite, etc.)
    - sub_location escolhida da lista do resolved_cenario
    """
    rng = random.Random(seed)

    # 1. Resolver "aleatorio" do brief antes de sortear eixos dependentes
    resolved_quem = (
        rng.choice(QUEM_ALEATORIO_OPTIONS)
        if brief.quem_aparece == "aleatorio"
        else brief.quem_aparece
    )
    resolved_cenario = (
        rng.choice(CENARIO_ALEATORIO_OPTIONS)
        if brief.cenario == "aleatorio"
        else brief.cenario
    )
    resolved_luz = (
        rng.choice(LUZ_ALEATORIO_OPTIONS)
        if brief.atmosfera_luz == "aleatorio"
        else brief.atmosfera_luz
    )

    # 2. Eixos independentes
    framing = rng.choice(FRAMING_OPTIONS)
    angle = rng.choice(ANGLE_OPTIONS)
    motion = rng.choice(MOTION_OPTIONS)
    quirk = rng.choices(QUIRK_OPTIONS, weights=QUIRK_WEIGHTS, k=1)[0]

    # 3. Eixos dependentes
    time_choices = TIME_COMPATIBLE_WITH_LUZ.get(resolved_luz, TIME_OPTIONS)
    time = rng.choice(time_choices)

    sub_loc_choices = SUB_LOCATIONS.get(resolved_cenario, [])
    sub_location = rng.choice(sub_loc_choices) if sub_loc_choices else ""

    # Prop forcado a 'none' se nao ha pessoa -- objeto ja e o assunto
    if resolved_quem == "sem_pessoa":
        prop = "none"
    else:
        prop = rng.choices(PROP_OPTIONS, weights=PROP_WEIGHTS, k=1)[0]

    return VariationAxes(
        resolved_quem=resolved_quem,
        resolved_cenario=resolved_cenario,
        resolved_luz=resolved_luz,
        subject_framing=framing,
        camera_angle=angle,
        time_of_day=time,
        sub_location=sub_location,
        secondary_prop=prop,
        motion_state=motion,
        film_quirk=quirk,
    )
