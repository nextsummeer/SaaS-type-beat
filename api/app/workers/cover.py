"""Worker cover — orquestra geracao de capa via IA.

ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md

Fluxo (sequencial pra MVP, lote = 1 ou 3):
    0. Pre-check: get_remaining(user_id) — falha rapido se sem creditos
       (exceto se user ainda nao gerou a primeira capa — onboarding free).
    1. Pra cada item do lote:
        a. cover_prompt_builder.build_cover_prompt → prompt final
        b. fal_service.generate_cover(prompt) → URL temporaria
        c. requests.get(URL) → bytes
        d. hashlib.sha256(bytes) → image_hash (dedup)
        e. Supabase Storage upload em covers/{user_id}/library/{uuid}.jpg
        f. create_signed_url (1 ano) → image_url salva na biblioteca
        g. INSERT cover_library
        h. credits_service.consume(user_id, 1) — SO depois do INSERT bem-sucedido
           E SO se nao for a primeira capa do user (onboarding free)
        i. Apos primeira capa entregue, marca has_generated_first_cover=true

Trade-off: cobra apenas pelo que entrega. Se item falhar em qualquer etapa,
NAO consome credito (produtor nao paga por capa que nao recebeu).
Custo meu (Claude+fal.ai) pode ser pago mesmo em falha — registrado em
api_usage. Isso e custo operacional, nao do produtor.

Onboarding free: primeira capa por user e GRATUITA (padrao SaaS).
Flag has_generated_first_cover em user_profiles. So aplica pra primeira capa
TOTAL do user — se o lote for 3 e ele esta no onboarding, capa 1 e free,
capas 2 e 3 consomem credito normalmente.

NOTA assinatura URL: signed URL valida por 1 ano. Quando expirar, criar
endpoint batch pra renovar. Documentar como divida tecnica.
"""
import hashlib
import logging
import uuid

import requests

from app.services import credits_service
from app.services.cover_prompt_builder import build_cover_prompt
from app.services.fal_service import generate_cover
from app.services.supabase_service import get_admin_client

logger = logging.getLogger(__name__)

COVERS_BUCKET = "covers"
SIGNED_URL_EXPIRY_SECONDS = 31_536_000  # 1 ano
FAL_DOWNLOAD_TIMEOUT_SECONDS = 30


