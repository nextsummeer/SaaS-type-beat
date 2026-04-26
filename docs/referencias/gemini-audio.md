# Gemini API — Audio Understanding + Grounded Search

**Versao alvo:** google-genai 1.0+ (Python SDK novo, "google-genai" nao "google-generativeai")
**Modelo:** `gemini-2.5-flash` (estavel) ou `gemini-3-flash-preview` (mais novo)
**Docs oficiais:** https://ai.google.dev/gemini-api/docs/audio
**Atualizado:** 2026-04-25 via Context7

## Setup

```bash
pip install google-genai
export GOOGLE_API_KEY=...   # ou GEMINI_API_KEY
```

```python
from google import genai
from google.genai import types

client = genai.Client()  # le GOOGLE_API_KEY do env
```

## Upload de MP3 via File API

Files >20MB precisam usar File API (inline so funciona ate ~20MB). MP3 320kbps de 3min = ~7MB (inline ok). Pra seguranca, sempre usar File API:

```python
def upload_audio(mp3_path: str):
    audio_file = client.files.upload(file=mp3_path)
    # audio_file.uri pode ser usado em prompts
    return audio_file
```

Files ficam disponiveis 48h. Apos isso, re-upload.

## Analise de vibe (BPM, key, mood, artistas similares)

```python
def analyze_audio(mp3_path: str) -> dict:
    audio_file = client.files.upload(file=mp3_path)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            "Voce ouviu um beat instrumental. Analise e retorne JSON com:\n"
            "- bpm: int (estimativa)\n"
            "- key: str (ex: 'C# minor', 'F major')\n"
            "- vibe: str (3-5 palavras descrevendo, ex: 'dark, melodic, trap')\n"
            "- artistas_similares: list[str] (3-5 artistas que provavelmente comprariam ou usariam esse beat)\n"
            "- genero: str (trap, drill, hyperpop, plug, boom bap, etc)\n",
            audio_file,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "bpm": types.Schema(type=types.Type.INTEGER),
                    "key": types.Schema(type=types.Type.STRING),
                    "vibe": types.Schema(type=types.Type.STRING),
                    "artistas_similares": types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                    ),
                    "genero": types.Schema(type=types.Type.STRING),
                },
                required=["bpm", "key", "vibe", "artistas_similares", "genero"],
            ),
        ),
    )

    import json
    return json.loads(response.text)
```

## Grounded search (tags trending no YouTube)

```python
def search_trending_tags(artistas: list[str]) -> dict:
    artistas_str = ", ".join(artistas)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=(
            f"Pesquise no Google as tags YouTube mais usadas em videos de "
            f"'{artistas_str} type beat' nos ultimos 30 dias. "
            f"Retorne JSON com array 'tags' contendo 15+ tags ordenadas por uso, "
            f"sem aspas, sem #, lowercase."
        ),
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
        ),
    )

    # response tem .text + .candidates[0].grounding_metadata pra fontes
    import json, re
    # Gemini pode embrulhar em ```json ... ```
    match = re.search(r"\{.*\}", response.text, re.DOTALL)
    return json.loads(match.group())
```

Nao da pra usar `response_schema` + `google_search` ao mesmo tempo. Por isso parsing manual.

## Custos (referencia 2026)

- gemini-2.5-flash: ~$0.075 / 1M input tokens, ~$0.30 / 1M output
- Audio: 32 tokens / segundo de audio. Beat 3min = ~5760 tokens
- Analise tipica: ~6k input + 200 output = ~$0.0005/beat
- Grounded search: 1500 input + 500 output + custo grounding ~$0.035/request
- **Beat completo (audio + grounded): ~$0.04**

Track via `usage_tracker.track(user_id, "gemini_audio", tokens_in, tokens_out)` em cada chamada.

## Gotchas

- **SDK: google-genai (novo) NAO google-generativeai (antigo)** — APIs diferentes, nao misturar imports
- **`gemini-3-flash-preview` e preview** — mais barato e novo, mas pode mudar. Pra MVP estavel use `gemini-2.5-flash`
- **File API: arquivos expiram em 48h** — re-uploadar antes de re-usar
- **Quota free tier:** 15 RPM, 1500 RPD pra Flash. Suficiente pra MVP <100 beats/dia
- **Grounded search nao retorna response_schema estruturado** — parse manual com regex/json
- **Audio formats suportados:** mp3, wav, flac, m4a, ogg. Beat ja convertido pra MP3 320 vai bem
- **Hallucinacao em BPM/key:** Gemini erra ate 10% em casos exoticos. Tolerancia +-5% no T3.5 e razoavel
- **Idioma do prompt:** misturar PT-BR + EN no prompt funciona. Pode pedir output em PT
