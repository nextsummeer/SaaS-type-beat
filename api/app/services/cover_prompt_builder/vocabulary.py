"""Mapeamentos slug -> frase descritiva em EN pro prompt.

Cobre o brief v2 (campos do produtor) E os 7 eixos de variacao (sorteados
em runtime por `variation.py`).

Versao MINIMA (T4.19/T4.20). A versao RICA (proxima sessao) vai adicionar:
- Matriz de compatibilidade scene x light x mood
- Sub-DNA aprofundado pro modo simbolico (quem_aparece=sem_pessoa)
- Expansao das listas de sub-locations por cenario

ADR 2026-05-21-prompt-dna-capa-v2.md
"""

# Genero: estetica implicita curta por slug. Texto baseado na secao
# "Genre as Primary Aesthetic Anchor" do ADR v2.
GENERO_LABELS: dict[str, str] = {
    "trap": "Atlanta urban heat, gold reflections, hood-luxury, daytime, lived-in wealth",
    "underground_trap": "crude lo-fi flash photography, basement intimacy, raw and un-glamorous, real-life texture",
    "drill": "cold urban menace, hooded silhouettes, blue-grey tones, masked faces, group energy with hidden identity",
    "plug": "airy melodic dreaminess, hazy soft daylight, pastel washes, melancholy with sweetness, late-2010s SoundCloud era nostalgia",
    "rnb": "intimate sensual nightscape, red and amber practical lights, glossy skin in shadow, after-hours mood, single figure or quiet duet",
    "rage": "black-and-red chaos, masked silhouettes, mosh-pit blur, industrial-gothic fashion, demonic-fashion-coded",
    "boom_bap": "90s NYC street documentary photography, black-and-white tendencies, saturated 90s color, crowded scenes, raw street energy",
    "ambient": "conceptual atmosphere, landscapes, symbols, isolation, surreal natural light, single small figure in vast space",
    "jersey_club": "bright urban color, dance energy, multiple figures in motion, city night with neon practical lights",
    "pop": "pristine but candid, slightly editorial but kept off-balance, bright daylight or warm interior, clean fashion",
    "afrobeats": "warm African urban color, gold and amber, group energy, dance, street fashion with cultural specificity",
}

# Quem aparece: frase descritiva pro bloco SUBJECT do prompt.
# 'aleatorio' nao aparece: resolvido em variation.py antes de chegar aqui.
QUEM_LABELS: dict[str, str] = {
    "homem_solo": "a single man as the main subject",
    "mulher_solo": "a single woman as the main subject",
    "casal": "a couple (two figures in intimate proximity)",
    "grupo": "a small group or crew (3-5 figures)",
    "sem_pessoa": "no human subject in frame (landscape, object, or atmosphere only)",
}

# Mood: vocabulario nativo da cena de type beat (NAO psicologia academica).
MOOD_LABELS: dict[str, str] = {
    "flexin": "flexing, ostentation, success, money on display, untouchable hood-luxury",
    "dark": "heavy, ominous, dark, threatening, hostile undercurrent",
    "sad": "sad, melancholic, lonely after-hours vibe, introspective",
    "sexy": "sensual, intimate, after-hours, magnetic, expensive",
    "party": "celebratory, high-energy, crowd, motion, party",
    "chill": "atmospheric, relaxed, contemplative, suspended",
}

# Descricoes curtas em PT pros cards do wizard (consumo do frontend via API).
MOOD_DESCRIPTIONS_PT: dict[str, str] = {
    "flexin": "Ostentacao, sucesso, money on display",
    "dark": "Pesado, sombrio, ameaca",
    "sad": "Triste, melancolico, lonely vibe",
    "sexy": "Sensual, intimo, after hours",
    "party": "Festa, energia alta, multidao",
    "chill": "Atmosferico, relaxado, contemplativo",
}

