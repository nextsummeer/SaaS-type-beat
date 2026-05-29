"""Worker cover — orquestra geracao de capa via IA.

ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md

Fluxo refresh-safe (sequencial pra MVP, lote = 1 ou 3):
    0. Pre-check creditos
    1. Pra cada item do lote:
        a. INSERT cover_library com status='pending' (Realtime → skeleton no frontend)
        b. cover_prompt_builder → prompt final
        c. fal.ai → URL temporaria
        d. download + hash + upload storage + signed URL
        e. UPDATE cover_library SET status='ready', image_url=..., etc
        f. credits_service.consume(1) — SO depois do UPDATE ready
           (exceto primeira capa do user: onboarding free)
    Se qualquer etapa (b-e) falhar:
        UPDATE cover_library SET status='failed' (frontend mostra erro no card)
        NAO consome credito.

Vantagem do INSERT pending logo:
- Skeleton no grid sobrevive a refresh (vem do DB, nao state local)
- Realtime dispara nos 2 momentos (INSERT pending + UPDATE ready)
- Falhas ficam visiveis com status='failed' (user pode deletar)

NOTA assinatura URL: signed URL valida por 1 ano. Quando expirar, criar
endpoint batch pra renovar. Documentar como divida tecnica.
"""
import hashlib
import logging
import time
import uuid

import requests

from app.services import credits_service
from app.services.cover_prompt_builder import build_cover_prompt, parse_brief
from app.services.fal_service import generate_cover
from app.services.supabase_service import get_admin_client

logger = logging.getLogger(__name__)

COVERS_BUCKET = "covers"

# Retry config -- aplicado em operacoes transientes (fal.ai, download, upload).
# Saldo zerado (exhausted_balance) NUNCA tem retry -- Gustavo controla manual.
# content_policy_violation tem retry ESPECIFICO via safety_mode no builder.
RETRY_MAX_EXTRA_ATTEMPTS = 2  # alem da 1a tentativa, total = 3
RETRY_BASE_DELAY_SECONDS = 2  # 1a espera 2s, 2a espera 4s (exponencial)


def _call_fal_with_retries(prompt: str, user_id: str) -> dict | None:
    """Chama fal.ai com retries em erros transientes.

    NAO retry:
    - exhausted_balance (saldo zerado -- Gustavo controla manual)
    - content_policy_violation (caller faz retry com safety_mode no builder)

    Retry em:
    - None (timeout/network)
    - dict com erro generico (qualquer outro tipo)
    """
    last_result: dict | None = None
    for attempt in range(RETRY_MAX_EXTRA_ATTEMPTS + 1):
        last_result = generate_cover(prompt, user_id=user_id)

        if last_result and last_result.get("ok"):
            return last_result

        if last_result and last_result.get("error") in (
            "exhausted_balance",
            "content_policy_violation",
        ):
            return last_result  # caller decide

        if attempt < RETRY_MAX_EXTRA_ATTEMPTS:
            delay = RETRY_BASE_DELAY_SECONDS * (2 ** attempt)
            logger.info(
                "cover worker: fal.ai falhou (tentativa %d/%d), retry em %ds",
                attempt + 1, RETRY_MAX_EXTRA_ATTEMPTS + 1, delay,
            )
            time.sleep(delay)

    return last_result


def _download_with_retries(url: str, timeout: int) -> bytes | None:
    """Download da imagem do fal.ai com retries exponenciais."""
    for attempt in range(RETRY_MAX_EXTRA_ATTEMPTS + 1):
        try:
            resp = requests.get(url, timeout=timeout)
            resp.raise_for_status()
            return resp.content
        except Exception as exc:
            if attempt < RETRY_MAX_EXTRA_ATTEMPTS:
                delay = RETRY_BASE_DELAY_SECONDS * (2 ** attempt)
                logger.info(
                    "cover worker: download falhou (tentativa %d/%d): %s, retry em %ds",
                    attempt + 1, RETRY_MAX_EXTRA_ATTEMPTS + 1, exc, delay,
                )
                time.sleep(delay)
            else:
                logger.error(
                    "cover worker: download falhou apos %d tentativas: %s",
                    RETRY_MAX_EXTRA_ATTEMPTS + 1, exc,
                )
    return None


