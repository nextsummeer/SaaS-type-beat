"""Endpoints HTTP de brief_presets.

ADR 2026-05-21 atualizada — substitui user_profiles.default_brief unico
por presets nomeados. Limites por tier em presets_service.PRESET_LIMITS.

Rotas:
    GET    /covers/briefs            — lista do user (RLS)
    POST   /covers/briefs            — cria (valida limite). Se primeiro, ativa.
    PATCH  /covers/briefs/{id}       — renomear e/ou atualizar conteudo do brief
    DELETE /covers/briefs/{id}       — deleta. Se era ativo, ativa o mais recente.
    POST   /covers/briefs/{id}/activate — torna ativo (desativa os outros)
"""
import logging

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.services import presets_service
from app.services.supabase_service import get_admin_client, validate_token

router = APIRouter(prefix="/covers/briefs", tags=["briefs"])
logger = logging.getLogger(__name__)


class BriefBodyModel(BaseModel):
    """Brief estruturado do produtor (sem id/nome -- esses sao da row).

    Aceita formato v2 (campos novos) E v1 (legacy) via back-compat --
    `cover_prompt_builder.normalize_brief` faz a conversao antes de
    salvar no banco. Apos T4.24 entregar wizard v2 e validarmos por
    1 release, os campos v1 podem ser removidos.
    """
    # v3 (preferidas) -- campo `cenario` removido
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


class CreatePresetRequest(BaseModel):
    name: str
    brief: BriefBodyModel
    activate: bool = True


class UpdatePresetRequest(BaseModel):
    name: str | None = None
    brief: BriefBodyModel | None = None


def _authenticate(authorization: str):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token invalido")
    token = authorization.removeprefix("Bearer ")
    try:
        return validate_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalido ou expirado")


def _validate_brief_body(brief: BriefBodyModel) -> dict:
    """Sanitiza, converte v1->v2 se necessario, retorna dict v2 pra salvar.

    Lanca 422 se artista_primario vazio apos normalizacao.
    """
    from app.services.cover_prompt_builder import normalize_brief

    raw = brief.model_dump(exclude_none=True)
    normalized = normalize_brief(raw)

    artista = (normalized.get("artista_primario") or "").strip()
    if not artista:
        raise HTTPException(status_code=422, detail="artista_primario obrigatorio")

    # Garante que artista_primario fica strip()ado no dict final
    normalized["artista_primario"] = artista
    nota = (normalized.get("nota_livre") or "").strip()
    normalized["nota_livre"] = nota or None
    return normalized


@router.get("")
def list_presets(authorization: str = Header(...)):
    """Lista os brief_presets do user. Inclui o tier + limite no header da resposta."""
    user = _authenticate(authorization)
    user_id = str(user.id)
    client = get_admin_client()

    result = (
        client.table("brief_presets")
        .select("id, name, brief, is_active, created_at, updated_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )

    tier = presets_service.get_user_tier(user_id)
    limit = presets_service.PRESET_LIMITS.get(tier, 1)

    return {
        "items": result.data or [],
        "tier": tier,
        "limit": limit,
        "count": len(result.data or []),
    }


@router.post("", status_code=201)
def create_preset(body: CreatePresetRequest, authorization: str = Header(...)):
    """Cria um brief_preset. Valida limite do tier.

    Se for o primeiro preset do user (count=0), ele e ativado automaticamente
    independente do flag activate.

    Se activate=True, desativa qualquer outro preset ativo deste user antes.
    """
    user = _authenticate(authorization)
    user_id = str(user.id)

    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="name obrigatorio")
    if len(name) > 60:
        raise HTTPException(status_code=422, detail="name maximo 60 caracteres")

    brief_dict = _validate_brief_body(body.brief)

    # Valida limite do plano
    can, atual, limit = presets_service.can_create_more(user_id)
    if not can:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "limit_reached",
                "current": atual,
                "limit": limit,
                "message": f"Voce ja tem {atual} brief(s). Plano permite {limit}.",
            },
        )

    client = get_admin_client()

    # Se for o primeiro do user, forca ativacao
    should_activate = body.activate or atual == 0

    # Se vai ativar, desativa os outros primeiro
    if should_activate:
        client.table("brief_presets").update({"is_active": False}).eq("user_id", user_id).eq("is_active", True).execute()

    insert_resp = client.table("brief_presets").insert({
        "user_id": user_id,
        "name": name,
        "brief": brief_dict,
        "is_active": should_activate,
    }).execute()

    row = (insert_resp.data or [{}])[0]
    return row


