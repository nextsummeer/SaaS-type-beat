import os
import json
import logging

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = "claude-sonnet-4-6"


def generate_metadata(
    artista_nome: str,
    bpm: int | None,
    music_key: str | None,
    top_tracks: list[str],
    trending_tags: list[str],
    producer_nome: str | None,
    producer_instagram: str | None,
    producer_email: str | None,
    store_link: str | None = None,
) -> dict:
    """
    Usa Claude para gerar:
    - beat_name: nome criativo inspirado nos top tracks do artista
    - titulo: título do vídeo no formato YouTube type beat
    - descricao: descrição completa com template + 40-60 IDEOTAGS embutidas (campo Descrição YouTube, limite 5000 chars)
    - tags: lista de 12-15 tags fortes para o campo Tags do YouTube (limite 500 chars)

    Retorna dict com chaves: beat_name, titulo, descricao, tags (list[str])
    Lança exceção se falhar.
    """
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY não configurada")

    from anthropic import Anthropic

    client = Anthropic(api_key=ANTHROPIC_API_KEY)

    bpm_str = str(bpm) if bpm else "?"
    key_str = music_key or "?"
    top_tracks_str = ", ".join(f'"{t}"' for t in top_tracks) if top_tracks else "(não disponível)"
    trending_str = ", ".join(trending_tags[:20]) if trending_tags else "(não disponível)"
    nome_str = producer_nome or "[Nome do Produtor]"
    instagram_handle = producer_instagram.lstrip("@") if producer_instagram else ""
    instagram_str = f"@{instagram_handle}" if instagram_handle else "@seuinstagram"
    instagram_link = f"https://instagram.com/{instagram_handle}" if instagram_handle else "https://instagram.com/seuinstagram"
    email_str = producer_email or "seuemail@gmail.com"
    link_str = store_link.strip() if store_link else "[insira seu link de venda]"

    prompt = f"""Você é um especialista em SEO para type beats no YouTube. Preciso que você gere o conteúdo completo para um vídeo de type beat.

DADOS DO BEAT:
- Artista de referência: {artista_nome}
- BPM: {bpm_str}
- Tom: {key_str}
- Top musicas do artista no Spotify: {top_tracks_str}
- Termos trending no YouTube para este artista: {trending_str}

DADOS DO PRODUTOR:
- Nome: {nome_str}
- Instagram: {instagram_str}
- Email: {email_str}

INSTRUÇÕES:

1. BEAT_NAME: Crie um nome criativo e curto (1-3 palavras, MAIÚSCULAS) no estilo lexical do artista, INSPIRADO (não cópia exata) nos títulos das músicas dele. Ex para Drake: "GOD MODE", "FEELINGS", "WORTH IT". Ex para Nettspend: "COLD NIGHTS", "SPIN THE BLOCK", "OK OK".

2. TITULO: Monte o título do vídeo neste formato exato:
   [FREE] {artista_nome} type beat "BEAT_NAME"
   (substitua BEAT_NAME pelo nome que você criou)

3. DESCRICAO: Monte a descrição EXATAMENTE neste template (substituindo os campos entre chaves):

💵 Purchase this beat: {link_str}
Free Download | Purchase (For Profit): {link_str}

free ONLY for NON PROFIT use. credit is always required
MUST purchase a lease for uploading your track on streaming platforms (apple music, spotify etc.)

BPM - {bpm_str}
Key - {key_str}

BEAT_NAME
(prod. {nome_str})

Contact me here:
Instagram - {instagram_str}
📷 {instagram_link}
E-mail - {email_str}

#{artista_nome.lower().replace(" ", "")}typebeat #trapbeat #{bpm_str}bpm

IDEOTAGS:
[AQUI VOCÊ VAI COLOCAR O BLOCO DE IDEOTAGS — veja instrução 4]

4. IDEOTAGS (para o CAMPO DESCRIÇÃO do YouTube — limite 5000 chars): Gere 40 a 60 variações de keywords no estilo da descrição de type beats no YouTube. São palavras-chave separadas por vírgula que ficam no final da descrição (servem para SEO). Use os termos trending como base e expanda com:
   - Variações básicas: "[artista] type beat", "type beat [artista]", "[artista] type beat free", "free [artista] type beat"
   - Com BPM/tom: "[artista] [bpm] bpm type beat", "[artista] [key] type beat"
   - Com ano: "[artista] type beat 2025", "[artista] 2025 type beat"
   - Cruzamentos: "[artista] x [artista2] type beat" (use artistas dos top tracks como referência)
   - Variações de gênero: "[artista] trap beat", "[artista] drill beat", "[artista] instrumental"
   - Livre para comprar/download: "free type beat", "free [artista] instrumental"
   - Com "prod": "type beat prod [nome produtor]", "[artista] type beat prod [nome produtor]"
   Tudo em lowercase, sem # neste bloco.

5. TAGS (para o CAMPO TAGS oficial do YouTube — limite 500 chars TOTAIS): Retorne um array JSON com 12 a 15 tags FORTES e SELECIONADAS (não é a mesma lista das IDEOTAGS). Devem ser as keywords mais valiosas para SEO, somadas (com vírgulas) caber em ~450 chars. Priorize:
   - "[artista] type beat" (sempre incluir)
   - "type beat [artista]"
   - "free [artista] type beat"
   - "[artista] [bpm] bpm type beat"
   - "[artista] type beat 2025"
   - 1-2 cruzamentos com artistas dos top tracks
   - 1-2 do trending
   - Variação de gênero principal
   Tudo em lowercase. Mantenha tags curtas (2-4 palavras) para caber em 500 chars no total.

Responda APENAS com JSON válido neste formato exato:
{{
  "beat_name": "NOME DO BEAT",
  "titulo": "título completo do vídeo",
  "descricao": "descrição completa conforme template acima",
  "tags": ["tag 1", "tag 2", "tag 3", ...]
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=6000,
        messages=[{"role": "user", "content": prompt}],
        timeout=120,
    )

    raw = response.content[0].text.strip()

    # Remove bloco de código markdown se presente
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    data = json.loads(raw)

    required = ["beat_name", "titulo", "descricao", "tags"]
    for key in required:
        if key not in data:
            raise ValueError(f"Claude não retornou campo obrigatório: {key}")

    logger.info(
        "Claude gerou beat_name='%s' com %d tags para artista='%s'",
        data["beat_name"], len(data["tags"]), artista_nome,
    )
    return data
