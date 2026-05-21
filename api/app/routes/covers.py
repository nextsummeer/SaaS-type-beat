"""Endpoints HTTP da aba /capas — gera capa via IA, lista biblioteca, le creditos.

ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md
"""
import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services import credits_service
from app.services.supabase_service import get_admin_client, validate_token
from app.workers.cover import generate_covers

router = APIRouter(prefix="/covers", tags=["covers"])
logger = logging.getLogger(__name__)


class BriefModel(BaseModel):
    """Brief estruturado do produtor. Artista e texto livre (NAO e FK pra
    artistas_referencia) — produtor digita qualquer nome. ADR 2026-05-21:
    'sao milhares de artistas, todo dia nasce um novo' — curadoria manual
    inviavel. A tabela artistas_referencia continua existindo mas e opcional
    pra autocomplete/sugestoes futuras."""
    artista_nome: str
    sujeito: str | None = None
    ambiente: str | None = None
    iluminacao: str | None = None
    energia: str | None = None
    nota_livre: str | None = None


class GenerateCoverRequest(BaseModel):
    brief: BriefModel
    lote: int = 1
    save_as_default: bool = False


def _authenticate(authorization: str):
    """Helper compartilhado pra auth via JWT Bearer. Retorna user."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token invalido")
    token = authorization.removeprefix("Bearer ")
    try:
        return validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalido ou expirado")


@router.get("")
def list_library(authorization: str = Header(...)):
    """Lista a biblioteca de capas do user autenticado.

    Returns:
        list de capas ordenadas por created_at desc, com fields:
            id, image_url, brief_used, source, used_in_beats_count, created_at
    """
    user = _authenticate(authorization)
    client = get_admin_client()

    result = (
        client.table("cover_library")
        .select(
            "id, image_url, storage_path, brief_used, source, "
            "used_in_beats_count, created_at"
        )
        .eq("user_id", str(user.id))
        .order("created_at", desc=True)
        .execute()
    )

    return result.data or []


@router.get("/credits")
def get_credits(authorization: str = Header(...)):
    """Estado dos creditos do user autenticado.

    Returns:
        {tier, limit, used, remaining, reset_at}
    """
    user = _authenticate(authorization)
    return credits_service.get_remaining(str(user.id))


@router.delete("/{cover_id}", status_code=204)
def delete_cover(cover_id: str, authorization: str = Header(...)):
    """Deleta uma capa da biblioteca + remove o arquivo do storage.

    Valida ownership via user_id. Beats que referenciam essa capa
    (beats.cover_id FK on delete set null) ficam sem capa, nao quebram.
    """
    user = _authenticate(authorization)
    user_id = str(user.id)
    client = get_admin_client()

    cur = (
        client.table("cover_library")
        .select("id, user_id, storage_path")
        .eq("id", cover_id)
        .maybe_single()
        .execute()
    )
    data = cur.data if cur else None
    if not data:
        raise HTTPException(status_code=404, detail="Capa nao encontrada")
    if data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Capa pertence a outro user")

    # Cleanup storage (best-effort — nao bloqueia delete se falhar)
    storage_path = data.get("storage_path")
    if storage_path:
        try:
            client.storage.from_("covers").remove([storage_path])
            logger.info("cover delete: removed storage_path=%s", storage_path)
        except Exception as exc:
            logger.warning("cover delete: falha remover storage %s: %s", storage_path, exc)

    client.table("cover_library").delete().eq("id", cover_id).execute()
    logger.info("cover delete: cover_id=%s user=%s", cover_id, user_id)
    return None


@router.post("/generate")
def generate(body: GenerateCoverRequest, authorization: str = Header(...)):
    """Gera 1 ou 3 capas via IA pra biblioteca do user.

    Body:
        brief: 5 campos do brief estruturado + artista_id (FK pra artistas_referencia)
        lote: 1 ou 3
        save_as_default: se True, salva o brief como default em user_profiles.default_brief

    Returns:
        {
            ok, generated_ids, credits_consumed, credits_remaining, errors
        }
    """
    user = _authenticate(authorization)
    user_id = str(user.id)

    if body.lote not in (1, 3):
        raise HTTPException(status_code=422, detail="lote deve ser 1 ou 3")

    # Artista e texto livre — sem lookup em tabela. Apenas validar nao-vazio.
    artista_nome = (body.brief.artista_nome or "").strip()
    if not artista_nome:
        raise HTTPException(status_code=422, detail="artista_nome obrigatorio")

    client = get_admin_client()

    # Brief dict a passar pro worker (artista_nome incluido pro audit em cover_library.brief_used)
    brief_dict = {
        "artista_nome": artista_nome,
        "sujeito": body.brief.sujeito,
        "ambiente": body.brief.ambiente,
        "iluminacao": body.brief.iluminacao,
        "energia": body.brief.energia,
        "nota_livre": body.brief.nota_livre,
    }

    # Se solicitado, salva como default no perfil ANTES de gerar
    # (mesmo se a geracao falhar, a preferencia fica salva)
    if body.save_as_default:
        try:
            client.table("user_profiles").update({
                "default_brief": brief_dict,
            }).eq("user_id", user_id).execute()
            logger.info("covers.generate: default_brief salvo user=%s", user_id)
        except Exception as exc:
            logger.warning(
                "covers.generate: falha ao salvar default_brief user=%s: %s",
                user_id, exc,
            )

    # Chama o worker
    result = generate_covers(
        user_id=user_id,
        brief=brief_dict,
        artista_nome=artista_nome,
        lote=body.lote,
    )

    # Se nada gerou e o motivo foi falta de creditos, devolve 402
    if not result.get("ok") and result.get("credits_consumed", 0) == 0:
        errors = result.get("errors", [])
        if any("creditos" in e.lower() or "credits" in e.lower() for e in errors):
            raise HTTPException(status_code=402, detail={
                "code": "insufficient_credits",
                "remaining": result.get("credits_remaining", 0),
                "needed": body.lote,
            })

    return result
