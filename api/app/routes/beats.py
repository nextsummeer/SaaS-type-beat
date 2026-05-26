import logging
from typing import List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services.supabase_service import get_admin_client, validate_token
from app.services.qstash_service import dispatch_convert_job

router = APIRouter(prefix="/beats", tags=["beats"])
logger = logging.getLogger(__name__)


class CreateBeatRequest(BaseModel):
    audio_path: str
    """Caminho de capa MANUAL no Supabase Storage. Mutualmente exclusivo com cover_id."""
    cover_path: Optional[str] = None
    """ID de capa da biblioteca (cover_library). Mutualmente exclusivo com cover_path."""
    cover_id: Optional[str] = None
    artista_nome: Optional[str] = None
    artistas: Optional[List[str]] = None
    bpm: int
    """Nota musical (C, C#, D, ... B) -- T4.39 cliente envia via essentia.js. Fallback: worker analyze.py calcula via librosa."""
    music_key: Optional[str] = None
    """Modo musical (Major | Minor) -- T4.39. Idem music_key."""
    music_scale: Optional[str] = None
    store_link: Optional[str] = None


@router.get("")
def list_beats(authorization: str = Header(...)):
    """Lista beats do usuário autenticado com dados do post (variacao=A)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")

    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    client = get_admin_client()

    beats_result = (
        client.table("beats")
        .select(
            "id, status, artista_nome, bpm, music_key, music_scale, cover_path, "
            "error_message, created_at, updated_at"
        )
        .eq("user_id", str(user.id))
        .order("created_at", desc=True)
        .execute()
    )

    beats = beats_result.data or []
    if not beats:
        return []

    beat_ids = [b["id"] for b in beats]

    posts_result = (
        client.table("posts")
        .select(
            "beat_id, titulo, status, scheduled_at, published_at, "
            "youtube_url, youtube_video_id, youtube_deleted_at, updated_at"
        )
        .in_("beat_id", beat_ids)
        .eq("variacao", "A")
        .execute()
    )
    posts_by_beat = {p["beat_id"]: p for p in (posts_result.data or [])}

    out = []
    for b in beats:
        post = posts_by_beat.get(b["id"])
        out.append(
            {
                "id": b["id"],
                "status": b["status"],
                "artista_nome": b.get("artista_nome"),
                "bpm": b.get("bpm"),
                "music_key": b.get("music_key"),
                "music_scale": b.get("music_scale"),
                "cover_path": b.get("cover_path"),
                "error_message": b.get("error_message"),
                "created_at": b.get("created_at"),
                "updated_at": b.get("updated_at"),
                "titulo": post.get("titulo") if post else None,
                "post_status": post.get("status") if post else None,
                "scheduled_at": post.get("scheduled_at") if post else None,
                "published_at": post.get("published_at") if post else None,
                "youtube_url": post.get("youtube_url") if post else None,
                "youtube_video_id": post.get("youtube_video_id") if post else None,
                "youtube_deleted_at": post.get("youtube_deleted_at") if post else None,
            }
        )

    return out


@router.post("", status_code=201)
def create_beat(
    body: CreateBeatRequest,
    authorization: str = Header(...),
):
    """Registra um beat no banco e dispara o job de conversão via QStash."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")

    if body.bpm < 40 or body.bpm > 300:
        raise HTTPException(status_code=422, detail="BPM deve estar entre 40 e 300")

    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    # Reconcilia artistas: prioriza lista nova, cai pra string antiga
    artistas_clean: list[str] = []
    if body.artistas:
        artistas_clean = [a.strip() for a in body.artistas if a and a.strip()]
        # Remove duplicatas preservando ordem (case-insensitive)
        seen = set()
        artistas_clean = [
            a for a in artistas_clean
            if not (a.lower() in seen or seen.add(a.lower()))
        ]
    artista_nome = " x ".join(artistas_clean) if artistas_clean else (body.artista_nome or None)

    client = get_admin_client()

    # ── Resolve capa: cover_id (biblioteca) OU cover_path (manual) ──
    # Se cover_id presente, valida ownership e copia o storage_path da cover_library
    # pra cover_path. Mantemos cover_path duplicado pra retrocompat
    # (workers atuais leem cover_path).
    cover_source = "manual"  # default — beats antigos ja sao manual
    final_cover_path: Optional[str] = body.cover_path
    final_cover_id: Optional[str] = None

    if body.cover_id:
        # Valida que a capa pertence ao user
        cover_resp = (
            client.table("cover_library")
            .select("id, user_id, storage_path")
            .eq("id", body.cover_id)
            .maybe_single()
            .execute()
        )
        cover_data = cover_resp.data if cover_resp else None
        if not cover_data:
            raise HTTPException(status_code=404, detail="Capa nao encontrada na biblioteca")
        if cover_data["user_id"] != str(user.id):
            raise HTTPException(status_code=403, detail="Capa pertence a outro usuario")
        final_cover_id = body.cover_id
        final_cover_path = cover_data["storage_path"]
        cover_source = "library"

    # Normaliza key + scale do client (essentia.js manda separado, T4.39).
    # Aceita None -- worker analyze.py vira fallback.
    key_norm = (body.music_key or "").strip() or None
    scale_norm = (body.music_scale or "").strip()
    if scale_norm:
        # Normaliza Capitalize ("major" -> "Major")
        scale_norm = scale_norm.capitalize()
        if scale_norm not in ("Major", "Minor"):
            scale_norm = None
    else:
        scale_norm = None

    result = (
        client.table("beats")
        .insert(
            {
                "user_id": str(user.id),
                "audio_path": body.audio_path,
                "cover_path": final_cover_path,
                "cover_id": final_cover_id,
                "cover_source": cover_source,
                "artista_nome": artista_nome,
                "bpm": body.bpm,
                "music_key": key_norm,
                "music_scale": scale_norm,
                "store_link": body.store_link,
                "status": "uploaded",
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=500, detail="Erro ao salvar beat no banco")

    beat = result.data[0]

    # Se usou capa da biblioteca, incrementa o contador (best-effort, nao quebra
    # se falhar — beat ja foi criado)
    if final_cover_id:
        try:
            # Busca contador atual + incrementa (UPDATE simples, sem RPC atomico)
            cur = (
                client.table("cover_library")
                .select("used_in_beats_count")
                .eq("id", final_cover_id)
                .maybe_single()
                .execute()
            )
            if cur and cur.data:
                new_count = int(cur.data.get("used_in_beats_count") or 0) + 1
                client.table("cover_library").update({
                    "used_in_beats_count": new_count
                }).eq("id", final_cover_id).execute()
        except Exception as exc:
            logger.warning("Falha ao incrementar used_in_beats_count: %s", exc)

    try:
        dispatch_convert_job(beat["id"])
    except Exception as exc:
        logger.error("Falha ao enviar job QStash: beat=%s erro=%s", beat["id"], exc)

    return {"id": beat["id"], "status": "uploaded"}


@router.delete("/{beat_id}", status_code=204)
def delete_beat(beat_id: str, authorization: str = Header(...)):
    """Deleta um beat (e posts via cascade) + remove arquivos do Storage."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token inválido")
    token = authorization.removeprefix("Bearer ")

    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    client = get_admin_client()

    beat_result = (
        client.table("beats")
        .select("id, audio_path, cover_path")
        .eq("id", beat_id)
        .eq("user_id", str(user.id))
        .execute()
    )
    if not beat_result.data:
        raise HTTPException(status_code=404, detail="Beat não encontrado")

    beat = beat_result.data[0]

    if beat.get("audio_path"):
        try:
            client.storage.from_("audios").remove([beat["audio_path"]])
        except Exception as exc:
            logger.warning("Falha ao remover audio %s: %s", beat["audio_path"], exc)

    if beat.get("cover_path"):
        try:
            client.storage.from_("covers").remove([beat["cover_path"]])
        except Exception as exc:
            logger.warning("Falha ao remover capa %s: %s", beat["cover_path"], exc)

    client.table("beats").delete().eq("id", beat_id).eq("user_id", str(user.id)).execute()
    logger.info("Beat %s deletado pelo user %s", beat_id, user.id)
    return None
