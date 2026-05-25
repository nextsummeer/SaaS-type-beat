"""Dicionario de universos visuais por artista.

ADR 2026-05-22-prompt-dna-capa-v3.md (secao 4)

Cada entrada tem:
- thematic_sentence: frase que abre o "registro emocional" do universo
- masterphrase: "The image feels less like a photograph and more like..."
- sub_locations: 5-8 frases ricas de sub-locations (variation_engine sorteia UMA)
- wardrobe_pool: vocabulario amplo (sem virar uniforme)
- references: lista de references culturais permitidas (intimo-coded)
- city_anchor: cidade quando central a identidade visual (None se placeless)
- closer_3_words: assinatura final do prompt

EXTRAIDO dos 5 prompts validados visualmente pelo Gustavo (2026-05-22).
Expansivel: novos artistas viram entradas no dict. Quando produtor digita
artista FORA do dict, builder usa fallback gracioso (so genero+mood).
"""
from typing import Optional


ARTIST_UNIVERSE: dict[str, dict] = {
    # ========================================================================
    # DRAKE -- Trap/Toronto/OVO
    # ========================================================================
    "drake": {
        "hair_directives": (
            "Short black natural hair, low fade, occasional cornrows or "
            "braids tied back. Conservative grooming, expensive cuts."
        ),
        "thematic_sentence": (
            "Mid-2010s Toronto OVO documentary energy meets candid private "
            "moment with a cold edge."
        ),
        "masterphrase": (
            "The image feels less like a photograph and more like "
            "surveillance footage -- a frame someone wasn't supposed to "
            "capture."
        ),
        "sub_locations": [
            "the empty floor of a glass-walled penthouse before a party, "
            "Toronto skyline through floor-to-ceiling windows",
            "a private members' club booth in deep leather and dark wood",
            "the back booth of a high-end restaurant after hours",
            "a private balcony of a high-rise condo with the Toronto skyline "
            "stretched out under low clouds visible through floor-to-ceiling "
            "windows, CN Tower glowing distant",
            "a marble-floored hotel suite lobby",
            "the interior of a black SUV parked in a private garage with "
            "engine still running",
            "a private screening room with the projector still warm",
            "the parking lot exterior with luxury car and Toronto skyline "
            "distant under low clouds",
        ],
        "wardrobe_pool": [
            "long black puffer or shearling-lined parka",
            "oversized hoodie in black or muted earth tones",
            "chunky knit beanie",
            "dark wool overcoat",
            "distressed dark denim or tactical cargo pants",
            "fresh Air Jordans or Timberlands",
            "layered gold cuban links",
            "single oversized owl or religious pendant resting heavy on the chest",
            "diamond-faced Patek or AP catching the light",
            "custom rings stacked on his fingers",
        ],
        "wardrobe_anchor_phrase": (
            "Not flexing for the camera -- flexing because the camera caught him."
        ),
        "references": [
            "If You're Reading This It's Too Late era visuals",
            "Views interior imagery",
            "OVO Sound winter campaign footage",
            "leaked behind-the-scenes clips from Toronto-shot music videos",
            "Theo Skudra footage",
            "surveillance-style camcorder tapes",
        ],
        "city_anchor": "Toronto",
        "closer_3_words": "Imperfect. Cold. Heavy.",
        "punch_phrase_by_mood": {
            "dark": "Cold. Calculating. Not smiling.",
            "flexin": "Cold. Powerful. Already won.",
            "sad": "Quiet. Withdrawn. Already gone.",
        },
    },

    # ========================================================================
    # THE WEEKND -- R&B/After-hours/Red lighting
    # ========================================================================
    "the weeknd": {
        "hair_directives": (
            "Long dark hair partially covering face -- natural waves or "
            "straightened, often falling forward to obscure one eye. "
            "Disheveled, end-of-night quality, never freshly done."
        ),
        "thematic_sentence": (
            "Late-night R&B after-hours aesthetic, hotel suite intimacy "
            "bathed in red light, caught on tape when nobody was paying "
            "attention."
        ),
        "masterphrase": (
            "The image feels less like a photograph and more like a frame "
            "someone shouldn't have taken -- a private moment captured in a "
            "clip nobody was supposed to keep."
        ),
        "sub_locations": [
            "a penthouse hotel suite with floor-to-ceiling windows showing a "
            "blurred city skyline and red neon visible",
            "a dimly lit hotel room with velvet textures and a red bulb lamp",
            "a luxury car interior with red dashboard glow",
            "a private club booth with leather seating",
            "a marble bathroom lit only by ambient red light",
            "a vintage hotel room with red wallpaper and amber lamp",
        ],
        "wardrobe_pool": [
            # Calibrado em 2026-05-25 pra evitar content_policy_violation do
            # OpenAI gpt-image-2. Removidos: "sheer top + delicate lingerie
            # underneath", "fitted bodysuit" (disparam filtro de moderacao
            # quando combinados com luz vermelha + hotel suite + mulher solo).
            "minimal and expensive slip dress",
            "fitted silk or satin top",
            "oversized luxury jacket worn off the shoulder",
            "tailored long coat over a simple base layer",
            "layered gold chains",
            "delicate cross pendant",
            "hoop earrings",
            "single statement ring",
        ],
        "wardrobe_anchor_phrase": (
            "Magnetic, untouchable -- the kind of styling that reads "
            "expensive without trying."
        ),
        "references": [
            "leaked behind-the-scenes footage from after-hours R&B music videos",
            "intimate private camcorder tapes shot in hotel rooms",
            "candid clips from forgotten hard drives shot under red neon",
        ],
        "city_anchor": None,
        "closer_3_words": "Imperfect. Quiet. Burning.",
        "punch_phrase_by_mood": {
            "sexy": "Quiet. Sensual. Already gone.",
            "sad": "Quiet. Lonely. After-hours.",
            "dark": "Quiet. Heavy. Burning.",
        },
    },

    # ========================================================================
    # FAKEMINK -- Underground/Indie sleaze/Bedroom
    # ========================================================================
    "fakemink": {
        "hair_directives": (
            "Bleached or peroxide platinum blonde hair is the DEFAULT for "
            "this universe (indie sleaze revival aesthetic) -- long, messy, "
            "chaotic, falling across the eyes, often with grown-out dark "
            "roots showing. Use blonde in roughly 70% of generations. "
            "Occasionally jet black with chunky bangs, OR dyed pink/lavender/"
            "platinum-silver, but bleached blonde dominates the look. "
            "NEVER default to natural dark hair for this artist."
        ),
        "thematic_sentence": (
            "Late-2020s underground internet rap aesthetic meets indie sleaze "
            "revival, terminally online bedroom culture caught on film."
        ),
        "masterphrase": (
            "The image feels less like a photograph and more like a frame "
            "found on someone's old hard drive -- a private moment nobody "
            "else was supposed to see."
        ),
        "sub_locations": [
            "a small bedroom with posters of underground rappers and shoegaze "
            "bands peeling off the walls, tangled cables on the floor, an "
            "unmade bed with crumpled sheets, a half-eaten ramen cup on the "
            "bedside table, a laptop open and glowing on the floor",
            "the passenger seat of a parked car at 3am with rain streaking "
            "the windshield, neon signs blurred in the far distance through "
            "the glass, an empty soda can in the cup holder",
            "a dirty bathroom with bad fluorescent lighting and water stains "
            "on the mirror",
            "a thrift store dressing room with floral wallpaper",
            "a hotel hallway with patterned carpet and a single overhead bulb",
        ],
        "wardrobe_pool": [
            "vintage band tee (Deftones, shoegaze, emo-adjacent) stretched at "
            "the neckline",
            "Hedi Slimane-era skinny black jeans low on the hips",
            "oversized hoodie worn open over thin layers",
            "mesh top under a stained white tank",
            "slip dress that's seen better days",
            "thin chunky silver chains stacked",
            "single cross pendant",
            "two cheap rings on the index finger",
            "smudged black eye makeup",
            "chipped black nail polish",
            "blurry stick-and-poke tattoo on the forearm or hand",
        ],
        "wardrobe_anchor_phrase": (
            "Internet-coded sleaze, expensive things worn like they cost "
            "nothing. Not posing -- caught mid-thought."
        ),
        "references": [
            "indie sleaze era Cobrasnake archives",
            "Hedi Slimane youth photography",
            "Mark Hunter",
            "the Pinterest of underground 2024 rap",
            "Larry Clark's domestic interiors",
            "sad teenage bedroom Tumblr 2014",
        ],
        "city_anchor": None,
        "closer_3_words": "Imperfect. Sad. Lo-fi.",
        "punch_phrase_by_mood": {
            "sad": "Tired. Withdrawn. Somewhere else.",
            "chill": "Quiet. Drifting. Headphones on.",
            "dark": "Quiet. Heavy. Drifting.",
        },
    },

    # ========================================================================
    # NETTSPEND -- Underground/Digicore/Function
    # ========================================================================
    "nettspend": {
        "hair_directives": (
            "Hair varies WILDLY across the crew -- explicit mix of platinum "
            "bleach, peroxide blonde, dyed pink, dyed lavender, jet black "
            "with chunky bangs, natural brown, dark with bleached front "
            "streaks. Each person different hair color. In a crew of 5-7, "
            "at least 1-2 figures have bleached/platinum hair. NEVER all "
            "the same hair color, NEVER all dark hair."
        ),
        "thematic_sentence": (
            "Mid-2020s underground internet rap aesthetic, digicore meets DIY "
            "function, terminally online crew in a room together."
        ),
        "masterphrase": (
            "The image feels less like a photograph and more like a clip "
            "pulled from someone's story 24 hours before it expires."
        ),
        "sub_locations": [
            "an apartment function packed with too many bodies in a small "
            "living room or hallway, posters peeling off the walls in the "
            "deep background",
            "a basement DIY show with concrete floor and a single PA speaker "
            "in a corner",
            "the entryway of a warehouse with industrial doors and a flyer "
            "taped to the wall",
            "a tight kitchen at a house party with cans on the counter",
            "a parking lot pre-rave with cars circled",
            "a rooftop with the city distant below",
        ],
        "wardrobe_pool": [
            "vintage band tees",
            "archive designer pieces",
            "thrifted streetwear",
            "mesh and fishnet layers",
            "oversized hoodies",
            "fitted long-sleeves",
            "slip dresses",
            "cropped tanks",
            "low-rise denim",
            "baggy cargos",
            "micro skirts",
            "ripped tights",
            "beat-up sneakers and chunky boots",
            "cheap silver jewelry stacked rings and chains",
            "smudged dark eyeliner",
            "chipped nail polish",
            "small blurry tattoos on hands and necks",
        ],
        "wardrobe_anchor_phrase": (
            "Each person dressed differently, no shared uniform -- not posing "
            "for fashion, just dressed for the night."
        ),
        "references": [
            "mid-2020s underground rap function group shots",
            "digicore visual world",
            "Drain Gang and Bladee crew photography",
            "iPhone story screenshots from 2024 nights out",
            "internet-era function photography",
        ],
        "city_anchor": None,
        "closer_3_words": "Casual. Lo-fi. Real.",
        "punch_phrase_by_mood": {
            "party": "Present. Together. Real.",
            "chill": "Quiet. Drifting. Headphones on.",
            "dark": "Quiet. Tense. Locked in.",
        },
    },

    # ========================================================================
    # TRAVIS SCOTT -- Cactus Jack/Desert-noir/Anti-hero
    # ========================================================================
    "travis scott": {
        "hair_directives": (
            "Short braided hair tied back OR shaved sides with longer top "
            "OR loose curly natural hair caught by slight breeze. Always "
            "natural texture, never bleached, never straightened."
        ),
        "thematic_sentence": (
            "Cactus Jack desert-noir aesthetic, psychedelic trap meets "
            "western anti-hero mythology, larger-than-life solitary energy "
            "caught on tape."
        ),
        "masterphrase": (
            "The image feels less like a photograph and more like a "
            "screenshot from a clip saved on someone's phone -- a private "
            "moment from a longer night."
        ),
        "sub_locations": [
            "a remote desert highway at night with parked car headlights "
            "cutting through low rolling dust",
            "an abandoned industrial warehouse with smoke hanging at "
            "knee-height",
            "a Mediterranean cliff at dusk",
            "an empty motel room with neon sign visible through the window",
            "a dirt road with mountains and dust in the distance",
            "an amusement park empty at night with broken rides silhouetted "
            "against a deep sky",
        ],
        "wardrobe_pool": [
            "distressed vintage western shirt half-buttoned over a stained "
            "white tank",
            "worn-in leather vest over bare arms",
            "oversized military surplus jacket in faded olive",
            "dirty cargo pants",
            "beat-up bootcut jeans tucked into worn leather boots",
            "thin gold chain with a small pendant",
            "vintage Rolex or G-Shock loose on the wrist",
            "two silver rings on rough hands",
            "small dark stick-and-poke tattoos scattered on forearms and "
            "knuckles",
            "faded bandana tied around the thigh or hanging from a belt loop",
        ],
        "wardrobe_anchor_phrase": (
            "Anti-hero western meets Cactus Jack merch worn into the ground -- "
            "not posing, caught mid-walk, mid-thought, somewhere he chose to "
            "be alone."
        ),
        "references": [
            "Astroworld and Utopia era visuals",
            "Don Toliver Hardstone Psycho cover work",
            "Cactus Jack desert merch campaigns",
            "candid clips from a friend's hard drive labeled night drives",
            "late-night highway footage",
            "desert phone clips from forgotten gallery folders",
        ],
        "city_anchor": None,
        "closer_3_words": "Imperfect. Mythic. Heavy.",
        "punch_phrase_by_mood": {
            "dark": "Quiet. Mythic. Carrying weight.",
            "flexin": "Larger than life. Suppressed.",
            "sad": "Quiet. Heavy. After something.",
        },
    },
}


