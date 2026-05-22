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
    """Brief do produtor. Aceita formato v2 (campos novos) E v1 (legacy)
    via back-compat -- conversor server-side em
    `cover_prompt_builder.brief_converter` detecta e converte.

    Apos T4.24 entregar o wizard v2 e validarmos por 1 release, os campos
    v1 podem ser removidos. ADR 2026-05-21-prompt-dna-capa-v2.md.
    """
    # v3 (preferidas) -- campo `cenario` removido (inferido do universo do artista)
    genero_primario: str | None = None
    genero_secundario: str | None = None
    artista_primario: str | None = None
    artista_secundario: str | None = None
    quem_aparece: str | None = None
    mood: str | None = None
    atmosfera_luz: str | None = None

    # v1 (legacy -- convertido server-side via normalize_brief)
    artista_nome: str | None = None
    sujeito: str | None = None
    ambiente: str | None = None
    iluminacao: str | None = None
    energia: str | None = None

    # Comum
    nota_livre: str | None = None


class GenerateCoverRequest(BaseModel):
    brief: BriefModel
    lote: int = 1
    save_as_default: bool = False
    # v3: True quando produtor clica "Gerar variacao" -- ativa anti-repeticao
    # no builder (query nas ultimas 5 capas do mesmo user+artista).
    force_variation: bool = False


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

    # Normaliza brief (converte v1 -> v2 se necessario)
    from app.services.cover_prompt_builder import normalize_brief

    raw_brief = body.brief.model_dump(exclude_none=True)
    brief_dict = normalize_brief(raw_brief)

    # Apos normalizacao, artista_primario e obrigatorio
    artista_primario = (brief_dict.get("artista_primario") or "").strip()
    if not artista_primario:
        raise HTTPException(status_code=422, detail="artista_primario obrigatorio")

    client = get_admin_client()

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

    # Chama o worker (assinatura v3: sem artista_nome separado, com
    # force_variation pra anti-repeticao)
    result = generate_covers(
        user_id=user_id,
        brief=brief_dict,
        lote=body.lote,
        force_variation=body.force_variation,
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
