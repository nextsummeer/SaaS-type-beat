"""Validators v3 do prompt final retornado pelo Claude.

ADR 2026-05-22-prompt-dna-capa-v3.md (secao 6)

5 validacoes (estrutura 7 blocos e AVOID block descartados):

1. Comprimento 1500-3500 chars
2. Likeness -- nome direto (case-insensitive, primario E secundario)
3. Likeness -- apelidos por artista popular (blocklist)
4. Likeness -- frases-ancora genericas
5. Palavras banidas (BANNED_WORDS de prompt_skeleton)
6. References banidas (BANNED_REFERENCES de prompt_skeleton)

Pra estender blocklist de apelidos: adicionar entradas a ARTIST_NICKNAMES.
"""
from dataclasses import dataclass, field

from app.services.cover_prompt_builder.prompt_skeleton import (
    BANNED_REFERENCES,
    BANNED_WORDS,
)
from app.services.cover_prompt_builder.types import CoverBrief

# Faixa de comprimento esperada do prompt final (chars).
# Sonnet 4.6 com temperature 0.9 e user_prompt rico expande cada
# elemento do 12-element structure -- prompts reais em prod saem em
# 6000-8000 chars (acima dos prompts validados manualmente pelo
# Gustavo, que ficaram 2700-4800). MAX setado alto pra nao bloquear
# capas boas. Se gpt-image-2 nao aceitar prompts tao longos, vai
# aparecer erro especifico do fal.ai e a gente corta o user_prompt.
# 3a calibragem em 2026-05-22 apos rejeitar prompts de 6924 e 7367.
MIN_LENGTH: int = 1500
MAX_LENGTH: int = 8000


# Blocklist inicial de apelidos por artista popular (lowercase).
ARTIST_NICKNAMES: dict[str, list[str]] = {
    "drake": [
        "drizzy",
        "champagne papi",
        "champagne poppy",
        "6 god",
        "six god",
        "the boy from toronto",
        "the boy from the 6",
        "ovo legend",
    ],
    "the weeknd": [
        "abel tesfaye",
        "starboy",
        "xo legend",
    ],
    "kendrick lamar": [
        "k dot",
        "kdot",
        "kung fu kenny",
        "compton legend",
        "mr morale",
    ],
    "kendrick": [
        "k dot",
        "kdot",
        "kung fu kenny",
    ],
    "future": [
        "pluto",
        "hndrxx",
        "future hendrix",
    ],
    "playboi carti": [
        "king vamp",
        "opium leader",
    ],
    "carti": [
        "king vamp",
        "opium leader",
    ],
    "lil baby": [
        "dominique armani",
        "4pf",
    ],
    "travis scott": [
        "la flame",
        "cactus jack legend",
    ],
    "21 savage": [
        "savage mode",
    ],
}

# Frases-ancora genericas que identificam "um artista" sem citar o nome.
GENERIC_LIKENESS_PHRASES: list[str] = [
    "the artist from",
    "the rapper from",
    "the singer from",
    "the famous rapper",
    "the iconic rapper",
    "the legendary rapper",
    "the famous artist",
    "the iconic artist",
    "the legendary artist",
    "the famous singer",
    "the iconic singer",
]


@dataclass
class ValidationResult:
    """Resultado de validate_prompt.

    `ok=False` indica falha hard (worker marca capa como `failed`).
    `warnings` sao avisos nao-bloqueantes (loga mas aceita output).
    """
    ok: bool
    error: str | None = None
    warnings: list[str] = field(default_factory=list)


def validate_prompt(prompt: str, brief: CoverBrief) -> ValidationResult:
    """Roda 5 validacoes do prompt final retornado pelo Claude (v3)."""
    warnings: list[str] = []

    # 1. Comprimento
    if not (MIN_LENGTH <= len(prompt) <= MAX_LENGTH):
        return ValidationResult(
            ok=False,
            error=f"prompt fora da faixa {MIN_LENGTH}-{MAX_LENGTH} chars (atual: {len(prompt)})",
        )

    prompt_lower = prompt.lower()

    # 2. Likeness -- nome direto (primario E secundario)
    for name in (brief.artista_primario, brief.artista_secundario):
        if name and _has_artist_name(prompt_lower, name):
            return ValidationResult(
                ok=False,
                error=f"prompt cita nome do artista '{name}' diretamente (likeness violado)",
            )

    # 3. Likeness -- apelidos por artista
    for name in (brief.artista_primario, brief.artista_secundario):
        if not name:
            continue
        nicknames = ARTIST_NICKNAMES.get(name.strip().lower(), [])
        for nick in nicknames:
            if nick in prompt_lower:
                return ValidationResult(
                    ok=False,
                    error=f"prompt cita apelido '{nick}' do artista '{name}' (likeness violado)",
                )

    # 4. Likeness -- frases-ancora genericas
    for phrase in GENERIC_LIKENESS_PHRASES:
        if phrase in prompt_lower:
            return ValidationResult(
                ok=False,
                error=f"prompt usa frase-ancora generica '{phrase}' (likeness violado)",
            )

    # 5. Palavras banidas (v3 -- estetica polida)
    for word in BANNED_WORDS:
        if word in prompt_lower:
            return ValidationResult(
                ok=False,
                error=f"prompt contem palavra banida '{word}' (dispara estetica cinematografica polida)",
            )

    # 6. References banidas (cinematografos / editorial fashion)
    for ref in BANNED_REFERENCES:
        if ref in prompt_lower:
            return ValidationResult(
                ok=False,
                error=f"prompt contem reference banida '{ref}' (cinematografo / editorial fashion)",
            )

    return ValidationResult(ok=True, warnings=warnings)


def _has_artist_name(prompt_lower: str, artist_name: str) -> bool:
    """True se prompt menciona o nome (completo ou palavras de 4+ chars)."""
    name_lower = artist_name.strip().lower()
    if not name_lower:
        return False

    if name_lower in prompt_lower:
        return True

    for word in name_lower.split():
        if len(word) >= 4 and word in prompt_lower:
            return True

    return False
