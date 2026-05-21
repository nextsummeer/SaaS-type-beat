"""Helpers de validacao de limites pros brief_presets por tier.

ADR 2026-05-21 atualizada: substitui user_profiles.default_brief unico
por multiplos presets nomeados (max varia por plano).
"""
import logging

from app.services.supabase_service import get_admin_client

logger = logging.getLogger(__name__)

# Limites de briefs por tier. -1 significa ilimitado.
PRESET_LIMITS: dict[str, int] = {
    "free": 1,
    "intermediate": 5,
    "premium": -1,
    "internal": -1,  # Tier interno (dono/time) — ilimitado
}


def get_user_tier(user_id: str) -> str:
    """Retorna o tier do user (free/intermediate/premium). Default free se nao achar."""
    client = get_admin_client()
    resp = (
        client.table("user_profiles")
        .select("tier")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    data = resp.data if resp else None
    return (data or {}).get("tier") or "free"


def count_user_presets(user_id: str) -> int:
    """Conta quantos brief_presets o user tem."""
    client = get_admin_client()
    resp = (
        client.table("brief_presets")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    return resp.count or 0


def can_create_more(user_id: str) -> tuple[bool, int, int]:
    """Verifica se user pode criar mais 1 brief preset.

    Returns:
        (pode_criar, atual, limite). limite=-1 se ilimitado.
    """
    tier = get_user_tier(user_id)
    limit = PRESET_LIMITS.get(tier, 1)
    atual = count_user_presets(user_id)
    if limit == -1:
        return True, atual, -1
    return atual < limit, atual, limit
