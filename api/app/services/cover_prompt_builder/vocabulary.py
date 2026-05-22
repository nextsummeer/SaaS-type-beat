"""Mapeamentos slug PT do brief v2 -> frase descritiva em EN pro prompt.

Versao MINIMA (T4.19). A versao RICA (proxima sessao) vai adicionar:
- Matriz de compatibilidade scene x light x mood
- Sub-locations curadas por cenario (5-8 por slug)
- Sub-DNA para modo simbolico (quem_aparece=sem_pessoa)

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
