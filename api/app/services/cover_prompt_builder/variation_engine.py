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

from app.services.cover_prompt_builder.prompt_skeleton import (
    FRAMING_POOL,
    POSE_POOL,
    _is_underground,
)
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


def _available_after_recent(
    pool: list[str], recent_seeds: list[dict], key: str
) -> list[str]:
    """Remove do `pool` os itens ja usados nas `recent_seeds` (campo `key`).

    Se a filtragem esvaziar o pool (tudo foi usado recentemente), devolve o
    pool inteiro -- melhor repetir que travar. Anti-repeticao degrada com
    gracia em pools pequenos.
    """
    if not recent_seeds:
        return pool
    recently_used = {s.get(key) for s in recent_seeds if s.get(key)}
    available = [item for item in pool if item not in recently_used]
    return available or pool


def sample_for_brief(
    brief: CoverBrief,
    universe: dict,
    force_variation: bool = False,
    recent_seeds: Optional[list[dict]] = None,
    seed: Optional[int] = None,
) -> dict:
    """Sorteia variation_seeds pro brief.

    Sorteia 3 eixos visuais: sub_location (do universo do artista), framing
    (pool fixo, sempre) e pose (pool fixo, apenas quando ha figura humana).
    O Python sorteia; o Claude apenas expande/integra a escolha -- isso
    garante variacao REAL entre cliques (determinismo via seed), ao contrario
    de deixar o Claude "escolher" (chamadas independentes convergem pro mesmo).

    Args:
        brief: CoverBrief tipado.
        universe: dict retornado por `artist_universe.get_universe()`.
        force_variation: se True, exclui sub_location/pose/framing das
            ultimas N capas (anti-repeticao).
        recent_seeds: lista das ultimas N variation_seeds (de fetch_recent_seeds).
        seed: opcional, pra sorteio deterministico (util em testes).

    Returns:
        Dict que sera persistido em `cover_library.variation_seeds` JSONB:
        {
            "sub_location_chosen": str | None,
            "pose_chosen": str | None,        # None quando sem_pessoa
            "framing_chosen": str,
            "lighting_setup_slug": str,
            "underground_camera": bool,
            "mood_used": str,
            "artist_primario": str,
        }
    """
    rng = random.Random(seed)
    # Anti-repeticao so vale no botao "Gerar variacao" (force_variation).
    recent = recent_seeds if (force_variation and recent_seeds) else None

    # Sub-location: sorteia do universo do artista (vazio = fallback no prompt).
    sub_locations = _available_after_recent(
        list(universe.get("sub_locations") or []), recent, "sub_location_chosen"
    )
    chosen_sub_location = rng.choice(sub_locations) if sub_locations else None

    # Framing: sempre se aplica (com ou sem pessoa).
    framing_pool = _available_after_recent(FRAMING_POOL, recent, "framing_chosen")
    chosen_framing = rng.choice(framing_pool)

    # Pose: apenas quando ha figura humana na capa.
    tem_pessoa = brief.quem_aparece != "sem_pessoa"
    if tem_pessoa:
        pose_pool = _available_after_recent(POSE_POOL, recent, "pose_chosen")
        chosen_pose = rng.choice(pose_pool)
    else:
        chosen_pose = None

    return {
        "sub_location_chosen": chosen_sub_location,
        "pose_chosen": chosen_pose,
        "framing_chosen": chosen_framing,
        "lighting_setup_slug": brief.atmosfera_luz,
        "underground_camera": _is_underground(brief),
        "mood_used": brief.mood,
        "artist_primario": brief.artista_primario,
    }
