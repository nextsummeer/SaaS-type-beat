"""Conversor brief v1 (legacy) -> v2 (DNA v2) em Python.

Mesma logica da funcao PL/pgSQL da migration 019, usada server-side nos
routes que recebem requests do frontend antigo enquanto a T4.24 nao
atualizou o wizard.

Quando wizard v2 entregar e validarmos, este conversor continua valido
como defesa em profundidade (ex: clients antigos em cache, requests
de scripts externos).

ADR 2026-05-21-prompt-dna-capa-v2.md (secao 10 -- mapeamentos)
"""
import logging

from app.services.cover_prompt_builder.types import CoverBrief

logger = logging.getLogger(__name__)


_SUJEITO_MAP: dict[str, str] = {
    "jovem": "homem_solo",
    "mulher": "mulher_solo",
    "grupo": "grupo",
    "sem_pessoa": "sem_pessoa",
    "so_objeto": "sem_pessoa",
}

_ILUMINACAO_MAP: dict[str, str] = {
    "sol_duro": "sol_duro_dia",
    "golden_hour": "golden_hour",
    "vermelho": "luz_colorida",
    "azul_neon": "luz_colorida",
    "noturno": "noite_natural",
    "vintage": "meia_luz",
}

_ENERGIA_MAP: dict[str, str] = {
    "agressivo": "dark",
    "melancolico": "sad",
    "sexy": "sexy",
    "hood_famous": "flexin",
    "atmosferico": "chill",
    "festa": "party",
}

DEFAULT_GENERO_PRIMARIO: str = "trap"
DEFAULT_ARTISTA: str = "Lil Baby"
DEFAULT_QUEM: str = "homem_solo"
DEFAULT_MOOD: str = "flexin"
DEFAULT_LUZ: str = "golden_hour"


def is_v1(brief: dict) -> bool:
    """True se o dict tem chaves do brief v1 e NAO tem genero_primario."""
    if not isinstance(brief, dict):
        return False
    if "genero_primario" in brief:
        return False
    v1_keys = {"sujeito", "ambiente", "iluminacao", "energia", "artista_nome"}
    return any(k in brief for k in v1_keys)


def has_cenario_legacy(brief: dict) -> bool:
    """True se brief tem o campo `cenario` que saiu na v3."""
    return isinstance(brief, dict) and "cenario" in brief


def convert_v1_to_v2(brief_v1: dict) -> dict:
    """Converte brief v1 -> v2 (mesma logica do SQL migration 019).

    Defaults aplicados quando key v1 ausente ou valor desconhecido:
    genero_primario='trap' (Gustavo validou), artista='Lil Baby',
    quem='homem_solo', mood='flexin', cenario='rua_americana',
    luz='golden_hour'.
    """
    return {
        "genero_primario": DEFAULT_GENERO_PRIMARIO,
        "genero_secundario": None,
        "artista_primario": (brief_v1.get("artista_nome") or DEFAULT_ARTISTA).strip(),
        "artista_secundario": None,
        "quem_aparece": _SUJEITO_MAP.get(brief_v1.get("sujeito"), DEFAULT_QUEM),
        "mood": _ENERGIA_MAP.get(brief_v1.get("energia"), DEFAULT_MOOD),
        "atmosfera_luz": _ILUMINACAO_MAP.get(brief_v1.get("iluminacao"), DEFAULT_LUZ),
        "nota_livre": brief_v1.get("nota_livre"),
    }


def normalize_brief(brief: dict) -> dict:
    """Garante que o dict esta no formato v2 (converte se for v1).

    Use isso ANTES de salvar no banco ou passar pro builder novo.
    Loga warning quando conversao acontece.
    """
    if is_v1(brief):
        logger.warning(
            "brief_converter: brief recebido em formato v1, convertendo "
            "server-side (back-compat -- esperado ate wizard v2 entregar). "
            "keys recebidas=%s",
            sorted(brief.keys()),
        )
        return convert_v1_to_v2(brief)
    return brief


def parse_brief(brief: dict) -> CoverBrief:
    """Recebe dict (v1 ou v2) e retorna CoverBrief tipado pro builder.

    Lanca ValueError se brief invalido (campos obrigatorios faltando
    apos normalizacao).
    """
    normalized = normalize_brief(brief)

    artista = (normalized.get("artista_primario") or "").strip()
    if not artista:
        raise ValueError("artista_primario obrigatorio")
    if not normalized.get("genero_primario"):
        raise ValueError("genero_primario obrigatorio")

    # V3 removeu `cenario`. Ignora silenciosamente se vier no dict
    # (briefs antigos do banco passam sem crash).
    return CoverBrief(
        genero_primario=normalized["genero_primario"],
        genero_secundario=normalized.get("genero_secundario"),
        artista_primario=artista,
        artista_secundario=(normalized.get("artista_secundario") or None),
        quem_aparece=normalized.get("quem_aparece") or DEFAULT_QUEM,
        mood=normalized.get("mood") or DEFAULT_MOOD,
        atmosfera_luz=normalized.get("atmosfera_luz") or DEFAULT_LUZ,
        nota_livre=normalized.get("nota_livre"),
    )
