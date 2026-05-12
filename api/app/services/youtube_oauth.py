import os
import base64
import hashlib
import hmac
import json
import time
import logging
from typing import Optional
from urllib.parse import urlencode

import requests

from app.services.supabase_service import get_admin_client

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels"

YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload"
YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly"
REQUESTED_SCOPES = f"{YOUTUBE_UPLOAD_SCOPE} {YOUTUBE_READONLY_SCOPE}"

STATE_TTL_SECONDS = 600


def _client_id() -> str:
    return os.environ["GOOGLE_OAUTH_CLIENT_ID"]


def _client_secret() -> str:
    return os.environ["GOOGLE_OAUTH_CLIENT_SECRET"]


def _redirect_uri() -> str:
    return os.environ["GOOGLE_OAUTH_REDIRECT_URI"]


def _state_secret() -> bytes:
    secret = os.environ.get("OAUTH_STATE_SECRET") or os.environ["SUPABASE_VAULT_KEY"]
    return secret.encode("utf-8")


def _vault_key() -> str:
    return os.environ["SUPABASE_VAULT_KEY"]


def encode_state(user_id: str) -> str:
    """Assina um state com user_id + expiração. Stateless, sem cookie."""
    payload = {"u": user_id, "e": int(time.time()) + STATE_TTL_SECONDS}
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    body = base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")
    sig = hmac.new(_state_secret(), body.encode("ascii"), hashlib.sha256).digest()
    tag = base64.urlsafe_b64encode(sig).rstrip(b"=").decode("ascii")
    return f"{body}.{tag}"


def decode_state(state: str) -> str:
    """Valida o state e retorna o user_id. Lança ValueError se inválido/expirado."""
    try:
        body, tag = state.split(".", 1)
    except ValueError as exc:
        raise ValueError("state malformado") from exc

    expected_sig = hmac.new(_state_secret(), body.encode("ascii"), hashlib.sha256).digest()
    received_sig = base64.urlsafe_b64decode(tag + "=" * (-len(tag) % 4))
    if not hmac.compare_digest(expected_sig, received_sig):
        raise ValueError("state com assinatura inválida")

    raw = base64.urlsafe_b64decode(body + "=" * (-len(body) % 4))
    payload = json.loads(raw)
    if payload.get("e", 0) < int(time.time()):
        raise ValueError("state expirado")
    user_id = payload.get("u")
    if not user_id:
        raise ValueError("state sem user_id")
    return user_id


def build_auth_url(user_id: str) -> str:
    params = {
        "client_id": _client_id(),
        "redirect_uri": _redirect_uri(),
        "response_type": "code",
        "scope": REQUESTED_SCOPES,
        "access_type": "offline",
        "prompt": "consent select_account",
        "include_granted_scopes": "true",
        "state": encode_state(user_id),
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


def exchange_code(code: str) -> dict:
    """Troca o authorization code por tokens. Retorna {access_token, refresh_token, expires_in, scope}."""
    resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": _client_id(),
            "client_secret": _client_secret(),
            "redirect_uri": _redirect_uri(),
            "grant_type": "authorization_code",
        },
        timeout=15,
    )
    if not resp.ok:
        logger.error("Falha no exchange code: %s %s", resp.status_code, resp.text)
        raise RuntimeError(f"Google rejeitou o code: {resp.status_code}")
    return resp.json()


def get_channel_info(access_token: str) -> Optional[dict]:
    """Retorna {channel_id, channel_title} do canal do user, ou None.

    Tenta múltiplas estratégias pra cobrir contas comuns + Brand Accounts:
      1) channels.list?mine=true            (canal default da conta autenticada)
      2) channels.list?managedByMe=true     (canais gerenciados via Brand)
    Loga response completo em ambos pra debug.
    """
    strategies = [
        ("mine", {"part": "snippet", "mine": "true"}),
        ("managedByMe", {"part": "snippet", "managedByMe": "true"}),
    ]

    for label, params in strategies:
        resp = requests.get(
            YOUTUBE_CHANNELS_URL,
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        logger.warning(
            "[YT_DEBUG] channels.list strategy=%s status=%s body=%s",
            label,
            resp.status_code,
            resp.text[:1500],
        )
        if not resp.ok:
            continue
        items = resp.json().get("items", [])
        if items:
            item = items[0]
            return {
                "channel_id": item["id"],
                "channel_title": item.get("snippet", {}).get("title", "Canal sem nome"),
            }

    logger.warning("Nenhuma estratégia de channels.list retornou items")
    return None


def revoke_token(token: str) -> None:
    """Revoga o token no Google. Best-effort: silencia erro."""
    try:
        requests.post(
            GOOGLE_REVOKE_URL,
            data={"token": token},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
    except Exception as exc:
        logger.warning("Falha ao revogar token: %s", exc)


def save_account(
    user_id: str,
    channel_id: str,
    channel_title: str,
    refresh_token: str,
    access_token: str,
    expires_in: int,
    scopes: list[str],
) -> str:
    """Salva (upsert) o canal via função SQL com pgp_sym_encrypt. Retorna o id da row."""
    from datetime import datetime, timedelta, timezone

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    client = get_admin_client()
    result = client.rpc(
        "upsert_youtube_account",
        {
            "p_user_id": user_id,
            "p_channel_id": channel_id,
            "p_channel_title": channel_title,
            "p_refresh_token": refresh_token,
            "p_access_token": access_token,
            "p_access_token_expires_at": expires_at.isoformat(),
            "p_scopes": scopes,
            "p_vault_key": _vault_key(),
        },
    ).execute()
    return result.data


def get_connected_account(user_id: str) -> Optional[dict]:
    """Retorna {channel_id, channel_title, connected_at} ou None."""
    client = get_admin_client()
    result = (
        client.table("youtube_accounts")
        .select("channel_id, channel_title, created_at, updated_at")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        return None
    row = result.data[0]
    return {
        "channel_id": row["channel_id"],
        "channel_title": row["channel_title"],
        "connected_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def disconnect_account(user_id: str) -> bool:
    """Revoga e remove o canal conectado. Retorna True se algo foi removido."""
    client = get_admin_client()
    row_result = (
        client.table("youtube_accounts")
        .select("access_token")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not row_result.data:
        return False

    access_token = row_result.data[0].get("access_token")
    if access_token:
        revoke_token(access_token)

    client.table("youtube_accounts").delete().eq("user_id", user_id).execute()
    return True
