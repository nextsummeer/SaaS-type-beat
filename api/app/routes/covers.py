"""Endpoints HTTP da aba /capas — gera capa via IA, lista biblioteca, le creditos.

ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md
"""
import logging
import uuid as uuid_mod

from fastapi import APIRouter, File, Header, HTTPException, UploadFile
from pydantic import BaseModel

from app.services import credits_service
from app.services.supabase_service import get_admin_client, validate_token
from app.workers.cover import generate_covers

# Constantes do upload manual (T4.35)
MANUAL_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
MANUAL_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
MANUAL_SIGNED_URL_EXPIRY = 31_536_000  # 1 ano (mesmo da geracao IA)

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
    # T4.41: id do brief_preset ativo que originou a geracao. O worker resolve
    # o nome (com checagem de dono) e linka a capa pro preset, pra exibir o
    # nome no modal e fazer rename propagar.
    brief_preset_id: str | None = None


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
            id, image_url, brief_used, source, used_in_beats_count,
            rating, created_at
    """
    user = _authenticate(authorization)
    client = get_admin_client()

    result = (
        client.table("cover_library")
        .select(
            "id, image_url, storage_path, brief_used, brief_preset_id, "
            "brief_preset_name, source, used_in_beats_count, rating, "
            "status, created_at"
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


class RateCoverRequest(BaseModel):
    """Rating do produtor pra capa (1-5 ou null pra remover avaliacao)."""
    rating: int | None


@router.patch("/{cover_id}/rating")
def rate_cover(
    cover_id: str,
    body: RateCoverRequest,
    authorization: str = Header(...),
):
    """Atualiza rating de uma capa (1-5 estrelas) ou null pra remover."""
    user = _authenticate(authorization)
    user_id = str(user.id)

    if body.rating is not None and not (1 <= body.rating <= 5):
        raise HTTPException(
            status_code=422,
            detail="rating deve ser entre 1 e 5 ou null pra remover",
        )

    client = get_admin_client()

    cur = (
        client.table("cover_library")
        .select("id, user_id")
        .eq("id", cover_id)
        .maybe_single()
        .execute()
    )
    data = cur.data if cur else None
    if not data:
        raise HTTPException(status_code=404, detail="Capa nao encontrada")
    if data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Capa pertence a outro user")

    client.table("cover_library").update({"rating": body.rating}).eq(
        "id", cover_id
    ).execute()
    logger.info("cover rate: cover_id=%s rating=%s user=%s", cover_id, body.rating, user_id)
    return {"ok": True, "rating": body.rating}


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
        brief_preset_id=body.brief_preset_id,
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


# ─────────────────────────────────────────────────────────────────────
# T4.35 — Banco de capas manuais (upload pelo produtor, sem IA)
# ─────────────────────────────────────────────────────────────────────

@router.get("/manual_limit")
def get_manual_limit(authorization: str = Header(...)):
    """Estado da quota de capas manuais do user (total acumulado).

    Returns:
        {tier, limit, used, remaining}
    """
    user = _authenticate(authorization)
    return credits_service.get_manual_quota(str(user.id))


@router.post("/manual_upload")
async def manual_upload(
    file: UploadFile = File(...),
    authorization: str = Header(...),
):
    """Recebe imagem cropada quadrada pelo client, valida, sobe no Storage
    e cria row em cover_library com source='manual_upload'.

    Validacoes:
        - content_type: image/jpeg ou image/png
        - tamanho: <= 5 MB
        - quota nao excedida (MANUAL_LIMITS por tier)

    O crop pra quadrada e feito no client (react-easy-crop). Aqui assumimos
    que ja vem 1024x1024 -- nao revalidamos dimensoes pra evitar dependencia
    de PIL no caminho quente.

    Returns:
        {ok, id, image_url} — id e image_url pra UI atualizar e
        opcionalmente associar ao beat na hora.
    """
    user = _authenticate(authorization)
    user_id = str(user.id)

    # 1. Valida tipo de arquivo
    if file.content_type not in MANUAL_ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Formato invalido ({file.content_type}). Use JPG ou PNG.",
        )

    # 2. Le e valida tamanho
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Arquivo vazio.")
    if len(content) > MANUAL_MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo muito grande ({len(content) // 1024} KB). Limite: 5 MB.",
        )

    # 3. Checa quota antes de subir
    quota = credits_service.get_manual_quota(user_id)
    if quota["remaining"] <= 0:
        raise HTTPException(status_code=402, detail={
            "code": "manual_quota_exceeded",
            "tier": quota["tier"],
            "used": quota["used"],
            "limit": quota["limit"],
        })

    client = get_admin_client()

    # 4. Upload pra Storage (covers/{user_id}/manual/{uuid}.{ext})
    cover_id = str(uuid_mod.uuid4())
    ext = "jpg" if file.content_type == "image/jpeg" else "png"
    storage_path = f"{user_id}/manual/{cover_id}.{ext}"

    try:
        client.storage.from_("covers").upload(
            path=storage_path,
            file=content,
            file_options={
                "content-type": file.content_type,
                "upsert": "false",
            },
        )
    except Exception as exc:
        logger.error("manual_upload: storage falhou user=%s: %s", user_id, exc)
        raise HTTPException(status_code=500, detail="Falha ao subir arquivo.")

    # 5. Signed URL (1 ano, mesmo padrao da IA)
    image_url = None
    try:
        signed = client.storage.from_("covers").create_signed_url(
            storage_path, MANUAL_SIGNED_URL_EXPIRY,
        )
        if signed:
            image_url = signed.get("signedURL") or signed.get("signed_url")
    except Exception as exc:
        logger.error("manual_upload: signed URL falhou user=%s: %s", user_id, exc)

    if not image_url:
        # Cleanup pra nao deixar lixo orfao no Storage
        try:
            client.storage.from_("covers").remove([storage_path])
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Falha ao gerar URL.")

    # 6. INSERT em cover_library — source='manual_upload', sem brief/prompt
    try:
        client.table("cover_library").insert({
            "id": cover_id,
            "user_id": user_id,
            "image_url": image_url,
            "storage_path": storage_path,
            "source": "manual_upload",
            "status": "ready",
            "cost_usd": 0,
        }).execute()
    except Exception as exc:
        logger.error("manual_upload: insert DB falhou user=%s: %s", user_id, exc)
        try:
            client.storage.from_("covers").remove([storage_path])
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Falha ao registrar capa.")

    logger.info(
        "manual_upload: ok user=%s cover_id=%s size=%dKB tier=%s used=%d/%d",
        user_id, cover_id, len(content) // 1024,
        quota["tier"], quota["used"] + 1, quota["limit"],
    )

    return {"ok": True, "id": cover_id, "image_url": image_url}
