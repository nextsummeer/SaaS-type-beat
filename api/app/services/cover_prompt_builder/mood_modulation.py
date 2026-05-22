"""Modulacao do prompt por mood (6 moods do brief v3).

ADR 2026-05-22-prompt-dna-capa-v3.md

Cada mood ajusta:
- palette_hue: warm | cool | mixed | desaturated (orientacao geral da paleta)
- energy_phrase: paragrafo de energia no fim do prompt (5-8 palavras, vibe)
- body_language: postura/atitude do sujeito
- default_punch_phrase: usado quando artist_universe nao tem punch_phrase
  customizada pro mood especifico

Closers em prompt_skeleton.MOOD_CLOSERS (frase final no guard-rail).
3-word closers ficam em artist_universe (por artista, nao por mood).
"""

MOOD_DNA: dict[str, dict] = {
    "flexin": {
        "palette_hue": "warm",
        "energy_phrase": (
            "ostentation, success, money on display, untouchable, "
            "hood-luxury, lived-in wealth"
        ),
        "body_language": (
            "shoulders back, chin level, hands either flashing detail "
            "(watch, chain, cash) or hands in pockets confident"
        ),
        "default_punch_phrase": "Powerful. Calm. Untouchable.",
    },
    "dark": {
        "palette_hue": "cool",
        "energy_phrase": (
            "cold, calculated, untouchable, after-hours suppressed, "
            "operational not aspirational, the kind of image that makes "
            "you feel watched"
        ),
        "body_language": (
            "head turned away from the camera, shoulders set, hands at "
            "sides or in pockets, no smile, looking off-frame at something "
            "serious"
        ),
        "default_punch_phrase": "Cold. Calculating. Not smiling.",
    },
    "sad": {
        "palette_hue": "desaturated",
        "energy_phrase": (
            "lonely, withdrawn, terminally online, melancholic, casually "
            "sad, past crying, the kind of image that lives on a private "
            "Tumblr"
        ),
        "body_language": (
            "shoulders curled inward, head tilted down, eyes obscured, "
            "hands holding something casually (phone, drink, cigarette) "
            "or doing nothing at all"
        ),
        "default_punch_phrase": "Tired. Withdrawn. Somewhere else.",
    },
    "sexy": {
        "palette_hue": "warm",
        "energy_phrase": (
            "nocturnal, sensual, expensive, slightly melancholic, "
            "after-hours, lonely at the top, the kind of image that feels "
            "like you weren't supposed to see it"
        ),
        "body_language": (
            "weight on one hip, head tilted slightly down, eyes obscured "
            "by hair or motion blur, glossy skin catching practical light"
        ),
        "default_punch_phrase": "Quiet. Sensual. Already gone.",
    },
    "party": {
        "palette_hue": "mixed",
        "energy_phrase": (
            "tight crew, knowing the camera is there, just being there "
            "together at 2am, not for an audience -- for the group chat, "
            "casual, lo-fi, real"
        ),
        "body_language": (
            "mid-laugh, mid-turn, mid-conversation, hands holding drinks "
            "or each other or nothing -- no gang signs, no peace signs, "
            "no devil horns, just casual body language"
        ),
        "default_punch_phrase": "Present. Together. Real.",
    },
    "chill": {
        "palette_hue": "mixed",
        "energy_phrase": (
            "atmospheric, relaxed, contemplative, suspended, the kind of "
            "image that gets watched once and forgotten in a good way"
        ),
        "body_language": (
            "slouched comfortably, head tilted, headphones on or earbud "
            "in, eyes looking somewhere middle-distance, hands casual"
        ),
        "default_punch_phrase": "Quiet. Drifting. Headphones on.",
    },
}


def get_punch_phrase(mood: str, universe: dict) -> str:
    """Retorna punch_phrase pro mood, preferindo a especifica do artista
    (`universe.punch_phrase_by_mood[mood]`) e caindo no default do mood.

    Fallback final: 'Quiet. Real. Caught.'
    """
    artist_specific = (universe.get("punch_phrase_by_mood") or {}).get(mood)
    if artist_specific:
        return artist_specific
    return MOOD_DNA.get(mood, {}).get("default_punch_phrase", "Quiet. Real. Caught.")
