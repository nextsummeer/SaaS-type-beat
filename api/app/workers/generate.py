import logging
import concurrent.futures

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

    try:
        artista_nome = beat.get("artista_nome") or "type beat"
        bpm = beat.get("bpm")
        music_key = beat.get("music_key")
        user_id = beat["user_id"]

        # Busca perfil do produtor — sem .maybe_single() (bug do postgrest-py com 204 No Content)
        profile_result = client.table("user_profiles").select("nome, instagram, email_contato").eq("user_id", user_id).execute()
        profile = profile_result.data[0] if profile_result.data else {}
        producer_email = profile.get("email_contato")

        # 1+2. Spotify + Gemini em paralelo — shutdown(wait=False) evita bloqueio
        executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
        fut_spotify = executor.submit(get_top_tracks, artista_nome)
        fut_gemini = executor.submit(search_trending_tags, artista_nome)
        try:
            top_tracks = fut_spotify.result(timeout=15)
        except Exception as exc:
            logger.warning("Spotify falhou para '%s': %s", artista_nome, exc)
            top_tracks = []
        try:
            trending_tags = fut_gemini.result(timeout=25)
        except Exception as exc:
            logger.warning("Gemini falhou para '%s': %s", artista_nome, exc)
            trending_tags = []
        executor.shutdown(wait=False, cancel_futures=True)

        # 3. Claude: gera título, descrição e tags
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

        # 4. Insere 1 post (variacao='A')
        client.table("posts").insert({
            "beat_id": beat_id,
            "user_id": user_id,
            "variacao": "A",
            "titulo": metadata["titulo"],
            "descricao": metadata["descricao"],
            "tags": metadata["tags"],
            "status": "draft",
        }).execute()

        # 5. Avança status
        client.table("beats").update({"status": "ready_for_review"}).eq("id", beat_id).execute()

        logger.info(
            "Beat %s: geração concluída — titulo='%s' tags=%d",
            beat_id, metadata["titulo"], len(metadata["tags"]),
        )
        return {"ok": True, "beat_id": beat_id, "beat_name": metadata["beat_name"], "status": "ready_for_review"}

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Erro inesperado em generate_beat (beat=%s)", beat_id)
        _mark_failed(client, beat_id, f"Erro inesperado: {exc}")
        raise HTTPException(status_code=500, detail=f"Erro inesperado: {exc}")
