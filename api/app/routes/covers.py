"""Endpoint HTTP da aba /capas — gera capa via IA.

ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md
"""
import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services.supabase_service import get_admin_client, validate_token
from app.workers.cover import generate_covers

router = APIRouter(prefix="/covers", tags=["covers"])
logger = logging.getLogger(__name__)


class BriefModel(BaseModel):
    artista_id: str
    sujeito: str | None = None
    ambiente: str | None = None
    iluminacao: str | None = None
    energia: str | None = None
    nota_livre: str | None = None


class GenerateCoverRequest(BaseModel):
    brief: BriefModel
    lote: int = 1
    save_as_default: bool = False


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
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token invalido")
    token = authorization.removeprefix("Bearer ")

    try:
        user = validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalido ou expirado")

    user_id = str(user.id)

    if body.lote not in (1, 3):
        raise HTTPException(status_code=422, detail="lote deve ser 1 ou 3")

    client = get_admin_client()

    # Resolve artista_id → nome canonico
    artist_resp = (
        client.table("artistas_referencia")
        .select("id, nome_canonico, ativo")
        .eq("id", body.brief.artista_id)
        .maybe_single()
        .execute()
    )
    artist = artist_resp.data if artist_resp else None
    if not artist:
        raise HTTPException(status_code=422, detail="artista_id nao encontrado")
    if not artist.get("ativo", True):
        raise HTTPException(status_code=422, detail="artista inativo")

    artista_nome = artist["nome_canonico"]

    # Brief dict a passar pro worker (sem artista_id — ele recebe nome separado)
    brief_dict = {
        "artista_id": body.brief.artista_id,  # mantemos pro audit em cover_library.brief_used
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
