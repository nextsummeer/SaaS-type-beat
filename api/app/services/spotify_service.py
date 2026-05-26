import os
import logging
import base64
import requests

logger = logging.getLogger(__name__)

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_URL = "https://api.spotify.com/v1"

_cached_token: dict | None = None


def _get_access_token() -> str | None:
    global _cached_token
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        logger.warning("SPOTIFY_CLIENT_ID ou SPOTIFY_CLIENT_SECRET não configurados")
        return None

    if _cached_token and _cached_token.get("expires_at", 0) > __import__("time").time() + 60:
        return _cached_token["access_token"]

    credentials = base64.b64encode(
        f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()
    ).decode()

    try:
        resp = requests.post(
            SPOTIFY_TOKEN_URL,
            headers={"Authorization": f"Basic {credentials}"},
            data={"grant_type": "client_credentials"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        _cached_token = {
            "access_token": data["access_token"],
            "expires_at": __import__("time").time() + data["expires_in"],
        }
        return _cached_token["access_token"]
    except Exception as exc:
        logger.error("Erro ao obter token Spotify: %s", exc)
        return None


def search_artists(query: str, limit: int = 10) -> list[dict]:
    """
    Busca artistas no Spotify pra alimentar o picker do /upload e /capas.
    Cliente nao precisa estar logado no Spotify -- usa Client Credentials.

    Retorna lista de dicts com {id, name, image_url, followers, genres}.
    Lista vazia se token nao configurado ou erro de rede.
    """
    query = (query or "").strip()
    if not query:
        return []

    token = _get_access_token()
    if not token:
        return []

    headers = {"Authorization": f"Bearer {token}"}

    try:
        resp = requests.get(
            f"{SPOTIFY_API_URL}/search",
            headers=headers,
            params={"q": query, "type": "artist", "limit": min(max(1, limit), 20)},
            timeout=10,
        )
        resp.raise_for_status()
        artists = resp.json().get("artists", {}).get("items", [])
        results: list[dict] = []
        for a in artists:
            images = a.get("images") or []
            # Pega a imagem media (1) ou a primeira disponivel
            image_url = None
            if images:
                image_url = images[1]["url"] if len(images) > 1 else images[0]["url"]
            results.append({
                "id": a["id"],
                "name": a["name"],
                "image_url": image_url,
                "followers": (a.get("followers") or {}).get("total", 0),
                "genres": a.get("genres", [])[:3],
            })
        return results
    except Exception as exc:
        logger.error("Erro ao buscar artistas Spotify '%s': %s", query, exc)
        return []


def get_top_tracks(artista_nome: str, market: str = "US") -> list[str]:
    """
    Busca as top tracks do artista no Spotify.
    Retorna lista de títulos (até 10). Lista vazia se falhar.
    """
    token = _get_access_token()
    if not token:
        return []

    headers = {"Authorization": f"Bearer {token}"}

    try:
        # Busca o artista pelo nome
        search_resp = requests.get(
            f"{SPOTIFY_API_URL}/search",
            headers=headers,
            params={"q": artista_nome, "type": "artist", "limit": 1},
            timeout=10,
        )
        search_resp.raise_for_status()
        artists = search_resp.json().get("artists", {}).get("items", [])
        if not artists:
            logger.info("Artista '%s' não encontrado no Spotify", artista_nome)
            return []

        artist_id = artists[0]["id"]

        # Busca as top tracks
        tracks_resp = requests.get(
            f"{SPOTIFY_API_URL}/artists/{artist_id}/top-tracks",
            headers=headers,
            params={"market": market},
            timeout=10,
        )
        tracks_resp.raise_for_status()
        tracks = tracks_resp.json().get("tracks", [])
        titles = [t["name"] for t in tracks[:10]]
        logger.info("Spotify top tracks para '%s': %s", artista_nome, titles)
        return titles

    except Exception as exc:
        logger.error("Erro ao buscar top tracks Spotify para '%s': %s", artista_nome, exc)
        return []