def _upload_with_retries(client, storage_path: str, image_bytes: bytes) -> bool:
    """Upload pra Supabase Storage com retries."""
    for attempt in range(RETRY_MAX_EXTRA_ATTEMPTS + 1):
        try:
            client.storage.from_(COVERS_BUCKET).upload(
                path=storage_path,
                file=image_bytes,
                file_options={
                    "content-type": "image/jpeg",
                    "upsert": "false",
                },
            )
            return True
        except Exception as exc:
            if attempt < RETRY_MAX_EXTRA_ATTEMPTS:
                delay = RETRY_BASE_DELAY_SECONDS * (2 ** attempt)
                logger.info(
                    "cover worker: upload falhou (tentativa %d/%d): %s, retry em %ds",
                    attempt + 1, RETRY_MAX_EXTRA_ATTEMPTS + 1, exc, delay,
                )
                time.sleep(delay)
            else:
                logger.error(
                    "cover worker: upload falhou apos %d tentativas: %s",
                    RETRY_MAX_EXTRA_ATTEMPTS + 1, exc,
                )
    return False
SIGNED_URL_EXPIRY_SECONDS = 31_536_000  # 1 ano
FAL_DOWNLOAD_TIMEOUT_SECONDS = 30


def generate_covers(
    user_id: str,
    brief: dict,
    lote: int = 1,
    force_variation: bool = False,
    brief_preset_id: str | None = None,
) -> dict:
    """Gera N capas via IA pro user. Cobra apenas pelo que entrega.

    Args:
        user_id: dono.
        brief: dict v2 ja normalizado (genero_primario, artista_primario,
               quem_aparece, mood, cenario, atmosfera_luz, opcionais
               secundarios + nota_livre). Caller (routes) ja chamou
               normalize_brief() pra converter v1 se necessario.
        lote: 1 ou 3.
        brief_preset_id: id do brief_preset que originou a geracao (opcional).
               Quando presente, o nome do preset e resolvido aqui (com checagem
               de dono) e gravado como snapshot em cover_library pra exibicao no
               modal. T4.41.

    Returns:
        {
            ok: bool,
            generated_ids: list[str],      # ids de capas com status='ready'
            credits_consumed: int,
            credits_remaining: int,
            errors: list[str],
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

    # Resolve o nome do preset que originou a geracao (snapshot de fallback).
    # Checa dono: so linka se o preset pertence ao mesmo user. T4.41.
    brief_preset_name: str | None = None
    if brief_preset_id:
        try:
            preset_resp = (
                client.table("brief_presets")
                .select("name, user_id")
                .eq("id", brief_preset_id)
                .maybe_single()
                .execute()
            )
            preset_row = preset_resp.data if preset_resp else None
            if preset_row and preset_row.get("user_id") == user_id:
                brief_preset_name = preset_row.get("name")
            else:
                # preset inexistente ou de outro user: nao linka
                logger.warning(
                    "cover worker: brief_preset_id=%s nao pertence a user=%s -- ignorando link",
                    brief_preset_id, user_id,
                )
                brief_preset_id = None
        except Exception as exc:
            logger.warning("cover worker: falha resolver brief_preset %s: %s", brief_preset_id, exc)
            brief_preset_id = None

    # Onboarding free: primeira capa do user e gratuita
    profile_resp = (
        client.table("user_profiles")
        .select("has_generated_first_cover")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    profile_row = profile_resp.data if profile_resp else None
    is_first_ever = not (profile_row and profile_row.get("has_generated_first_cover"))

    # Pre-check de creditos
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

        # a. INSERT pending — Realtime dispara skeleton no frontend
        pending_id = _insert_pending(
            client, user_id, brief,
            brief_preset_id=brief_preset_id,
            brief_preset_name=brief_preset_name,
        )
        if not pending_id:
            errors.append(f"{label}: falha ao criar registro pending")
            continue

        # Helper pra marcar como failed e seguir. Aceita opcional prompt_final
        # pra preservar texto rejeitado pelo validator (debug no DB).
        def _fail(reason: str, prompt_to_save: str | None = None,
                  seeds_to_save: dict | None = None):
            errors.append(f"{label}: {reason}")
            update_payload: dict = {"status": "failed"}
            if prompt_to_save:
                update_payload["prompt_final"] = prompt_to_save
            if seeds_to_save:
                update_payload["variation_seeds"] = seeds_to_save
            try:
                client.table("cover_library").update(update_payload).eq(
                    "id", pending_id
                ).execute()
            except Exception as exc:
                logger.error("cover worker: falha ao marcar failed: %s", exc)

        # b. Claude monta prompt final (builder v3 -- retorna BuildResult)
        try:
            cover_brief = parse_brief(brief)
        except ValueError as exc:
            _fail(f"brief invalido: {exc}")
            continue

        build_result = build_cover_prompt(
            cover_brief,
            user_id=user_id,
            force_variation=force_variation,
        )
        # Builder retorna prompt_final mesmo quando validation falha (pra debug).
        # Decisao de continuar usa validation_passed.
        if not build_result.validation_passed:
            _fail(
                f"falha em builder v3: {build_result.validation_error or 'sem prompt'} (sem cobranca)",
                prompt_to_save=build_result.prompt_final,
                seeds_to_save=build_result.variation_seeds or None,
            )
            continue
        prompt_final = build_result.prompt_final
        variation_seeds = build_result.variation_seeds

        # c. fal.ai gera imagem (com retries automaticos pra erros transientes)
        fal_result = _call_fal_with_retries(prompt_final, user_id=user_id)

        # c.1 Retry especifico pra content_policy_violation: builder regenera
        # prompt em safety_mode (instrucao ultra-conservadora). Cliente nao ve
        # falha -- so demora ~50s em vez de ~25s.
        if fal_result and fal_result.get("error") == "content_policy_violation":
            logger.info(
                "cover worker: content_policy_violation -- tentando retry com "
                "safety_mode (cover_id=%s)", pending_id
            )
            retry_build = build_cover_prompt(
                cover_brief,
                user_id=user_id,
                force_variation=False,
                safety_mode=True,
            )
            if retry_build.validation_passed and retry_build.prompt_final:
                prompt_final = retry_build.prompt_final
                variation_seeds = retry_build.variation_seeds
                # Tenta fal.ai novamente -- com retries do mesmo jeito
                fal_result = _call_fal_with_retries(prompt_final, user_id=user_id)
            else:
                logger.warning(
                    "cover worker: retry build falhou: %s",
                    retry_build.validation_error,
                )

        if not fal_result or not fal_result.get("ok"):
            error_label = (fal_result or {}).get("error", "fal_unknown")
            error_msg = (fal_result or {}).get("message", "falha generica")
            _fail(
                f"falha em fal_service ({error_label}): {error_msg} (sem cobranca)",
                prompt_to_save=prompt_final,
                seeds_to_save=variation_seeds or None,
            )
            continue

        fal_url = fal_result["url"]
        fal_cost = fal_result.get("cost_usd", 0.0)

        # d.1 Download bytes (com retries em erro de rede)
        image_bytes = _download_with_retries(fal_url, FAL_DOWNLOAD_TIMEOUT_SECONDS)
        if image_bytes is None:
            _fail(
                "falha download da imagem apos retries (sem cobranca)",
                prompt_to_save=prompt_final,
                seeds_to_save=variation_seeds or None,
            )
            continue

        # d.2 Hash pra dedup
        image_hash = hashlib.sha256(image_bytes).hexdigest()

        # d.3 Upload Storage (com retries em rate limit / falha de rede)
        cover_uuid = str(uuid.uuid4())
        storage_path = f"{user_id}/library/{cover_uuid}.jpg"
        if not _upload_with_retries(client, storage_path, image_bytes):
            _fail(
                "falha upload storage apos retries (sem cobranca)",
                prompt_to_save=prompt_final,
                seeds_to_save=variation_seeds or None,
            )
            continue

        # d.4 Signed URL (1 ano)
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
            _fail("falha gerar signed URL (sem cobranca)")
            _cleanup_storage(client, storage_path)
            continue

        # e. UPDATE pending → ready (com variation_seeds do builder v2)
        total_cost = round(fal_cost + 0.005, 6)
        try:
            client.table("cover_library").update({
                "image_url": image_url,
                "storage_path": storage_path,
                "image_hash": image_hash,
                "prompt_final": prompt_final,
                "variation_seeds": variation_seeds,
                "cost_usd": total_cost,
                "status": "ready",
            }).eq("id", pending_id).execute()
        except Exception as exc:
            logger.error("cover worker: falha UPDATE ready: %s", exc)
            _fail("falha ao salvar registro final (sem cobranca)")
            _cleanup_storage(client, storage_path)
            continue

        # f. Cobra credito — exceto se for a primeira capa do user
        is_free_onboarding = is_first_ever and len(generated_ids) == 0
        if is_free_onboarding:
            logger.info("cover worker: onboarding free aplicado user=%s", user_id)
        else:
            consume_result = credits_service.consume(user_id, 1)
            if not consume_result.get("ok"):
                # Race condition: rollback do registro (delete + cleanup storage)
                logger.warning("cover worker: race condition consume user=%s", user_id)
                try:
                    client.table("cover_library").delete().eq("id", pending_id).execute()
                except Exception as exc:
                    logger.error("cover worker: falha rollback: %s", exc)
                _cleanup_storage(client, storage_path)
                errors.append(f"{label}: creditos zeraram durante geracao (sem cobranca)")
                break
            credits_consumed += 1

        generated_ids.append(pending_id)
        logger.info(
            "cover worker: capa gerada user=%s cover_id=%s hash=%s cost=%.4f free=%s",
            user_id, pending_id, image_hash[:8], total_cost, is_free_onboarding,
        )

        # Marca onboarding usado apos a primeira capa entregue
        if is_free_onboarding:
            try:
                client.table("user_profiles").update({
                    "has_generated_first_cover": True
                }).eq("user_id", user_id).execute()
            except Exception as exc:
                logger.error("cover worker: falha ao marcar onboarding: %s", exc)

    final_state = credits_service.get_remaining(user_id)
    return {
        "ok": len(generated_ids) > 0,
        "generated_ids": generated_ids,
        "credits_consumed": credits_consumed,
        "credits_remaining": final_state.get("remaining", 0),
        "errors": errors,
    }


def _insert_pending(
    client,
    user_id: str,
    brief: dict,
    brief_preset_id: str | None = None,
    brief_preset_name: str | None = None,
) -> str | None:
    """Cria a row pending em cover_library e retorna o id."""
    try:
        resp = client.table("cover_library").insert({
            "user_id": user_id,
            "image_url": None,
            "storage_path": None,
            "image_hash": None,
            "brief_used": brief,
            "brief_preset_id": brief_preset_id,
            "brief_preset_name": brief_preset_name,
            "prompt_final": None,
            "cost_usd": 0,
            "source": "ai_generated",
            "status": "pending",
        }).execute()
        row = (resp.data or [{}])[0]
        return row.get("id")
    except Exception as exc:
        logger.error("cover worker: falha INSERT pending: %s", exc)
        return None


def _cleanup_storage(client, storage_path: str) -> None:
    """Best-effort: remove arquivo do storage."""
    try:
        client.storage.from_(COVERS_BUCKET).remove([storage_path])
        logger.info("cover worker: cleanup storage_path=%s", storage_path)
    except Exception as exc:
        logger.warning("cover worker: falha cleanup storage (%s): %s", storage_path, exc)
