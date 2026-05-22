"""Configuracoes de iluminacao detalhadas por opcao do brief.

ADR 2026-05-22-prompt-dna-capa-v3.md

Cada slug `atmosfera_luz` do brief mapeia pra um setup rico (3-5 linhas)
que entra direto no bloco LIGHTING do prompt final v3.

Descricoes destiladas dos 5 prompts validados (Drake noite_natural,
Weeknd luz_colorida vermelha, Fakemink meia_luz, Nettspend flash_duro,
Travis noite_natural com farol).
"""

LIGHTING_SETUPS: dict[str, dict] = {
    "sol_duro_dia": {
        "full_description": (
            "harsh direct sunlight blowing out the sky to white, hard "
            "shadows under cap brims and chins, blown highlights on skin "
            "and surfaces, daylight whites dominating the frame, lens "
            "flare hitting the lens. No artificial fill. No flash. Just "
            "the sun overhead."
        ),
        "color_implications": "bleached daylight whites, warm skin tones, deep shadow blacks",
    },
    "golden_hour": {
        "full_description": (
            "warm golden hour light raking across the scene, long amber "
            "shadows reaching far, honey tones wrapping everything, "
            "lens flare softly glowing, occasional sun pop on jewelry "
            "and edges. No artificial fill."
        ),
        "color_implications": "warm amber, honey gold, deep amber shadows, faded sky blue",
    },
    "noite_natural": {
        "full_description": (
            "natural night-coded -- no spotlights, no flash, no "
            "artificial intervention. Lit almost entirely by what the "
            "city or environment gives: cold ambient sky glow, distant "
            "building lights pinpricking through windows, cool sodium-"
            "amber bleed of streetlights, moonlight bleeding across "
            "surfaces, a single warm interior lamp left on somewhere "
            "off-frame casting a faint pool that doesn't reach the "
            "figures. Heavy shadows swallowing most of the frame. "
            "Faces lit only by reflected city or environment light. "
            "Deep negative space."
        ),
        "color_implications": "deep cobalt blue, frost grey, slate, cool sodium amber, ice white",
    },
    "flash_duro": {
        "full_description": (
            "dominated by a harsh low-quality flash firing directly at "
            "the subject from camera level -- the unmistakable hard "
            "white pop of a cheap phone camera or disposable flash "
            "going off in a dark room, creating a sharp overexposed "
            "wash on the foreground while everything more than a few "
            "feet behind crushes to deep black. Skin gets blown "
            "slightly white, eyes catch the flash and reflect, jewelry "
            "sparks hot, the background dissolves into shadow. The "
            "flash is the dominant light source -- not soft, not "
            "flattering, accidentally beautiful. Behind the falloff, "
            "secondary sources may bleed: magenta-pink from a cheap "
            "LED, cold cyan-blue from a screen, a bare bulb throwing "
            "yellow."
        ),
        "color_implications": "hot white foreground, crushed black background, scattered magenta/cyan accents",
    },
    "luz_colorida": {
        "full_description": (
            "intentional and saturated colored practical light "
            "dominating the frame -- deep crimson, ruby red, electric "
            "magenta, or saturated blue/violet -- coming from an "
            "identifiable in-scene source (red bulb lamp, neon sign, "
            "screen glow, fire) and falling on PART of the scene with "
            "natural shadows on unaffected areas. A single warm "
            "tungsten lamp creates a hot spot somewhere in the "
            "composition. Heavy shadows, blown highlights on glossy "
            "surfaces. Dim but charged. NEVER a flat color filter "
            "over the whole frame -- always identifiable source, "
            "always partial reach."
        ),
        "color_implications": "dominant saturated color (red/blue/magenta) + warm tungsten pop + deep shadows",
    },
    "meia_luz": {
        "full_description": (
            "bad on purpose: a single overhead bulb casting harsh "
            "downward shadows, the cold blue glow of a phone or laptop "
            "screen lighting one side of the face while the other "
            "falls into darkness, the amber-orange of a streetlight "
            "bleeding through blinds, a desk lamp pointed wrong, the "
            "buzz of an overhead fluorescent flickering subtly, OR "
            "the harsh pop of a flash bouncing off a mirror creating "
            "a hard accidental highlight. Never flattering, always "
            "accidental. Highlights blow out, shadows crush, middle "
            "tones go ugly."
        ),
        "color_implications": "amber from cheap interior lights, cold blue from screens, crushed blacks, ugly fluorescent green",
    },
}


def get_lighting(slug: str) -> dict:
    """Retorna setup completo de iluminacao. Fallback: noite_natural."""
    return LIGHTING_SETUPS.get(slug, LIGHTING_SETUPS["noite_natural"])
