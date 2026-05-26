"""Endpoint de busca de artistas via Spotify Web API.

Usado pelo SpotifyArtistPicker no /upload e /capas. Cliente nao precisa
estar logado no Spotify -- usa Client Credentials no backend.

Cache em memoria por query (lowercase + limit) com TTL 1h. Rate limit do
Spotify modo Development = 180 req/min; com cache passa de centenas de
produtores tranquilo. Quando crescer aplica Extended Quota.

T4.37 — modal Spotify substitui inputs de texto livre.
"""
import logging
import time
from threading import Lock

from fastapi import APIRouter, Header, HTTPException, Query

from app.services import spotify_service
from app.services.supabase_service import validate_token

router = APIRouter(prefix="/artists", tags=["artists"])
logger = logging.getLogger(__name__)

# Cache: { "query|limit": (timestamp, results) }
_CACHE: dict[str, tuple[float, list[dict]]] = {}
_CACHE_LOCK = Lock()
_TTL_SECONDS = 3600


def _cache_get(key: str) -> list[dict] | None:
    with _CACHE_LOCK:
        entry = _CACHE.get(key)
        if not entry:
            return None
        ts, payload = entry
        if time.time() - ts > _TTL_SECONDS:
            _CACHE.pop(key, None)
            return None
        return payload


def _cache_set(key: str, payload: list[dict]) -> None:
    with _CACHE_LOCK:
        # Limita o cache a 500 entradas pra nao crescer infinito.
        if len(_CACHE) > 500:
            _CACHE.clear()
        _CACHE[key] = (time.time(), payload)


@router.get("/search")
def search_artists_endpoint(
    q: str = Query(..., min_length=1, max_length=64, description="Nome do artista"),
    limit: int = Query(10, ge=1, le=20),
    authorization: str = Header(...),
):
    """Busca artistas no Spotify. Autenticado via Supabase JWT (produtor logado)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token invalido")
    token = authorization.removeprefix("Bearer ")

    try:
        validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalido ou expirado")

    query = q.strip().lower()
    cache_key = f"{query}|{limit}"

    cached = _cache_get(cache_key)
    if cached is not None:
        return {"items": cached, "cached": True}

    results = spotify_service.search_artists(q, limit=limit)
    _cache_set(cache_key, results)
    return {"items": results, "cached": False}
