import logging

from fastapi import APIRouter, HTTPException

from app.services.supabase_service import get_admin_client
from app.services.spotify_service import get_top_tracks
from app.services.gemini_service import search_trending_tags
from app.services.anthropic_service import generate_metadata

router = APIRouter(prefix="/internal/beats", tags=["workers"])
logger = logging.getLogger(__name__)

STATUS_ORDER = ["uploaded", "converting", "converted", "analyzing", "analyzed",
                "generating", "ready_for_review", "publishing", "published"]


def _status_index(status: str) -> int:
    try:
        return STATUS_ORDER.index(status)
    except ValueError:
        return -1


def _mark_failed(client, beat_id: str, reason: str):
    logger.error("Beat %s falhou na geração: %s", beat_id, reason)
    client.table("beats").update({"status": "failed", "error_message": reason}).eq("id", beat_id).execute()


@router.post("/{beat_id}/generate")
def generate_beat(beat_id: str):
    """
    Worker chamado pelo QStash após a análise.
    Busca top tracks (Spotify) + tags trending (Gemini) + gera
    título/descrição/tags com Claude. Cria 1 row em posts (variacao='A').
    """
    client = get_admin_client()

    result = client.table("beats").select("*").eq("id", beat_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Beat não encontrado")

    beat = result.data

    # Idempotência
    if _status_index(beat["status"]) >= _status_index("generating"):
        logger.info("Beat %s já em geração (status=%s) — pulando", beat_id, beat["status"])
        return {"ok": True, "skipped": True}

    client.table("beats").update({"status": "generating"}).eq("id", beat_id).execute()

    artista_nome = beat.get("artista_nome") or "type beat"
    bpm = beat.get("bpm")
    music_key = beat.get("music_key")
    user_id = beat["user_id"]

    # Busca perfil do produtor
    profile_result = client.table("user_profiles").select("nome, instagram").eq("user_id", user_id).maybe_single().execute()
    profile = profile_result.data or {}

    # Busca email do usuário
    try:
        user_result = client.auth.admin.get_user_by_id(user_id)
        producer_email = user_result.user.email if user_result.user else None
    except Exception:
        producer_email = None

    # 1. Spotify: top tracks do artista
    try:
        top_tracks = get_top_tracks(artista_nome)
    except Exception as exc:
        logger.warning("Spotify falhou para '%s': %s — continuando sem top tracks", artista_nome, exc)
        top_tracks = []

    # 2. Gemini: tags trending
    try:
        trending_tags = search_trending_tags(artista_nome)
    except Exception as exc:
        logger.warning("Gemini falhou para '%s': %s — continuando sem tags trending", artista_nome, exc)
        trending_tags = []

    # 3. Claude: gera título, descrição e tags
    try:
        metadata = generate_metadata(
            artista_nome=artista_nome,
            bpm=bpm,
            music_key=music_key,
            top_tracks=top_tracks,
            trending_tags=trending_tags,
            producer_nome=profile.get("nome"),
            producer_instagram=profile.get("instagram"),
            producer_email=producer_email,
        )
    except Exception as exc:
        _mark_failed(client, beat_id, f"Claude falhou: {exc}")
        raise HTTPException(status_code=500, detail=f"Erro na geração com Claude: {exc}")

    # 4. Insere 1 post (variacao='A')
    try:
        client.table("posts").insert({
            "beat_id": beat_id,
            "user_id": user_id,
            "variacao": "A",
            "titulo": metadata["titulo"],
            "descricao": metadata["descricao"],
            "tags": metadata["tags"],
            "status": "draft",
        }).execute()
    except Exception as exc:
        _mark_failed(client, beat_id, f"Erro ao salvar post: {exc}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar post: {exc}")

    # 5. Avança status
    client.table("beats").update({"status": "ready_for_review"}).eq("id", beat_id).execute()

    logger.info(
        "Beat %s: geração concluída — titulo='%s' tags=%d",
        beat_id, metadata["titulo"], len(metadata["tags"]),
    )
    return {"ok": True, "beat_id": beat_id, "beat_name": metadata["beat_name"], "status": "ready_for_review"}
