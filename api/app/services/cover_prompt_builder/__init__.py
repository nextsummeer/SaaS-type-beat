"""Pacote cover_prompt_builder — engenharia de prompt da capa IA.

ADR 2026-05-21-prompt-dna-capa-v2.md

Durante a transicao T4.19 → T4.21, este __init__ re-exporta o builder
LEGACY (legacy.py). Quando T4.21 entregar o builder v2 em builder.py,
trocar a importacao em 1 linha:

    from app.services.cover_prompt_builder.builder import build_cover_prompt

e deletar legacy.py.

Apos T4.21, este modulo tambem deve exportar:
    CoverBrief, VariationAxes, BuildResult (vindos de types.py)
"""
from app.services.cover_prompt_builder.legacy import build_cover_prompt

__all__ = ["build_cover_prompt"]
