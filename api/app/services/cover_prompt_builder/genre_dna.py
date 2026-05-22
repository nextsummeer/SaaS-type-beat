"""DNA cultural por genero -- usado quando artista esta no fallback gracioso
OU como camada base que o artist_universe complementa.

ADR 2026-05-22-prompt-dna-capa-v3.md (secao 4 + 5)

Estrutura por genero:
- era_anchor: frase curta que ancora a era visual ("Mid-2010s Atlanta...")
- thematic_template: template generico (quando artista nao tem thematic propria)
- vocabulary_pool: itens culturais/wardrobe genericos do genero
- palette_anchors: cores tipicas (usadas quando artista nao especifica)
- fallback_references: refs intimo-coded por genero (pra Sonnet usar quando
  artista_universe.references esta vazio)
"""

GENRE_DNA: dict[str, dict] = {
    "trap": {
        "era_anchor": "Mid-2010s Atlanta urban documentary energy",
        "thematic_template": (
            "Mid-2010s Atlanta urban heat aesthetic, lived-in hood-luxury, "
            "candid private moment with gold reflections."
        ),
        "vocabulary_pool": [
            "layered gold cuban links and tennis chains",
            "a heavy pendant resting on the chest",
            "diamond grills catching light",
            "designer hoodie or vintage jersey",
            "distressed denim or cargo pants",
            "fresh sneakers",
            "a stack of cash in one hand",
            "a styrofoam cup",
        ],
        "palette_anchors": [
            "bleached daylight whites",
            "warm beige concrete",
            "gold and diamond reflections",
            "deep shadow blacks",
            "warm skin tones glowing in sun",
        ],
        "fallback_references": [
            "Atlanta street documentary photography",
            "trap-era candid camcorder tapes",
            "early 2010s Southern hip-hop visuals",
        ],
    },
    "underground_trap": {
        "era_anchor": "Late-2020s underground internet rap aesthetic",
        "thematic_template": (
            "Late-2020s underground internet rap aesthetic meets indie sleaze "
            "revival, terminally online bedroom culture caught on film."
        ),
        "vocabulary_pool": [
            "vintage band tee stretched at the neckline",
            "Hedi Slimane-era skinny black jeans",
            "oversized hoodie worn open over thin layers",
            "thin chunky silver chains stacked",
            "smudged black eye makeup",
            "chipped nail polish",
            "small blurry stick-and-poke tattoos",
            "beat-up sneakers",
        ],
        "palette_anchors": [
            "faded denim blue",
            "washed-out yellow",
            "sickly fluorescent green",
            "dusty beige",
            "deep crushed blacks",
            "bruised purple",
            "amber of cheap interior lights",
        ],
        "fallback_references": [
            "Cobrasnake archives",
            "Larry Clark domestic interiors",
            "Hedi Slimane youth photography",
            "Mark Hunter Cobrasnake",
            "Pinterest of underground 2024 rap",
        ],
    },
    "drill": {
        "era_anchor": "Late-2010s drill scene aesthetic",
        "thematic_template": (
            "Cold urban menace aesthetic, hooded silhouettes, masked faces, "
            "group energy with hidden identity, caught on tape."
        ),
        "vocabulary_pool": [
            "balaclava or ski mask",
            "dark puffer jacket",
            "hooded sweatshirt with hood pulled forward",
            "dark cargo pants",
            "fresh sneakers",
            "low-brim cap",
            "small silver chain hidden under layers",
        ],
        "palette_anchors": [
            "deep blue-grey",
            "cold sodium amber from streetlights",
            "crushed blacks",
            "concrete grey",
            "faint warm pop from a single screen",
        ],
        "fallback_references": [
            "Brooklyn drill scene documentary clips",
            "UK drill iPhone footage",
            "late-night street camcorder tapes",
        ],
    },
    "plug": {
        "era_anchor": "Late-2010s SoundCloud-era plug/pluggnb dreaminess",
        "thematic_template": (
            "Airy melodic dreaminess aesthetic, hazy soft daylight, pastel "
            "washes, melancholy with sweetness, late-2010s SoundCloud era "
            "nostalgia caught on tape."
        ),
        "vocabulary_pool": [
            "oversized graphic tee",
            "loose comfortable jeans",
            "checkered Vans or slip-ons",
            "single silver chain",
            "messy dyed hair",
            "smudged eyeliner",
            "casual airy layers",
        ],
        "palette_anchors": [
            "pastel pink",
            "soft lavender",
            "hazy mint green",
            "washed-out sky blue",
            "warm beige",
            "faded white",
        ],
        "fallback_references": [
            "late-2010s SoundCloud cover art",
            "Cobrasnake archives",
            "early plug-era candid phone clips",
        ],
    },
    "rnb": {
        "era_anchor": "Late-night R&B after-hours aesthetic",
        "thematic_template": (
            "Late-night R&B after-hours aesthetic, intimate sensual nightscape, "
            "glossy skin in shadow, caught on tape."
        ),
        "vocabulary_pool": [
            "slip dress",
            "fitted bodysuit",
            "sheer top with delicate lingerie",
            "oversized luxury jacket off the shoulder",
            "layered gold chains",
            "delicate cross or pendant",
            "single statement ring",
            "smudged dark eyeliner",
        ],
        "palette_anchors": [
            "deep crimson and ruby red",
            "hot amber",
            "cool blue from windows",
            "warm tungsten pop",
            "glossy skin warmed by red",
            "deep shadow blacks",
        ],
        "fallback_references": [
            "leaked behind-the-scenes footage from R&B music videos",
            "intimate private camcorder tapes in hotel rooms",
            "candid clips under red neon",
        ],
    },
    "rage": {
        "era_anchor": "Late-2020s rage / WLR-era hyperpop",
        "thematic_template": (
            "Black-and-red chaos aesthetic, masked silhouettes, mosh-pit blur, "
            "industrial-gothic fashion, demonic-fashion-coded energy caught on "
            "tape."
        ),
        "vocabulary_pool": [
            "black distressed leather jacket",
            "tactical harness over bare chest or fitted long-sleeve",
            "ripped black jeans or wide-leg cargo",
            "knee-high boots",
            "studded belt",
            "silver gothic jewelry",
            "smudged red or black eye makeup",
            "balaclava or face cover",
        ],
        "palette_anchors": [
            "deep blood red",
            "crushed black",
            "industrial metal grey",
            "hot magenta accent",
            "sickly green pop",
            "stark white skin in red light",
        ],
        "fallback_references": [
            "Whole Lotta Red era visuals",
            "Opium Records visual world",
            "underground rage function footage",
        ],
    },
    "boom_bap": {
        "era_anchor": "90s NYC street documentary aesthetic",
        "thematic_template": (
            "90s NYC street documentary photography aesthetic, raw street "
            "energy, saturated 90s color, crowded scenes caught on tape."
        ),
        "vocabulary_pool": [
            "boxy varsity jacket",
            "oversized button-up shirt",
            "loose-fit denim jeans",
            "Timberlands or chunky sneakers",
            "thick gold rope chain",
            "fitted baseball cap or bucket hat",
            "snapback hat sideways",
        ],
        "palette_anchors": [
            "saturated 90s warm yellow",
            "deep red brick",
            "olive green",
            "pavement grey",
            "warm skin tones",
            "deep blacks of evening",
        ],
        "fallback_references": [
            "90s NYC street photography",
            "early Source Magazine visuals",
            "Bronx and Brooklyn candid documentary footage",
        ],
    },
    "ambient": {
        "era_anchor": "Conceptual atmospheric isolation",
        "thematic_template": (
            "Conceptual atmosphere aesthetic, landscapes, symbols, isolation, "
            "surreal natural light, single small figure in vast space caught "
            "on tape."
        ),
        "vocabulary_pool": [
            "neutral muted clothing",
            "oversized minimalist coat",
            "plain tee",
            "loose trousers",
            "no visible jewelry",
            "natural skin no makeup",
        ],
        "palette_anchors": [
            "muted earth tones",
            "soft greys",
            "natural sky blue",
            "warm sand",
            "deep shadow without saturation",
        ],
        "fallback_references": [
            "Andrei Tarkovsky-coded landscape footage (but candid, not cinema)",
            "minimalist atmospheric album cover photography",
            "private archival landscape clips",
        ],
    },
    "jersey_club": {
        "era_anchor": "Mid-2020s Jersey club / dance function aesthetic",
        "thematic_template": (
            "Bright urban color aesthetic, dance energy, multiple figures in "
            "motion, city night with neon practical lights caught on tape."
        ),
        "vocabulary_pool": [
            "fitted athleisure",
            "tight crop tops",
            "low-rise wide-leg pants",
            "fresh white sneakers",
            "small gold hoops",
            "delicate chains",
            "natural hair styles",
        ],
        "palette_anchors": [
            "hot magenta",
            "electric blue",
            "warm amber neon",
            "deep crushed blacks",
            "sweaty skin highlights",
        ],
        "fallback_references": [
            "Jersey club function iPhone footage",
            "Newark/Philly party clips",
            "mid-2020s East Coast dance documentary",
        ],
    },
    "pop": {
        "era_anchor": "Crossover mainstream-but-candid aesthetic",
        "thematic_template": (
            "Pristine but candid aesthetic, slightly editorial but kept "
            "off-balance, bright daylight or warm interior, clean fashion "
            "caught on tape."
        ),
        "vocabulary_pool": [
            "well-cut tailored pieces",
            "clean simple layers",
            "subtle delicate jewelry",
            "natural minimal makeup",
            "fresh sneakers or simple heels",
        ],
        "palette_anchors": [
            "soft warm cream",
            "pale blue sky",
            "natural skin tones",
            "muted pastel accent",
            "clean shadow",
        ],
        "fallback_references": [
            "Theo Skudra candid pop photography",
            "indie pop album cover archival clips",
            "late-2010s crossover visuals",
        ],
    },
    "afrobeats": {
        "era_anchor": "Late-2020s Afrobeats global aesthetic",
        "thematic_template": (
            "Warm African urban color aesthetic, gold and amber, group energy, "
            "dance, street fashion with cultural specificity caught on tape."
        ),
        "vocabulary_pool": [
            "vibrant patterned shirt",
            "tailored linen or silk piece",
            "gold chains and pendants",
            "fitted cap or do-rag",
            "fresh sneakers or sandals",
            "natural hair styles",
        ],
        "palette_anchors": [
            "deep amber and gold",
            "saturated warm orange",
            "rich green from patterns",
            "warm skin tones",
            "ochre and clay tones",
        ],
        "fallback_references": [
            "Lagos street documentary footage",
            "Afrobeats music video BTS clips (candid only)",
            "West African urban photography",
        ],
    },
}
