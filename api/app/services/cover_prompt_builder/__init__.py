"""Pacote cover_prompt_builder -- engenharia de prompt da capa IA.

ADR 2026-05-21-prompt-dna-capa-v2.md

Switch atomico (T4.23): exporta o builder v2 (builder.py). legacy.py
foi DELETADO -- pipeline ponta-a-ponta usa o builder novo agora.

Tipos publicos:
    build_cover_prompt(brief: CoverBrief, seed=None, user_id=None) -> BuildResult
    CoverBrief                -- dataclass do brief v2
    VariationAxes             -- dataclass dos 7 eixos sorteados
    BuildResult               -- dataclass do resultado
    normalize_brief(dict) -> dict   -- converte v1 -> v2 se necessario
    parse_brief(dict) -> CoverBrief -- dict -> CoverBrief tipado
"""
from app.services.cover_prompt_builder.brief_converter import (
    normalize_brief,
    parse_brief,
)
from app.services.cover_prompt_builder.builder import build_cover_prompt
from app.services.cover_prompt_builder.types import (
    BuildResult,
    CoverBrief,
    VariationAxes,
)

__all__ = [
    "build_cover_prompt",
    "CoverBrief",
    "VariationAxes",
    "BuildResult",
    "normalize_brief",
    "parse_brief",
]
