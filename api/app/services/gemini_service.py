import os
import re
import json
import logging
import concurrent.futures

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 20

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")


def _fetch_tags(artista_nome: str) -> list[str]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GOOGLE_API_KEY)
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
    text = response.text or ""
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        data = json.loads(match.group())
        tags = data.get("tags", [])
        if isinstance(tags, list) and tags:
            return [str(t).lower().strip() for t in tags]
    return []


def search_trending_tags(artista_nome: str) -> list[str]:
    """
    Usa Gemini com Google Search grounding para buscar os termos
    mais pesquisados no YouTube para o artista. Timeout de 20s.
    Retorna lista vazia se falhar ou timeout.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY não configurada — tags trending não buscadas")
        return []

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_fetch_tags, artista_nome)
            tags = future.result(timeout=_TIMEOUT_SECONDS)
            logger.info("Gemini retornou %d tags para '%s'", len(tags), artista_nome)
            return tags
    except concurrent.futures.TimeoutError:
        logger.warning("Gemini timeout (%ds) para '%s' — continuando sem tags", _TIMEOUT_SECONDS, artista_nome)
        return []
    except Exception as exc:
        logger.error("Erro no gemini_service para '%s': %s", artista_nome, exc)
        return []
