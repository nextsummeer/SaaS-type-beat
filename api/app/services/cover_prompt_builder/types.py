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
    """Brief v3 do produtor.

    5 campos obrigatorios + 2 opcionais (genero_secundario, artista_secundario)
    + nota_livre opcional. V3 removeu campo `cenario` -- Claude infere do
    universo do artista (sub-location sorteada do artist_universe).
    """
    genero_primario: GeneroSlug
    artista_primario: str
    quem_aparece: QuemSlug
    mood: MoodSlug
    atmosfera_luz: AtmosferaLuzSlug
    genero_secundario: GeneroSlug | None = None
    artista_secundario: str | None = None
    nota_livre: str | None = None


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
