import os
import logging
from urllib.parse import urlencode

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.services.supabase_service import validate_token
from app.services import youtube_oauth

router = APIRouter(prefix="/youtube", tags=["youtube"])
logger = logging.getLogger(__name__)


def _web_url() -> str:
    """URL do frontend pra redirecionar de volta após o callback."""
    url = os.environ.get("WEB_URL")
    if url:
        return url.rstrip("/")
    origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
    return origins.split(",")[0].strip().rstrip("/")


def _build_return_url(status: str, detail: str | None = None) -> str:
    params = {"connected": status}
    if detail:
        params["detail"] = detail
    return f"{_web_url()}/youtube?{urlencode(params)}"


@router.get("/auth")
def youtube_auth(token: str = Query(..., description="JWT do usuário (Supabase access_token)")):
    """Inicia o flow OAuth. Frontend redireciona pra cá com o JWT no querystring."""
    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    url = youtube_oauth.build_auth_url(str(user.id))
    return RedirectResponse(url=url, status_code=302)


@router.get("/callback")
def youtube_callback(
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
):
    """Recebe o callback do Google, troca code por tokens e salva o canal."""
    if error:
        logger.warning("OAuth callback com erro: %s", error)
        return RedirectResponse(url=_build_return_url("error", error), status_code=302)

    if not code or not state:
        return RedirectResponse(
            url=_build_return_url("error", "missing_params"), status_code=302
        )

    try:
        user_id = youtube_oauth.decode_state(state)
    except ValueError as exc:
        logger.warning("State inválido: %s", exc)
        return RedirectResponse(
            url=_build_return_url("error", "invalid_state"), status_code=302
        )

    try:
        tokens = youtube_oauth.exchange_code(code)
    except Exception as exc:
        logger.error("Falha ao trocar code por tokens: %s", exc)
        return RedirectResponse(
            url=_build_return_url("error", "token_exchange_failed"), status_code=302
        )

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = int(tokens.get("expires_in", 3600))
    scope = tokens.get("scope", "")
    logger.warning(
        "[YT_DEBUG] callback tokens received: has_access=%s has_refresh=%s scope=%s",
        bool(access_token),
        bool(refresh_token),
        scope,
    )

    if not access_token or not refresh_token:
        logger.error("Tokens incompletos do Google: %s", list(tokens.keys()))
        return RedirectResponse(
            url=_build_return_url("error", "no_refresh_token"), status_code=302
        )

    channel = youtube_oauth.get_channel_info(access_token)
    if not channel:
        return RedirectResponse(
            url=_build_return_url("error", "no_channel"), status_code=302
        )

    try:
        youtube_oauth.save_account(
            user_id=user_id,
            channel_id=channel["channel_id"],
            channel_title=channel["channel_title"],
            refresh_token=refresh_token,
            access_token=access_token,
            expires_in=expires_in,
            scopes=scope.split() if scope else youtube_oauth.REQUESTED_SCOPES.split(),
        )
    except Exception as exc:
        logger.exception("Falha ao salvar canal: %s", exc)
        return RedirectResponse(
            url=_build_return_url("error", "save_failed"), status_code=302
        )

    return RedirectResponse(url=_build_return_url("1"), status_code=302)


@router.get("/me")
def youtube_me(authorization: str = Header(...)):
    """Retorna o canal conectado do usuário autenticado, ou null."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")

    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    account = youtube_oauth.get_connected_account(str(user.id))
    return {"account": account}


@router.delete("/me", status_code=204)
def youtube_disconnect(authorization: str = Header(...)):
    """Revoga e remove o canal conectado."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")

    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    youtube_oauth.disconnect_account(str(user.id))
    return None
