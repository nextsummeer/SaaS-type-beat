"""Sorteio de variation seeds + anti-repeticao via query DB.

ADR 2026-05-22-prompt-dna-capa-v3.md (secao 5)

Diferente da v2 (7 eixos independentes em Python), a v3 simplifica:
o builder sorteia APENAS a sub_location dentro do universe do artista,
e o Sonnet 4.6 cuida do resto da variacao (optional details, body
language nuances, palette adjustments) gerando texto rico a partir
da seed.

Anti-repeticao: quando `force_variation=True` (botao "Gerar variacao"),
exclui sub_locations das ultimas 5 capas do mesmo user+artista que
estao em estado 'ready' com variation_seeds populadas.
"""
import logging
import random
from typing import Optional

from app.services.cover_prompt_builder.prompt_skeleton import _is_underground
from app.services.cover_prompt_builder.types import CoverBrief

logger = logging.getLogger(__name__)

# Quantas variation_seeds recentes carregar pra anti-repeticao
RECENT_SEEDS_LIMIT: int = 5
# Quantas rows totais buscar do DB pra filtrar por artista em Python
DB_FETCH_LIMIT: int = 30


def fetch_recent_seeds(
    user_id: str,
    artista_primario: str,
    limit: int = RECENT_SEEDS_LIMIT,
) -> list[dict]:
    """Retorna lista das ultimas N variation_seeds JSONB do user pra esse
    artista, ordenadas mais recente primeiro.

    Sem capas geradas anteriormente -> retorna [].
    Falha de query -> retorna [] (anti-repeticao degradada nao quebra fluxo).
    """
    from app.services.supabase_service import get_admin_client

    target_artist = (artista_primario or "").strip().lower()
    if not target_artist or not user_id:
        return []

    try:
        client = get_admin_client()
        result = (
            client.table("cover_library")
            .select("brief_used, variation_seeds")
            .eq("user_id", user_id)
            .eq("status", "ready")
            .not_.is_("variation_seeds", "null")
            .order("created_at", desc=True)
            .limit(DB_FETCH_LIMIT)
            .execute()
        )
    except Exception as exc:
        logger.warning("variation_engine: falha ao buscar recent seeds: %s", exc)
        return []

    matched: list[dict] = []
    for row in (result.data or []):
        brief_used = row.get("brief_used") or {}
        row_artist = (brief_used.get("artista_primario") or "").strip().lower()
        if row_artist == target_artist:
            seeds = row.get("variation_seeds")
            if seeds:
                matched.append(seeds)
            if len(matched) >= limit:
                break

    return matched


def sample_for_brief(
    brief: CoverBrief,
    universe: dict,
    force_variation: bool = False,
    recent_seeds: Optional[list[dict]] = None,
    seed: Optional[int] = None,
) -> dict:
    """Sorteia variation_seeds pro brief.

    Args:
        brief: CoverBrief tipado.
        universe: dict retornado por `artist_universe.get_universe()`.
        force_variation: se True, exclui sub_locations das ultimas 3-5 capas.
        recent_seeds: lista das ultimas N variation_seeds (de fetch_recent_seeds).
        seed: opcional, pra sorteio deterministico (uteis em testes).

    Returns:
        Dict que sera persistido em `cover_library.variation_seeds` JSONB:
        {
            "sub_location_chosen": str | None,
            "lighting_setup_slug": str,
            "underground_camera": bool,
            "mood_used": str,
            "artist_primario": str,
        }
    """
    rng = random.Random(seed)
    sub_locations: list[str] = list(universe.get("sub_locations") or [])

    # Anti-repeticao: filtra sub_locations das ultimas N capas
    if force_variation and recent_seeds:
        recently_used = {
            s.get("sub_location_chosen")
            for s in recent_seeds
            if s.get("sub_location_chosen")
        }
        available = [loc for loc in sub_locations if loc not in recently_used]
        # Fallback: se TUDO foi recentemente usado, libera o pool inteiro
        # (melhor repetir que travar)
        if available:
            sub_locations = available
        else:
            logger.info(
                "variation_engine: todas as %d sub_locations foram usadas "
                "recentemente, liberando pool completo (force_variation degrada)",
                len(sub_locations),
            )

    chosen_sub_location = rng.choice(sub_locations) if sub_locations else None

    return {
        "sub_location_chosen": chosen_sub_location,
        "lighting_setup_slug": brief.atmosfera_luz,
        "underground_camera": _is_underground(brief),
        "mood_used": brief.mood,
        "artist_primario": brief.artista_primario,
    }