# Cenario: frase descritiva pro bloco SETTING do prompt.
# 'aleatorio' nao aparece: resolvido em variation.py.
CENARIO_LABELS: dict[str, str] = {
    "rua_americana": "a working-class American neighborhood, street level (sidewalk, corner store, gas station, brick apartment exterior, residential block)",
    "interior_intimo": "an intimate private interior (bedroom, hotel room, car interior, small lived-in space)",
    "interior_luxo": "an upscale private interior (penthouse, hotel suite, club VIP booth, luxury car interior)",
    "festa_underground": "an underground party or rave setting (warehouse, basement, dark club floor)",
    "paisagem_urbana": "an urban exterior at scale (rooftop, bridge, parking garage, empty downtown street at night)",
    "paisagem_aberta": "an open natural landscape (field, beach, desert, mountain area)",
    "closeup_objeto": "a tight close-up on an object or detail as the primary subject (no environment context)",
    "lugar_simbolico": "a symbolic or charged location (church interior, cemetery, tunnel, abandoned space)",
}

# Atmosfera de luz: frase descritiva pro bloco LIGHTING do prompt.
# 'aleatorio' nao aparece: resolvido em variation.py.
ATMOSFERA_LUZ_LABELS: dict[str, str] = {
    "sol_duro_dia": "harsh midday sun, blown-out highlights, hard shadows, daylight whites",
    "golden_hour": "warm golden hour, long shadows, amber tones wrapping the scene",
    "noite_natural": "natural night light (streetlamp, headlights, moonlight, sparse warm pops)",
    "flash_duro": "direct on-camera flash, hard frontal light, deep shadows behind subject",
    "luz_colorida": "colored practical light (red bulb, neon, screen glow, fire) illuminating PART of the scene from an identifiable source -- never a flat filter over the whole frame",
    "meia_luz": "low ambient light, deep shadows, mood, much of the frame in darkness",
}


# ============================================================================
# VARIATION AXES -- labels EN pros 7 eixos sorteados em runtime.
# Slugs (lista) ficam em variation.py; aqui ficam so as frases descritivas.
# ============================================================================

# Subject framing: reforco anti-rostos-derretidos quando inclui face/maos.
SUBJECT_FRAMING_LABELS: dict[str, str] = {
    "close_face": "tight close-up on the subject's face -- kept partially obscured by hand, hair, shadow, or motion blur",
    "medium_torso": "medium framing showing head and torso, clothing and adornments visible",
    "full_body": "full body shot with the subject standing within the environment",
    "hands_detail": "close-up on the subject's hands as the focal point, face out of frame or in deep shadow",
    "over_shoulder": "shot from over the subject's shoulder, looking past them into the scene",
    "wide_environment": "wide framing where the subject is small within the environment, environment dominates the frame",
}

CAMERA_ANGLE_LABELS: dict[str, str] = {
    "eye_level": "shot at eye level, candid documentary feel",
    "low_angle": "shot from a low angle looking up, subject feels imposing",
    "high_angle": "shot from a high angle looking down on the subject",
    "dutch_tilt": "slight dutch tilt, off-axis composition",
    "from_behind": "shot from behind the subject, face mostly hidden",
    "awkward_crop": "awkward asymmetric crop, subject pushed to an edge of the frame, unbalanced composition",
}

TIME_OF_DAY_LABELS: dict[str, str] = {
    "harsh_noon": "harsh noon light, sky blown to white, hard contrast",
    "golden_hour": "golden hour warmth, long shadows raking across the scene",
    "blue_hour": "blue hour (just after sunset), cool ambient with warm practical lights",
    "night_practical": "deep night with practical light sources only (streetlamps, headlights, neon, screens)",
    "predawn": "pre-dawn, cold blue cast, no sun yet",
    "overcast": "flat overcast daylight, low contrast, muted colors",
}

SECONDARY_PROP_LABELS: dict[str, str] = {
    "none": "",  # ausente; user prompt omite linha
    "cash": "a stack of cash fanned in one hand or visible in frame",
    "drink": "a glass or styrofoam cup held casually",
    "phone": "a phone in hand, screen glow lighting part of the subject's face",
    "cigarette": "a lit cigarette held in hand, faint smoke rising",
    "jewelry_detail": "heavy jewelry catching light -- chains, ring, watch, or pendant in detail",
    "food_wrapper": "a fast-food wrapper or takeaway container in frame as a real-life detail",
    "car_keys": "car keys casually held or hanging from a finger",
}

