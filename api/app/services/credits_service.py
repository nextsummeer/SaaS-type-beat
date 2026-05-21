"""Sistema de creditos por tier para geracao de capa IA.

ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md

Ciclo de 30 dias por user (a partir do signup, renova automaticamente).
Limites em PLAN_LIMITS — editar aqui pra ajustar sem precisar de migration.

Capa manual (upload direto) NAO consome creditos. Apenas geracao IA conta.
"""
import logging
from datetime import datetime, timedelta, timezone

from app.services.supabase_service import get_admin_client

logger = logging.getLogger(__name__)

# Limites de capas IA por ciclo de 30 dias.
# Editar aqui sem precisar de migration.
PLAN_LIMITS: dict[str, int] = {
    "free": 3,
    "intermediate": 15,
    "premium": 40,
    "internal": 999999,  # Tier interno (dono/time) — pratico-ilimitado
}


def _parse_pg_timestamp(ts: str) -> datetime:
    """Converte timestamp ISO do Postgres pra datetime timezone-aware."""
    # Postgres pode retornar com 'Z' ou '+00:00'
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def _reset_cycle_if_needed(user_id: str, profile: dict) -> dict:
    """Se passou da data de reset, zera contador e soma +30 dias.

    Atualiza o profile no banco e retorna profile atualizado (used, reset_at).
    Lida com user inativo por varios ciclos (adianta multiplos +30 dias ate
    bater no futuro).
    """
    reset_at = _parse_pg_timestamp(profile["credits_reset_at"])
    now = datetime.now(timezone.utc)

    if now < reset_at:
        return profile

    new_reset_at = reset_at + timedelta(days=30)
    while new_reset_at <= now:
        new_reset_at += timedelta(days=30)

    client = get_admin_client()
    client.table("user_profiles").update({
        "credits_used_this_month": 0,
        "credits_reset_at": new_reset_at.isoformat(),
    }).eq("user_id", user_id).execute()

    logger.info(
        "credits_service: ciclo resetado para user=%s, novo reset_at=%s",
        user_id, new_reset_at.isoformat(),
    )

    return {
        **profile,
        "credits_used_this_month": 0,
        "credits_reset_at": new_reset_at.isoformat(),
    }


def get_remaining(user_id: str) -> dict:
    """Estado atual dos creditos do user. Reseta o ciclo se necessario.

    Returns:
        dict com:
            tier: 'free' | 'intermediate' | 'premium'
            limit: capas por ciclo
            used: consumidas no ciclo atual
            remaining: limit - used
            reset_at: ISO timestamp do proximo reset
    """
    client = get_admin_client()
    resp = client.table("user_profiles").select(
        "tier, credits_used_this_month, credits_reset_at"
    ).eq("user_id", user_id).maybe_single().execute()

    if not resp or not resp.data:
        logger.error("credits_service: user_profile nao encontrado user=%s", user_id)
        return {
            "tier": "free",
            "limit": 0,
            "used": 0,
            "remaining": 0,
            "reset_at": None,
        }

    profile = _reset_cycle_if_needed(user_id, resp.data)

    tier = profile["tier"]
    used = profile["credits_used_this_month"]
    limit = PLAN_LIMITS.get(tier, 0)

    return {
        "tier": tier,
        "limit": limit,
        "used": used,
        "remaining": max(0, limit - used),
        "reset_at": profile["credits_reset_at"],
    }


def consume(user_id: str, n: int = 1) -> dict:
    """Consome N creditos do user. Verifica e incrementa.

    NOTA MVP: nao e atomico (UPDATE simples, nao UPDATE conditional).
    Se 2 requests baterem no mesmo milissegundo pode passar mais que limit
    em casos extremos. Aceitavel pro MVP — frontend ja serializa com o
    lote unico. Se virar problema, migrar pra RPC com lock.

    Returns:
        dict com:
            ok: True se consumiu, False se nao tinha credito
            remaining: creditos restantes (apos consumo se ok, ou atual se nao)
            needed: so quando ok=False — quantos eram pedidos
    """
    state = get_remaining(user_id)

    if state["remaining"] < n:
        logger.info(
            "credits_service: insuficiente. user=%s tier=%s remaining=%s needed=%s",
            user_id, state["tier"], state["remaining"], n,
        )
        return {
            "ok": False,
            "remaining": state["remaining"],
            "needed": n,
        }

    new_used = state["used"] + n
    client = get_admin_client()
    client.table("user_profiles").update({
        "credits_used_this_month": new_used,
    }).eq("user_id", user_id).execute()

    new_remaining = state["limit"] - new_used
    logger.info(
        "credits_service: consumido. user=%s n=%s remaining=%s",
        user_id, n, new_remaining,
    )

    return {
        "ok": True,
        "remaining": new_remaining,
    }