@router.patch("/{brief_id}")
def update_preset(
    brief_id: str,
    body: UpdatePresetRequest,
    authorization: str = Header(...),
):
    """Renomeia e/ou atualiza o conteudo do brief preset."""
    user = _authenticate(authorization)
    user_id = str(user.id)
    client = get_admin_client()

    # Verifica ownership
    cur = (
        client.table("brief_presets")
        .select("id, user_id")
        .eq("id", brief_id)
        .maybe_single()
        .execute()
    )
    data = cur.data if cur else None
    if not data:
        raise HTTPException(status_code=404, detail="Preset nao encontrado")
    if data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Preset pertence a outro user")

    updates: dict = {}
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="name nao pode ser vazio")
        if len(name) > 60:
            raise HTTPException(status_code=422, detail="name maximo 60 caracteres")
        updates["name"] = name

    if body.brief is not None:
        updates["brief"] = _validate_brief_body(body.brief)

    if not updates:
        raise HTTPException(status_code=422, detail="nada pra atualizar")

    updates["updated_at"] = "now()"

    result = (
        client.table("brief_presets")
        .update(updates)
        .eq("id", brief_id)
        .execute()
    )
    return (result.data or [{}])[0]


@router.delete("/{brief_id}", status_code=204)
def delete_preset(brief_id: str, authorization: str = Header(...)):
    """Deleta um preset. Se era o ativo, ativa o mais recente do user."""
    user = _authenticate(authorization)
    user_id = str(user.id)
    client = get_admin_client()

    cur = (
        client.table("brief_presets")
        .select("id, user_id, is_active")
        .eq("id", brief_id)
        .maybe_single()
        .execute()
    )
    data = cur.data if cur else None
    if not data:
        raise HTTPException(status_code=404, detail="Preset nao encontrado")
    if data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Preset pertence a outro user")

    was_active = data.get("is_active", False)

    client.table("brief_presets").delete().eq("id", brief_id).execute()

    # Se deletou o ativo, ativa o mais recente
    if was_active:
        remaining = (
            client.table("brief_presets")
            .select("id")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if remaining.data:
            client.table("brief_presets").update({"is_active": True}).eq(
                "id", remaining.data[0]["id"]
            ).execute()

    return None


@router.post("/{brief_id}/activate")
def activate_preset(brief_id: str, authorization: str = Header(...)):
    """Torna esse preset ativo (desativa todos os outros do user)."""
    user = _authenticate(authorization)
    user_id = str(user.id)
    client = get_admin_client()

    cur = (
        client.table("brief_presets")
        .select("id, user_id")
        .eq("id", brief_id)
        .maybe_single()
        .execute()
    )
    data = cur.data if cur else None
    if not data:
        raise HTTPException(status_code=404, detail="Preset nao encontrado")
    if data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Preset pertence a outro user")

    # Desativa todos os outros (constraint unique impede 2 ativos simultaneos)
    client.table("brief_presets").update({"is_active": False}).eq("user_id", user_id).eq("is_active", True).execute()

    # Ativa o pedido
    result = (
        client.table("brief_presets")
        .update({"is_active": True})
        .eq("id", brief_id)
        .execute()
    )
    return (result.data or [{}])[0]