MOTION_STATE_LABELS: dict[str, str] = {
    "still": "the subject is momentarily still, caught between actions",
    "mid_stride": "the subject is mid-stride, walking through the frame",
    "turning_away": "the subject is in the act of turning away from the camera",
    "gesturing": "the subject is mid-gesture, hands moving in conversation or action",
    "interrupted_action": "the subject is caught in interrupted action (lighting something, reaching for something, mid-sentence)",
    "slight_blur": "the subject has slight motion blur from movement during the exposure",
}

FILM_QUIRK_LABELS: dict[str, str] = {
    "none": "",  # ausente; user prompt omite linha
    "light_leak_corner": "a faint light leak in one corner of the frame",
    "chromatic_edge": "chromatic aberration visible along high-contrast edges",
    "dust_spot": "a small dust spot or hair on the scan, characteristic of analog film",
    "scan_line": "a faint horizontal scan line across one part of the image",
    "slight_color_bleed": "subtle color bleed in saturated areas, characteristic of old film stock",
}


# ============================================================================
# SUB-LOCATIONS por cenario -- frases EN diretas (5-8 por cenario).
# Versao MINIMA: lista flat. Versao rica (proxima sessao) vai adicionar
# compatibilidade fina com mood/genero.
# ============================================================================

SUB_LOCATIONS: dict[str, list[str]] = {
    "rua_americana": [
        "cracked sidewalk in front of a corner store",
        "the parking lot of a strip mall with faded signage",
        "the steps of a brick apartment complex with bars on the windows",
        "a gas station with a beat-up car in frame",
        "a porch with peeling paint and worn furniture",
        "a dead-end street with telephone wires crossing the sky",
        "the curb of a residential block at the end of the day",
        "an alley behind a row of houses, mattress and trash visible",
    ],
    "interior_intimo": [
        "an unmade bed with light cutting through partly closed blinds",
        "the passenger seat of a parked car at night",
        "a hotel room with the TV on as the only source of light",
        "a bathroom mirror reflection, edges of the room visible",
        "a couch with a pile of clothes nearby, casual mess",
        "the floor of a small studio apartment looking up at the ceiling",
    ],
    "interior_luxo": [
        "a penthouse window with city lights stretched behind",
        "a hotel suite at night with a single lamp lit, everything else dark",
        "the back of a luxury SUV with leather and tinted windows",
        "a private club VIP booth with velvet upholstery and low warm light",
        "a marble countertop with a glass tumbler and a phone face-down",
        "a hotel bathroom with gold fixtures and steam from the shower",
    ],
    "festa_underground": [
        "a warehouse with haze and a single moving stage light",
        "a dark basement with a strobe pulsing in the corner",
        "a club dance floor seen from the edge, bodies in motion",
        "the back hallway of a venue, sweaty walls and a fire exit sign",
        "a packed underground room with bodies pressed close, low ceiling",
    ],
    "paisagem_urbana": [
        "a rooftop overlooking a city at twilight",
        "an overpass with passing headlights making streaks",
        "an empty parking garage under fluorescent flicker",
        "a downtown street at 3am, completely empty",
        "a bridge with the river dark below",
        "a high-rise window with the geometric pattern of the city outside",
    ],
    "paisagem_aberta": [
        "an open field at the end of the day, nothing on the horizon",
        "a beach with no other people in frame, low light",
        "a desert highway stretching to the horizon, nothing else",
        "a forest clearing with thin trees and dappled light",
        "a country road at dusk, gravel and silence",
        "the edge of a quarry, brown earth and grey sky",
    ],
    "closeup_objeto": [
        "tight close-up of a gold pendant catching harsh light",
        "close-up of cash fanned in one hand against a dark background",
        "a single sneaker on a wet surface, water beading",
        "a glass tumbler half full of brown liquor on a dark surface",
        "a watch on a wrist, veins visible, chain hanging",
        "a stack of polaroids spread on a table",
    ],
    "lugar_simbolico": [
        "the interior of an empty church with light from a stained-glass window",
        "a cemetery at the end of the day, long shadows across stone",
        "the entrance of a tunnel with light at the far end",
        "an abandoned warehouse with broken windows and dust in the air",
        "an empty parking lot at night with one car under a single light",
        "a long hallway with flickering fluorescent lights",
    ],
}
