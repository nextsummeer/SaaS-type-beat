"""Pecas FIXAS do prompt v3: camera DNA, guard-rails, mood closers,
palavras/references banidas vs permitidas.

ADR 2026-05-22-prompt-dna-capa-v3.md (secao 1, 2 e 6)

ATENCAO -- RECEITA SECRETA:
- Nenhuma das constantes deste modulo deve aparecer em log puro
  ou em endpoint publico.
- Mudancas nas constantes CAMERA_DNA_* invalidam toda a estetica do
  produto -- nao mexer sem aprovacao do Gustavo + nova ADR.
"""
from app.services.cover_prompt_builder.types import CoverBrief

# ============================================================================
# CAMERA DNA -- 2 VARIANTES FIXAS
# ============================================================================
# Variante padrao: 10 dos 11 generos. Adjetivos calibrados ("very subtle",
# "mild", "light", "gentle") -- nao trocar.

CAMERA_DNA_PADRAO: str = (
    "A still frame extracted from a low-resolution video -- looks like a "
    "screenshot pulled from a phone video recorded at night and uploaded "
    "compressed, or a VHS camcorder recording, or an early 2000s MiniDV "
    "tape. Not a photograph -- a frozen frame from footage. Resolution "
    "feels capped around 720x480, the dimensions of standard-definition "
    "video, slightly stretched. The image has the unmistakable quality of "
    "a video still: very subtle motion blur, mild soft focus throughout, "
    "edges that feather slightly rather than cut sharp. Light video "
    "compression softness across the frame, gentle color banding in "
    "gradients. The image is gently degraded -- soft, not destroyed."
)

# Variante underground: usada APENAS quando genero_primario == 'underground_trap'
# OU genero_secundario == 'underground_trap'. Usa termos AGRESSIVOS ("Heavy",
# "blocky pixelation", "vertical glitch line", "low-bitrate") que sao
# explicitamente proibidos na padrao -- decisao consciente: estetica
# underground PEDE essa degradacao.

CAMERA_DNA_UNDERGROUND: str = (
    "A still frame extracted from a low-resolution video -- looks like a "
    "screenshot pulled from a VHS camcorder recording, an early 2000s MiniDV "
    "tape, or a compressed phone video uploaded and screenshotted. Not a "
    "photograph -- a frozen frame from footage. Resolution feels capped "
    "around 720x480, the dimensions of standard-definition video, slightly "
    "stretched. The image has the unmistakable quality of a video still: "
    "inherent motion blur even on stationary elements, soft focus throughout "
    "with no crisply sharp detail anywhere, edges that feather rather than "
    "cut. Heavy video compression artifacts across the entire frame -- "
    "blocky pixelation in the dark areas, color banding in gradients, "
    "smeared detail where motion meets stillness. Occasional faint vertical "
    "glitch line from imperfect "
    "playback. The image is technically degraded in the specific way only "
    "video stills from low-bitrate recordings are degraded -- different "
    "from film grain, different from JPEG noise."
)


# ============================================================================
# SHOT ON CLOSER -- FIXO em todos os prompts (independente da variante)
# ============================================================================

SHOT_ON_CLOSER: str = (
    "Shot on: a beat-up VHS camcorder, a MiniDV handheld from 2003, or a "
    "standard-definition phone video. Frame extracted from playback, never "
    "meant to be a still."
)


# ============================================================================
# POSE POOL -- 8 poses neutras, sorteadas em runtime pelo variation_engine.
# ============================================================================
# Objetivo: quebrar a pose-default ("sitting, caught mid-thought") que fazia
# toda capa sair igual. Frases neutras o bastante pra caber em qualquer
# cenario; o Claude adapta ao sub-location quando houver conflito.
# Constraints embutidos: rosto sempre obscurecido (regra global do elemento 4),
# sem gestos de mao, renderaveis por gpt-image-2 quality=low (anatomia simples,
# uma figura, sem contorcao). NAO se aplica quando quem_aparece='sem_pessoa'.

POSE_POOL: list[str] = [
    "sitting slouched forward, elbows resting on the knees, head hanging low",
    "standing with the back flat against a wall, shoulders loose and dropped",
    "leaning against a doorframe, the body half-turned away from the camera",
    "lying back across a surface (bed, couch, or backseat), one arm draped "
    "loosely over the face",
    "crouched low near the ground, spine curved, weight settled on the heels",
    "standing by a window looking out, the back partly turned to the camera",
    "seated sideways and turned away from the camera, the profile lost in "
    "shadow or behind hair",
    "caught mid-step walking past the frame, motion blur trailing, not "
    "looking at the camera",
]


# ============================================================================
# FRAMING POOL -- 6 enquadramentos, sorteados em runtime.
# ============================================================================
# Aplica-se SEMPRE (com ou sem pessoa). Composicoes simples que gpt-image-2
# quality=low renderiza de forma confiavel -- sem through-doorway, sem
# obstrucao de foreground, sem angulo extremo que distorce anatomia.

FRAMING_POOL: list[str] = [
    "medium shot at eye level",
    "medium shot from a slightly low angle",
    "close-up of the upper body, the face cropped at the top of the frame "
    "or obscured",
    "wide shot with the subject small in the frame and a lot of negative "
    "space around them",
    "over-the-shoulder framing, the back of the head and one shoulder soft "
    "in the foreground",
    "high angle looking down at the subject",
]


