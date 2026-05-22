"""Dataclasses do brief v2 + variation axes + build result.

ADR 2026-05-21-prompt-dna-capa-v2.md (secao 9.2)
"""
from dataclasses import dataclass, field
from typing import Literal

GeneroSlug = Literal[
    "trap",
    "underground_trap",
    "drill",
    "plug",
    "rnb",
    "rage",
    "boom_bap",
    "ambient",
    "jersey_club",
    "pop",
    "afrobeats",
]

QuemSlug = Literal[
    "homem_solo",
    "mulher_solo",
    "casal",
    "grupo",
    "sem_pessoa",
    "aleatorio",
]

MoodSlug = Literal[
    "flexin",
    "dark",
    "sad",
    "sexy",
    "party",
    "chill",
]

CenarioSlug = Literal[
    "rua_americana",
    "interior_intimo",
    "interior_luxo",
    "festa_underground",
    "paisagem_urbana",
    "paisagem_aberta",
    "closeup_objeto",
    "lugar_simbolico",
    "aleatorio",
]

AtmosferaLuzSlug = Literal[
    "sol_duro_dia",
    "golden_hour",
    "noite_natural",
    "flash_duro",
    "luz_colorida",
    "meia_luz",
    "aleatorio",
]


@dataclass(frozen=True)
class CoverBrief:
    """Brief v2 do produtor.

    6 campos obrigatorios + 2 opcionais (genero_secundario, artista_secundario)
    + nota_livre opcional.
    """
    genero_primario: GeneroSlug
    artista_primario: str
    quem_aparece: QuemSlug
    mood: MoodSlug
    cenario: CenarioSlug
    atmosfera_luz: AtmosferaLuzSlug
    genero_secundario: GeneroSlug | None = None
    artista_secundario: str | None = None
    nota_livre: str | None = None


@dataclass(frozen=True)
class VariationAxes:
    """7 eixos sorteados em runtime + 3 valores resolvidos de `aleatorio` do brief.

    Persistido em `cover_library.variation_seeds` (JSONB) por capa pra
    debug e analytics futuras.
    """
    resolved_quem: str
    resolved_cenario: str
    resolved_luz: str
    subject_framing: str
    camera_angle: str
    time_of_day: str
    sub_location: str
    secondary_prop: str
    motion_state: str
    film_quirk: str

    def as_dict(self) -> dict:
        return {
            "resolved_quem": self.resolved_quem,
            "resolved_cenario": self.resolved_cenario,
            "resolved_luz": self.resolved_luz,
            "subject_framing": self.subject_framing,
            "camera_angle": self.camera_angle,
            "time_of_day": self.time_of_day,
            "sub_location": self.sub_location,
            "secondary_prop": self.secondary_prop,
            "motion_state": self.motion_state,
            "film_quirk": self.film_quirk,
        }


@dataclass
class BuildResult:
    """Resultado de `build_cover_prompt()`.

    Em sucesso: `prompt_final` populado, `validation_passed=True`.
    Em falha: `prompt_final=None`, `validation_passed=False`,
    `validation_error` com motivo.
    """
    prompt_final: str | None
    variation_seeds: dict = field(default_factory=dict)
    validation_passed: bool = False
    validation_error: str | None = None
    tokens_input: int | None = None
    tokens_output: int | None = None
    cache_read_tokens: int | None = None
    cache_write_tokens: int | None = None
    claude_latency_ms: int | None = None