# ============================================================================
# Fallback gracioso pra artistas FORA do dicionario.
# Builder usa essa estrutura quando get_universe nao acha o artista --
# capa fica menos calibrada culturalmente mas nao crasha.
# ============================================================================

GENERIC_FALLBACK: dict = {
    "hair_directives": None,  # builder deixa Claude inferir do brief/genero
    "thematic_sentence": None,  # builder usa do genre_dna
    "masterphrase": (
        "The image feels less like a photograph and more like a candid clip "
        "nobody curated -- a private moment from a longer night."
    ),
    "sub_locations": [],  # builder usa genero default ou pula bloco setting
    "wardrobe_pool": [],  # builder usa wardrobe generico do genero
    "wardrobe_anchor_phrase": "Lived-in, real, not posing for the camera.",
    "references": [],  # builder usa references do genero
    "city_anchor": None,
    "closer_3_words": "Imperfect. Real. Heavy.",
    "punch_phrase_by_mood": {},
}


def _normalize(name: Optional[str]) -> str:
    """Lowercase + strip pra lookup no dict."""
    if not name:
        return ""
    return name.strip().lower()


def get_universe(
    artista_primario: str,
    artista_secundario: Optional[str] = None,
) -> dict:
    """Retorna o universo visual pra um artista (ou combinacao de 2).

    Logica:
    - Primario IN dict + secundario None -> retorna primario direto
    - Primario IN dict + secundario IN dict -> retorna merge (sub_locations
      e references unidas; thematic_sentence/masterphrase/wardrobe_anchor
      ficam com o primario)
    - Primario IN dict + secundario fora -> retorna primario direto
    - Primario fora -> retorna GENERIC_FALLBACK (ignora secundario)

    Caller deve sempre receber dict com as mesmas keys (mesmo formato).
    """
    primario_key = _normalize(artista_primario)
    secundario_key = _normalize(artista_secundario)

    primario_data = ARTIST_UNIVERSE.get(primario_key)
    if not primario_data:
        return GENERIC_FALLBACK

    if not secundario_key or secundario_key not in ARTIST_UNIVERSE:
        return primario_data

    # Merge: une sub_locations + references + wardrobe_pool, mantem
    # frase/masterphrase/anchor/closer/city do primario
    secundario_data = ARTIST_UNIVERSE[secundario_key]
    return {
        **primario_data,
        "sub_locations": (
            primario_data["sub_locations"] + secundario_data["sub_locations"]
        ),
        "wardrobe_pool": (
            primario_data["wardrobe_pool"] + secundario_data["wardrobe_pool"]
        ),
        "references": (
            primario_data["references"] + secundario_data["references"]
        ),
    }
