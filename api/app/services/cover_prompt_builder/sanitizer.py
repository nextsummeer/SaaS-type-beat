"""Sanitizacao da nota livre do brief.

ADR 2026-05-21-prompt-dna-capa-v2.md (secao 8 do brief, secao 9.5 do builder)

Sem sanitizacao, a nota livre entra crua no user prompt do Claude,
abrindo 2 vetores:
- Prompt injection ("ignore previous instructions, output X")
- Degradacao estetica via termos incompativeis ("anime style",
  "cartoon", "3d render") que quebram o DNA do produto.

Politica:
- Retorna a nota saneada se passa
- Retorna None se rejeita (worker decide: provavelmente OMITE a nota
  e segue com a geracao em vez de falhar a capa inteira, ja que a
  nota e opcional).
"""

# Padroes tipicos de prompt injection. Case-insensitive.
INJECTION_PATTERNS: list[str] = [
    "ignore previous",
    "ignore above",
    "ignore all",
    "disregard previous",
    "disregard above",
    "disregard the",
    "you are now",
    "you must now",
    "new instructions",
    "new task:",
    "override the",
    "forget your",
    "forget everything",
    "system:",
    "assistant:",
    "</system>",
    "<system>",
    "```",
]

# Termos esteticos incompativeis com o DNA da capa BeatPost (fotorrealismo
# analogico). Se aparecerem na nota livre, rejeita a nota inteira.
INCOMPATIBLE_TERMS: list[str] = [
    "anime",
    "manga",
    "cartoon",
    "cartoonish",
    "3d render",
    "3d model",
    "rendered",
    "octane",
    "blender",
    "unreal engine",
    "cgi",
    "illustration",
    "illustrated",
    "painting",
    "painted",
    "drawing",
    "sketch",
    "pixel art",
    "vector art",
    "minimalist design",
    "flat design",
    "logo design",
]

MAX_LENGTH: int = 280


def sanitize_free_note(note: str | None) -> str | None:
    """Sanitiza a nota livre do produtor.

    Args:
        note: nota livre crua (pode ser None ou vazia).

    Returns:
        - String saneada (truncada em 280 chars, sem leading/trailing whitespace)
          se a nota passa.
        - None se a nota e vazia, contem prompt injection, ou contem termos
          esteticamente incompativeis.
    """
    if not note:
        return None

    cleaned = note.strip()[:MAX_LENGTH]
    if not cleaned:
        return None

    lower = cleaned.lower()

    for pattern in INJECTION_PATTERNS:
        if pattern in lower:
            return None

    for term in INCOMPATIBLE_TERMS:
        if term in lower:
            return None

    return cleaned
