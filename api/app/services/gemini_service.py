import os
import re
import json
import time
import logging
import concurrent.futures

from app.services import usage_tracker

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 20

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")


def search_trending_tags(
    artista_nome: str,
    user_id: str | None = None,
    beat_id: str | None = None,
) -> list[str]:
    """
    Usa Gemini com Google Search grounding para buscar tags trending.
    Timeout real de 15s na chamada HTTP — não bloqueia o pipeline.
    Registra custo em api_usage via usage_tracker (se user_id fornecido).
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY não configurada — tags trending não buscadas")
        return []

    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_do_gemini, artista_nome, user_id, beat_id)
    try:
        tags = future.result(timeout=_TIMEOUT_SECONDS)
        logger.info("Gemini retornou %d tags para '%s'", len(tags), artista_nome)
        return tags
    except Exception as exc:
        logger.warning("Gemini timeout/erro para '%s': %s — sem tags", artista_nome, exc)
        return []
    finally:
        # shutdown(wait=False) não bloqueia em threads penduradas
        executor.shutdown(wait=False, cancel_futures=True)


def _do_gemini(artista_nome: str, user_id: str | None, beat_id: str | None) -> list[str]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GOOGLE_API_KEY)
    started = time.monotonic()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=(
            f"Pesquise no Google quais são as combinações de tags mais buscadas no YouTube "
            f"para '{artista_nome} type beat' nos últimos 30 dias. "
            f"Retorne um JSON com a chave 'tags' contendo uma lista de 20 a 30 termos, "
            f"ordenados por popularidade, sem # e em lowercase. "
            f"Exemplos de formato: 'drake type beat', 'free drake type beat', "
            f"'drake type beat 2025', 'drake x weeknd type beat'."
        ),
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
        ),
    )
    duration_ms = int((time.monotonic() - started) * 1000)

    # Registra custo (tokens via usage_metadata do SDK do Gemini)
    usage = getattr(response, "usage_metadata", None)
    tokens_in = getattr(usage, "prompt_token_count", None) if usage else None
    tokens_out = getattr(usage, "candidates_token_count", None) if usage else None
    usage_tracker.track(
        user_id=user_id,
        feature="gemini_2_5_flash",
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        duration_ms=duration_ms,
        beat_id=beat_id,
        metadata={"purpose": "trending_tags", "artista": artista_nome},
    )

    text = response.text or ""
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        data = json.loads(match.group())
        tags = data.get("tags", [])
        if isinstance(tags, list) and tags:
            return [str(t).lower().strip() for t in tags]
    return []