# ============================================================================
# GUARD-RAIL ANTI-DESTRUICAO -- 2 variantes (combinam com a camera DNA)
# ============================================================================

GUARD_RAIL_PADRAO: str = (
    "The compression is light but the image stays soft -- face, textures, "
    "and details discernible through the gentle degradation. The "
    "degradation is the aesthetic, not destruction."
)

GUARD_RAIL_UNDERGROUND: str = (
    "The compression is heavy but the image stays readable -- face, "
    "textures, and details still discernible through the noise. The "
    "degradation is the aesthetic, not destruction."
)


# ============================================================================
# MOOD CLOSERS -- frase final adapta ao mood
# Frases extraidas dos prompts validados (Drake, Weeknd, Fakemink, Nettspend,
# Travis) + tronco do handoff pros moods nao validados ainda.
# ============================================================================

MOOD_CLOSERS: dict[str, str] = {
    "sad": "The whole frame carries the soft sadness of a private photo nobody curated.",
    "dark": "The whole frame carries the heavy quiet of a clip pulled from a hard drive nobody opened in years.",
    "sexy": "The whole frame carries the intimate warmth of a clip somebody shouldn't have kept.",
    "chill": "The whole frame carries the easy quiet of a clip that gets watched once and forgotten.",
    "party": "The whole frame carries the casual intimacy of a story posted at 2am and watched the next morning.",
    "flexin": "The whole frame carries the heavy quiet of footage that wasn't supposed to leak.",
}


# ============================================================================
# PALAVRAS BANIDAS -- disparam estetica cinematografica polida (oposto do
# que o BeatPost quer). Sonnet 4.6 deve evitar -- validators.py rejeita
# prompts que contenham qualquer uma destas no corpo.
# ============================================================================

BANNED_WORDS: list[str] = [
    # REMOVIDAS em 2026-05-25 por aparecerem nos prompts validados em
    # contexto LEGITIMO (referencias culturais), causando falsos positivos:
    # - "music video": Drake/Travis usam ("low-budget music video", "Toronto-shot music videos")
    # - "cinematic": Lil Baby usa ("code-of-the-streets cinematic")
    # - "behind-the-scenes": Drake usa ("leaked behind-the-scenes clips")
    "b-roll",
    "film still",
    "scene from",
    "movie ending",
    "director",
    "bts",
    "frame from a movie",
]

# Substitutos permitidos (informativo -- so referencia pro Sonnet via
# system prompt, nao usado em validacao)
ALLOWED_WORD_REPLACEMENTS: list[str] = [
    "clip",
    "footage",
    "screenshot",
    "phone video",
    "frame from a hard drive",
    "candid clip",
    "footage from someone's gallery",
    "screenshot from a clip nobody finished",
]


# ============================================================================
# REFERENCES BANIDAS vs PERMITIDAS
# ============================================================================
# Banidas: cinematografos / diretores / editorial fashion -- disparam estetica
# polida. Validators rejeita.

BANNED_REFERENCES: list[str] = [
    # Filme Drive (2011) -- usar strings ESPECIFICAS, NUNCA "drive" cru
    # porque pega "hard drive", "night drives", "driveway" em contexto
    # legitimo (inclusive nos prompts validados do Gustavo).
    "drive (2011)",
    "nicolas winding refn",
    "ryan gosling drive",
    # Outras referencias cinematograficas/editoriais
    "neon demon",
    "wong kar-wai",
    "tony scott",
    "sofia coppola",
    "helmut newton",
    "guy bourdin",
    "vogue editorial",
    "fashion editorial",
    "harper's bazaar",
]

# Permitidas: fotografos intimo/documental. So referencia pro Sonnet,
# nao validado.
ALLOWED_REFERENCES: list[str] = [
    "Larry Clark",
    "Nan Goldin",
    "Cobrasnake archives",
    "Hedi Slimane youth photography",
    "Mark Hunter",
    "Theo Skudra",
]


# ============================================================================
# HELPERS
# ============================================================================

def _is_underground(brief: CoverBrief) -> bool:
    """True se brief tem underground_trap em primario OU secundario."""
    return (
        brief.genero_primario == "underground_trap"
        or brief.genero_secundario == "underground_trap"
    )


def pick_camera_dna(brief: CoverBrief) -> str:
    """Retorna texto integral da camera DNA -- padrao ou underground."""
    return CAMERA_DNA_UNDERGROUND if _is_underground(brief) else CAMERA_DNA_PADRAO


def pick_guard_rail(brief: CoverBrief) -> str:
    """Retorna o guard-rail anti-destruicao + mood closer combinados.

    Estrutura: "{guard_rail_body} {mood_closer}"

    Fallback: mood desconhecido -> usa closer de 'dark' (mais neutro).
    """
    body = GUARD_RAIL_UNDERGROUND if _is_underground(brief) else GUARD_RAIL_PADRAO
    closer = MOOD_CLOSERS.get(brief.mood, MOOD_CLOSERS["dark"])
    return f"{body} {closer}"
