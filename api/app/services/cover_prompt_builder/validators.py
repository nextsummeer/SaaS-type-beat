"""Validators do prompt final retornado pelo Claude.

ADR 2026-05-21-prompt-dna-capa-v2.md (secao 9.4)

6 validacoes (estrutura 7 blocos descartada por ser ruidosa demais
contra falsos positivos -- sera reavaliada se necessario):

1. Comprimento 1500-4000 chars (~300-600 palavras)
2. Likeness -- nome direto (case-insensitive, primario E secundario)
3. Likeness -- apelidos por artista popular (blocklist inicial)
4. Likeness -- frases-ancora genericas
5. AVOID block presente no fim (WARNING-MODE: loga mas aceita output)
6. Anti-aesthetics inline (corpo nao pode conter termos proibidos)

Pra estender a blocklist de apelidos, basta adicionar entradas a
ARTIST_NICKNAMES (chave em lowercase, lista de apelidos em lowercase).
"""
from dataclasses import dataclass, field

from app.services.cover_prompt_builder.types import CoverBrief

# Tamanho do prompt final esperado (chars). 300-600 palavras ~= 1500-4000 chars.
MIN_LENGTH: int = 1500
MAX_LENGTH: int = 4000


# Blocklist inicial de apelidos por artista popular (lowercase).
# Versao MINIMA: 6 artistas. Expandir conforme uso real cresce.
ARTIST_NICKNAMES: dict[str, list[str]] = {
    "drake": [
        "drizzy",
        "champagne papi",
        "champagne poppy",
        "6 god",
        "six god",
        "the boy from toronto",
        "the boy from the 6",
        "ovo sound",
        "ovo legend",
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
        "compton legend",
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
    "21 savage": [
        "she.iy.shyaa",
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

# Termos esteticamente proibidos no CORPO do prompt (fora do bloco AVOID:).
ANTI_AESTHETICS_INLINE: list[str] = [
    "porcelain skin",
    "porcelain",
    "studio lighting",
    "studio lights",
    "ring light",
    "softbox",
    "three-point lighting",
    "cinematic bokeh",
    "planned bokeh",
    "glowing border",
    "glowing vignette",
    "soft border",
    "halo effect",
    "smooth flawless",
    "flawless skin",
    "perfect symmetry",
    "3d render",
    "3d model",
    "cgi look",
    "octane render",
    "anime",
    "cartoon",
    "illustration",
    "digital painting",
]


@dataclass
class ValidationResult:
    """Resultado de `validate_prompt()`.

    `ok=False` indica falha hard (worker marca capa como `failed`).
    `warnings` sao avisos nao-bloqueantes (loga mas aceita output).
    """
    ok: bool
    error: str | None = None
    warnings: list[str] = field(default_factory=list)


def validate_prompt(prompt: str, brief: CoverBrief) -> ValidationResult:
    """Roda as 6 validacoes do prompt final retornado pelo Claude.

    Args:
        prompt: prompt final stripped.
        brief: brief usado pra gerar (precisamos do nome do artista pra
               checar likeness).

    Returns:
        ValidationResult com ok=True/False, error opcional, warnings.
    """
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
                error=f"prompt cita o nome do artista '{name}' diretamente (likeness violado)",
            )

    # 3. Likeness -- apelidos por artista
    for name in (brief.artista_primario, brief.artista_secundario):
        if not name:
            continue
        nicknames = ARTIST_NICKNAMES.get(name.lower(), [])
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

    # 5. AVOID block (WARNING-MODE -- nao bloqueia)
    # Em 2026-05-28 (1 semana apos deploy) reavaliar e virar hard-fail.
    if "AVOID:" not in prompt and "Avoid:" not in prompt and "avoid:" not in prompt:
        warnings.append(
            "output nao tem bloco AVOID: explicito (warning-mode, nao bloqueante)"
        )

    # 6. Anti-aesthetics inline (no CORPO, fora do bloco AVOID)
    body_lower = _extract_body_before_avoid(prompt).lower()
    for term in ANTI_AESTHETICS_INLINE:
        if term in body_lower:
            return ValidationResult(
                ok=False,
                error=f"corpo do prompt contem termo anti-aesthetic '{term}' "
                f"(deveria estar so no bloco AVOID:, nao na descricao)",
            )

    return ValidationResult(ok=True, warnings=warnings)


def _has_artist_name(prompt_lower: str, artist_name: str) -> bool:
    """True se o prompt menciona o nome (completo ou palavras de 4+ chars).

    Mesma logica do legacy mas adaptada.
    """
    name_lower = artist_name.strip().lower()
    if not name_lower:
        return False

    if name_lower in prompt_lower:
        return True

    for word in name_lower.split():
        if len(word) >= 4 and word in prompt_lower:
            return True

    return False


def _extract_body_before_avoid(prompt: str) -> str:
    """Retorna so a parte do prompt ANTES do bloco AVOID:.

    Cada checagem de anti-aesthetics roda contra essa parte -- o bloco
    AVOID: e onde os termos proibidos APARECEM intencionalmente.
    """
    for marker in ("AVOID:", "Avoid:", "avoid:"):
        if marker in prompt:
            return prompt.split(marker, 1)[0]
    return prompt
