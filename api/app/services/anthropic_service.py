import os
import json
import time
import logging

from app.services import usage_tracker

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = "claude-sonnet-4-6"


def _apply_title_style(titulo: str, style: str) -> str:
    """
    Forca o formato do titulo de acordo com a preferencia do produtor,
    mesmo se o Claude tiver errado uma das regras.

    'default'   -> passa direto, sem modificacao.
    'lowercase' -> [free] a + b type beat - "beat name"
                   (caixa baixa, ' + ' entre artistas, ' - ' antes das aspas).
    """
    if style != "lowercase":
        return titulo

    titulo = titulo.lower()

    # Quebra na primeira aspas pra processar so a parte ANTES (nome do beat
    # fica intacto, so vira lowercase pelo .lower() acima).
    if '"' in titulo:
        idx = titulo.index('"')
        antes = titulo[:idx].rstrip()
        depois = titulo[idx:]
        antes = antes.replace(" x ", " + ")
        if not antes.endswith("-"):
            antes = antes + " -"
        return antes + " " + depois

    return titulo.replace(" x ", " + ")


def generate_metadata(
    artistas: list[str],
    bpm: int | None,
    music_key: str | None,
    top_tracks: list[str],
    trending_tags: list[str],
    producer_nome: str | None,
    producer_instagram: str | None,
    producer_email: str | None,
    store_link: str | None = None,
    user_id: str | None = None,
    beat_id: str | None = None,
    title_style: str = "default",
    music_scale: str | None = None,
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

    # Normaliza lista de artistas
    artistas_clean = [a.strip() for a in (artistas or []) if a and a.strip()] or ["type beat"]
    artista_nome = " x ".join(artistas_clean)
    artista_principal = artistas_clean[0]
    eh_colab = len(artistas_clean) >= 2
    artistas_lista_str = ", ".join(f'"{a}"' for a in artistas_clean)

    # Hashtags do template: tag por artista + (se colab) tag composta
    def _slug(s: str) -> str:
        return s.lower().replace(" ", "")
    hashtags = [f"#{_slug(a)}typebeat" for a in artistas_clean]
    if eh_colab:
        hashtags.append(f"#{'x'.join(_slug(a) for a in artistas_clean)}typebeat")
    hashtags_str = " ".join(hashtags) + f" #trapbeat #{bpm if bpm else '140'}bpm"

    bpm_str = str(bpm) if bpm else "?"
    # T4.39 -- key+scale separados. Concat pra display ("C# Major").
    # Back-compat: se music_key ja vier "A minor" (string composta legacy),
    # usa direto.
    if music_key and music_scale:
        key_str = f"{music_key} {music_scale}"
    elif music_key:
        key_str = music_key
    else:
        key_str = "?"
    top_tracks_str = ", ".join(f'"{t}"' for t in top_tracks) if top_tracks else "(não disponível)"
    trending_str = ", ".join(trending_tags[:20]) if trending_tags else "(não disponível)"
    nome_str = producer_nome or "[Nome do Produtor]"
    instagram_handle = producer_instagram.lstrip("@") if producer_instagram else ""
    instagram_str = f"@{instagram_handle}" if instagram_handle else "@seuinstagram"
    instagram_link = f"https://instagram.com/{instagram_handle}" if instagram_handle else "https://instagram.com/seuinstagram"
    email_str = producer_email or "seuemail@gmail.com"
    link_str = store_link.strip() if store_link else "[insira seu link de venda]"

    multi_artist_note = (
        f"\n\nIMPORTANTE: este beat é uma COLABORAÇÃO com {len(artistas_clean)} artistas: {artistas_lista_str}."
        f" O artista PRINCIPAL (que inspira o BEAT_NAME e cuja estética guia o título) é '{artista_principal}'."
        f" Os outros são colaboradores — apareçam no título no formato 'A x B x C', e ganhem tags próprias."
        if eh_colab else ""
    )

    # Camada 1 do estilo do titulo: instrucao explicita pro Claude.
    # Camada 2 (defensiva): _apply_title_style abaixo, garante o formato
    # mesmo se o Claude ignorar a instrucao.
    if title_style == "lowercase":
        artista_nome_titulo = artista_nome.lower().replace(" x ", " + ")
        titulo_instrucao = (
            f'Monte o título do vídeo neste formato EXATO (estilo lowercase, estética gen z):\n'
            f'   [free] {artista_nome_titulo} type beat - "beat_name"\n'
            f'   (substitua beat_name pelo nome que você criou, EM MINÚSCULAS)\n'
            f'   REGRAS OBRIGATÓRIAS:\n'
            f'   - "[free]" tudo em minúsculas, nunca "[FREE]"\n'
            f'   - " + " entre artistas (espaço-mais-espaço), nunca " x "\n'
            f'   - " - " (espaço-traço-espaço) ANTES das aspas do nome do beat\n'
            f'   - Nome do beat DENTRO das aspas em minúsculas: "ghost load", não "GHOST LOAD"\n'
            f'   - TUDO no título em minúsculas, sem exceção'
        )
    else:
        titulo_instrucao = (
            f'Monte o título do vídeo neste formato exato:\n'
            f'   [FREE] {artista_nome} type beat "BEAT_NAME"\n'
            f'   (substitua BEAT_NAME pelo nome que você criou)'
        )

    prompt = f"""Você é um especialista em SEO para type beats no YouTube. Preciso que você gere o conteúdo completo para um vídeo de type beat.

DADOS DO BEAT:
- Artista(s) de referência: {artista_nome}
- Lista de artistas: [{artistas_lista_str}]
- BPM: {bpm_str}
- Tom: {key_str}
- Top musicas do artista principal ({artista_principal}) no Spotify: {top_tracks_str}
- Termos trending no YouTube para este beat: {trending_str}{multi_artist_note}

DADOS DO PRODUTOR:
- Nome: {nome_str}
- Instagram: {instagram_str}
- Email: {email_str}

INSTRUÇÕES:

1. BEAT_NAME: Crie um nome criativo e curto (1-3 palavras, MAIÚSCULAS) no estilo lexical do artista PRINCIPAL ({artista_principal}), INSPIRADO (não cópia exata) nos títulos das músicas dele. Ex para Drake: "GOD MODE", "FEELINGS", "WORTH IT". Ex para Nettspend: "COLD NIGHTS", "SPIN THE BLOCK", "OK OK".

2. TITULO: {titulo_instrucao}

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

{hashtags_str}

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
   - "[artista] type beat" — UMA VARIAÇÃO POR ARTISTA da lista (essencial)
   - "type beat [artista]" — UMA por artista
   - "free [artista] type beat" — UMA por artista
   - "[artista1] x [artista2] type beat" — se há colaboração, incluir o cruzamento
   - "[artista principal] [bpm] bpm type beat"
   - "[artista principal] type beat 2025"
   - 1-2 do trending
   - Variação de gênero principal
   Tudo em lowercase. Mantenha tags curtas (2-4 palavras) para caber em 500 chars no total. Distribua tags entre todos os artistas da lista — não foque só no principal.

Responda APENAS com JSON válido neste formato exato:
{{
  "beat_name": "NOME DO BEAT",
  "titulo": "título completo do vídeo",
  "descricao": "descrição completa conforme template acima",
  "tags": ["tag 1", "tag 2", "tag 3", ...]
}}"""

    started = time.monotonic()
    response = client.messages.create(
        model=MODEL,
        max_tokens=6000,
        messages=[{"role": "user", "content": prompt}],
        timeout=120,
    )
    duration_ms = int((time.monotonic() - started) * 1000)

    # Registra custo em api_usage (tokens reais retornados pela Anthropic)
    usage = getattr(response, "usage", None)
    tokens_in = getattr(usage, "input_tokens", None) if usage else None
    tokens_out = getattr(usage, "output_tokens", None) if usage else None
    usage_tracker.track(
        user_id=user_id,
        feature="claude_sonnet_4_6",
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        duration_ms=duration_ms,
        beat_id=beat_id,
        metadata={"purpose": "generate_metadata", "model": MODEL},
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

    # Camada 2 (defensiva): forca o formato do titulo mesmo se Claude
    # tiver escapado de alguma regra do prompt acima. Descricao nao muda.
    titulo_antes = data["titulo"]
    data["titulo"] = _apply_title_style(data["titulo"], title_style)
    if titulo_antes != data["titulo"]:
        logger.info(
            "Pos-processamento ajustou titulo (style=%s): '%s' -> '%s'",
            title_style, titulo_antes, data["titulo"],
        )

    logger.info(
        "Claude gerou beat_name='%s' com %d tags para artistas=%s (title_style=%s)",
        data["beat_name"], len(data["tags"]), artistas_clean, title_style,
    )
    return data