def generate_covers(
    user_id: str,
    brief: dict,
    artista_nome: str,
    lote: int = 1,
) -> dict:
    """Gera N capas via IA pro user e salva na biblioteca.

    Cobra creditos apenas pelo que entregou com sucesso. Falha em qualquer
    etapa (Claude, fal.ai, download, storage, INSERT) NAO consome credito.

    Args:
        user_id: dono.
        brief: dict com chaves opcionais sujeito/ambiente/iluminacao/energia/nota_livre.
        artista_nome: nome do artista (resolvido pelo caller).
        lote: 1 ou 3.

    Returns:
        {
            ok: bool,                    # True se gerou pelo menos 1
            generated_ids: list[str],    # cover_ids inseridos
            credits_consumed: int,       # quantos creditos foram cobrados (= len(generated_ids))
            credits_remaining: int,      # restantes apos esta operacao
            errors: list[str],           # mensagens dos itens que falharam (sem cobranca)
        }
    """
    if lote not in (1, 3):
        return {
            "ok": False,
            "generated_ids": [],
            "credits_consumed": 0,
            "credits_remaining": 0,
            "errors": [f"lote invalido: {lote} (deve ser 1 ou 3)"],
        }

    client = get_admin_client()

    # Onboarding free: primeira capa do user e gratuita.
    profile_resp = (
        client.table("user_profiles")
        .select("has_generated_first_cover")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    profile_row = profile_resp.data if profile_resp else None
    is_first_ever = not (profile_row and profile_row.get("has_generated_first_cover"))

    # Pre-check de creditos: precisa cobrir lote inteiro,
    # MENOS 1 se for a primeira capa do user (essa nao consome).
    creditos_necessarios = max(0, lote - (1 if is_first_ever else 0))
    initial_state = credits_service.get_remaining(user_id)
    if initial_state.get("remaining", 0) < creditos_necessarios:
        return {
            "ok": False,
            "generated_ids": [],
            "credits_consumed": 0,
            "credits_remaining": initial_state.get("remaining", 0),
            "errors": [
                f"sem creditos suficientes (precisa {creditos_necessarios}, "
                f"tem {initial_state.get('remaining', 0)})"
            ],
        }

    generated_ids: list[str] = []
    errors: list[str] = []
    credits_consumed = 0

    for i in range(lote):
        label = f"item {i+1}/{lote}"

        # a. Claude monta prompt final
        prompt_final = build_cover_prompt(brief, artista_nome, user_id=user_id)
        if not prompt_final:
            errors.append(f"{label}: falha em cover_prompt_builder (sem cobranca)")
            continue

        # b. fal.ai gera imagem
        fal_result = generate_cover(prompt_final, user_id=user_id)
        if not fal_result:
            errors.append(f"{label}: falha em fal_service (sem cobranca)")
            continue

        fal_url = fal_result["url"]
        fal_cost = fal_result.get("cost_usd", 0.0)

        # c. Baixa bytes
        try:
            resp = requests.get(fal_url, timeout=FAL_DOWNLOAD_TIMEOUT_SECONDS)
            resp.raise_for_status()
            image_bytes = resp.content
        except Exception as exc:
            logger.error("cover worker: falha download fal.ai: %s", exc)
            errors.append(f"{label}: falha download da imagem (sem cobranca)")
            continue

        # d. Hash pra dedup
        image_hash = hashlib.sha256(image_bytes).hexdigest()

        # e. Upload Storage
        cover_uuid = str(uuid.uuid4())
        storage_path = f"{user_id}/library/{cover_uuid}.jpg"
        try:
            client.storage.from_(COVERS_BUCKET).upload(
                path=storage_path,
                file=image_bytes,
                file_options={
                    "content-type": "image/jpeg",
                    "upsert": "false",
                },
            )
        except Exception as exc:
            logger.error("cover worker: falha upload storage: %s", exc)
            errors.append(f"{label}: falha upload storage (sem cobranca)")
            continue

        # f. Signed URL (1 ano)
        image_url = None
        try:
            signed = client.storage.from_(COVERS_BUCKET).create_signed_url(
                storage_path,
                SIGNED_URL_EXPIRY_SECONDS,
            )
            if signed:
                image_url = signed.get("signedURL") or signed.get("signed_url")
        except Exception as exc:
            logger.error("cover worker: falha signed URL: %s", exc)

        if not image_url:
            errors.append(f"{label}: falha gerar signed URL (sem cobranca)")
            _cleanup_storage(client, storage_path)
            continue

        # g. INSERT cover_library
        total_cost = round(fal_cost + 0.005, 6)  # fal + estimativa Claude

        cover_id = None
        try:
            insert_resp = client.table("cover_library").insert({
                "user_id": user_id,
                "image_url": image_url,
                "storage_path": storage_path,
                "image_hash": image_hash,
                "brief_used": brief,
                "prompt_final": prompt_final,
                "cost_usd": total_cost,
                "source": "ai_generated",
            }).execute()

            row = (insert_resp.data or [{}])[0]
            cover_id = row.get("id")
        except Exception as exc:
            logger.error("cover worker: falha INSERT cover_library: %s", exc)

        if not cover_id:
            errors.append(f"{label}: falha INSERT db (sem cobranca)")
            _cleanup_storage(client, storage_path)
            continue

        # h. Cobra credito (capa ja esta entregue) — EXCETO se for a primeira
        #    capa do user (onboarding free). Esse free aplica uma unica vez.
        is_free_onboarding = is_first_ever and len(generated_ids) == 0
        if is_free_onboarding:
            logger.info(
                "cover worker: onboarding free aplicado — user=%s, capa nao consome credito",
                user_id,
            )
        else:
            consume_result = credits_service.consume(user_id, 1)
            if not consume_result.get("ok"):
                # Race condition rarissima: creditos zeraram entre o pre-check
                # e este consume (outro request paralelo consumiu). Rollback.
                logger.warning(
                    "cover worker: race condition consume falhou apos INSERT user=%s. Rollback.",
                    user_id,
                )
                try:
                    client.table("cover_library").delete().eq("id", cover_id).execute()
                except Exception as exc:
                    logger.error("cover worker: falha rollback INSERT: %s", exc)
                _cleanup_storage(client, storage_path)
                errors.append(f"{label}: creditos zeraram durante a geracao (sem cobranca)")
                break  # nao tenta mais — provavelmente os proximos tambem vao falhar
            credits_consumed += 1

        generated_ids.append(cover_id)
        logger.info(
            "cover worker: capa gerada user=%s cover_id=%s hash=%s cost=%.4f free=%s",
            user_id, cover_id, image_hash[:8], total_cost, is_free_onboarding,
        )

        # i. Marca onboarding usado apos a primeira capa entregue por este user
        if is_free_onboarding:
            try:
                client.table("user_profiles").update({
                    "has_generated_first_cover": True
                }).eq("user_id", user_id).execute()
            except Exception as exc:
                logger.error(
                    "cover worker: falha ao marcar has_generated_first_cover user=%s: %s",
                    user_id, exc,
                )

    final_state = credits_service.get_remaining(user_id)
    return {
        "ok": len(generated_ids) > 0,
        "generated_ids": generated_ids,
        "credits_consumed": credits_consumed,
        "credits_remaining": final_state.get("remaining", 0),
        "errors": errors,
    }


def _cleanup_storage(client, storage_path: str) -> None:
    """Best-effort: remove arquivo do storage se INSERT falhou apos upload."""
    try:
        client.storage.from_(COVERS_BUCKET).remove([storage_path])
        logger.info("cover worker: cleanup storage_path=%s", storage_path)
    except Exception as exc:
        logger.warning("cover worker: falha cleanup storage (%s): %s", storage_path, exc)
