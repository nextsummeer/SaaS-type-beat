"""Pacote cover_prompt_builder -- engenharia de prompt da capa IA (v3).

ADR 2026-05-22-prompt-dna-capa-v3.md

Tipos publicos:
    build_cover_prompt(brief, seed=None, user_id=None, force_variation=False)
        -> BuildResult
    CoverBrief                -- dataclass do brief v3 (sem cenario)
    VariationAxes             -- dataclass legacy v2, preservado pra
                                 compat (nao usado pelo builder v3)
    BuildResult               -- dataclass do resultado
    normalize_brief(dict)     -- converte v1 -> v2 (back-compat)
    parse_brief(dict)         -- dict -> CoverBrief tipado
"""
from app.services.cover_prompt_builder.brief_converter import (
    normalize_brief,
    parse_brief,
)
from app.services.cover_prompt_builder.builder import build_cover_prompt
from app.services.cover_prompt_builder.types import (
    BuildResult,
    CoverBrief,
)

__all__ = [
    "build_cover_prompt",
    "CoverBrief",
    "BuildResult",
    "normalize_brief",
    "parse_brief",
]
