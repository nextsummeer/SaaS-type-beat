# Prompt DNA da capa IA v3 — câmera video-still fixa, sub-locations por artista

**Data:** 2026-05-22
**Status:** aceita (substitui a entrega da v2, mantendo a arquitetura geral do pacote `cover_prompt_builder/`)
**Tags:** decisao, produto, mvp, ia, capa, claude, prompt-engineering, dna-v3, video-still, artist-universe

## Contexto

A v2 (ADR de 2026-05-21-prompt-dna-capa-v2) foi entregue em prod via commits T4.19-T4.26 e testada pelo Gustavo em 2026-05-21/22 na aba `/capas`. **Resultado: capas ficaram visualmente ruins.**

Gustavo conduziu sessão paralela com Claude normal e validou visualmente 5 briefs (Drake, The Weeknd, Fakemink+Gunnr, Nettspend+2hollis, Travis+Don Toliver) iterando o prompt manualmente direto contra o fal.ai. Da sessão saiu o documento `beatpost_handoff_v3.md` com a arquitetura validada.

**Por que a v2 falhou (autópsia):**

1. Câmera DNA estava em "analog film + 35mm + Canon Sure Shot" — gera estética cinematográfica polida, oposto do que o produto quer.
2. Estrutura de 7 blocos genéricos sem ancoragem cultural por artista.
3. Sub-locations genéricas por cenário (`rua_americana`, `interior_luxo`, etc.) — não casava com o universo visual específico do artista de referência.
4. Vocabulário em vocabulary.py era raso (1 linha por slug).
5. Vários eixos de variação (camera_angle, time_of_day, etc.) competiam com a "câmera fixa" do princípio mestre — gerava saída instável.
6. Faltavam guard-rails contra linguagem cinematográfica ("music video", "cinematic", "B-roll", "scene from", etc.).

## Decisão

### 1. Câmera DNA — video still de baixa resolução, FIXA

A câmera deixa de ser "analog film" e passa a ser **video still** (VHS, MiniDV, phone video comprimido, 720x480 letterbox bars). Texto integral fixo, palavra-por-palavra, em **2 variantes**:

**Variante padrão** (10 dos 11 gêneros):

```
A still frame extracted from a low-resolution video — looks like a screenshot
pulled from a phone video recorded at night and uploaded compressed, or a VHS
camcorder recording, or an early 2000s MiniDV tape. Not a photograph — a frozen
frame from footage. Resolution feels capped around 720x480, the dimensions of
standard-definition video, slightly stretched. The image has the unmistakable
quality of a video still: very subtle motion blur, mild soft focus throughout,
edges that feather slightly rather than cut sharp. Light video compression
softness across the frame, gentle color banding in gradients. Thin black
letterbox bars on top and bottom of the frame. The image is gently degraded —
soft, not destroyed.
```

**Variante underground** (apenas quando `genero_primario == underground_trap` OU `genero_secundario == underground_trap`):

```
A still frame extracted from a low-resolution video — looks like a screenshot
pulled from a VHS camcorder recording, an early 2000s MiniDV tape, or a
compressed phone video uploaded and screenshotted. Not a photograph — a frozen
frame from footage. Resolution feels capped around 720x480, the dimensions of
standard-definition video, slightly stretched. The image has the unmistakable
quality of a video still: inherent motion blur even on stationary elements,
soft focus throughout with no crisply sharp detail anywhere, edges that feather
rather than cut. Heavy video compression artifacts across the entire frame —
blocky pixelation in the dark areas, color banding in gradients, smeared detail
where motion meets stillness. Thin black letterbox bars on top and bottom of
the frame from being recorded in a wider format than displayed. Occasional
faint vertical glitch line from imperfect playback. The image is technically
degraded in the specific way only video stills from low-bitrate recordings are
degraded — different from film grain, different from JPEG noise.
```

A versão underground usa intencionalmente termos que o handoff lista como "proibidos" pros outros gêneros (Heavy, blocky pixelation, vertical glitch line, low-bitrate, etc.) — decisão consciente de Gustavo: a estética underground PEDE essa degradação agressiva.

**Regras absolutas:**
- Nunca substituir por variantes analógicas (Analog film, 35mm, Canon Sure Shot, etc.)
- Nunca misturar variantes (cada brief usa uma variante OU outra, não híbrido)
- Adjetivos calibrados são lei — não trocar "very subtle" por "heavy" no padrão

### 2. Estrutura do prompt em 12 elementos ordenados

Em vez de 7 blocos genéricos, **12 elementos com peças fixas + peças variáveis**:

1. Abertura de câmera FIXA (§1)
2. Thematic sentence (era-específica do artista)
3. Frase mestre ("feels less like a photograph and more like X")
4. Sujeito (etnia inline, 5 opções OR de obscurecimento facial, textura de pele real)
5. Frase-soco emocional (2-4 palavras curtas)
6. Wardrobe (vocabulário pool específico do universo+gênero)
7. Setting (UMA sub-location sorteada do universo, expandida com riqueza cultural)
8. Lighting (config específica por opção do brief)
9. Guard-rail anti-destruição FIXO (frase final adapta ao mood — 6 variantes)
10. Color palette (8-12 cores nomeadas, com regra "cor como fonte de luz")
11. Optional details (8-12 itens culturalmente icônicos, pool rotativo)
12. Energy paragraph + Shot on FIXO + References culturais reais + 3-word closer

### 3. Brief evolui — campo `cenario` SAI

Brief v3 fica com 5 obrigatórios + 2 opcionais + nota livre:

- `genero_primario` (obrigatório)
- `genero_secundario` (opcional)
- `artista_primario` (obrigatório)
- `artista_secundario` (opcional)
- `quem_aparece`
- `mood`
- `atmosfera_luz`
- `nota_livre` (opcional, sanitizada)

**Razão:** Claude infere o cenário do universo visual do artista. Adicionar cenário como input causava conflito ("Drake + festa_underground" gerava híbrido estranho — Drake não tem universo de rave).

### 4. Sub-locations por artista, não por cenário

`artist_universe.py` substitui o conceito de cenário. Estrutura:

```python
ARTIST_UNIVERSE = {
    "drake": {
        "sub_locations": [<5-8 frases ricas com referências culturais Toronto/OVO>],
        "wardrobe_pool": [...],
        "thematic_sentence": "Mid-2010s Toronto OVO documentary energy meets candid private moment with a cold edge",
        "references": ["If You're Reading This It's Too Late era", "Theo Skudra photography"],
        "city_anchor": "Toronto",  # incluído inline quando central à identidade
    },
    ...
}
```

Builder **sorteia UMA sub-location** por chamada (não lista OR no prompt final). Sonnet 4.6 expande a seed em 4-6 frases descritivas com 2-3 objetos culturalmente icônicos, 1 detalhe sensorial, 1 frase atmosférica.

**Começa com 5 artistas validados visualmente** (Drake, Travis Scott, The Weeknd, Fakemink, Nettspend). Demais artistas usam **fallback gracioso**: só gênero + mood + universo inferido do gênero (sem sub-location específica do artista).

### 5. Anti-repetição via query no banco

Botão "Gerar variação" força sub-location diferente das últimas 3-5 gerações do mesmo user/artista. Implementação:

```python
last_seeds = (
    client.table("cover_library")
    .select("variation_seeds")
    .eq("user_id", user_id)
    .not_.is_("variation_seeds", "null")
    .order("created_at", desc=True)
    .limit(5)
    .execute()
)
used_locations = {s["sub_location_chosen"] for s in last_seeds.data if s}
# variation_engine.sample() exclui used_locations quando force_variation=True
```

`variation_seeds` JSONB (criada na migration 019) agora guarda:
```json
{
  "sub_location_chosen": "glass-walled penthouse interior with CN Tower view through floor-to-ceiling windows",
  "lighting_setup": "noite_natural",
  "optional_details": ["champagne flute", "TV playing playoffs on mute"],
  "mood_closer": "The whole frame carries the heavy quiet of footage that wasn't supposed to leak."
}
```

### 6. Palavras banidas + References banidas vs permitidas

**Palavras BANIDAS** (disparam estética cinematográfica polida):
- music video, B-roll, cinematic, film still, scene from, movie ending coded, director, BTS, behind-the-scenes, frame from a movie

**Substitutos permitidos:**
- clip, footage, screenshot, phone video, frame from a hard drive, candid clip, footage from someone's gallery, screenshot from a clip nobody finished

**References permitidas** (fotógrafos íntimo/documental):
- Larry Clark, Nan Goldin, Cobrasnake archives, Hedi Slimane youth photography, Mark Hunter, Theo Skudra

**References BANIDAS** (cinematógrafos/editorial fashion):
- Drive, Neon Demon, Wong Kar-wai, Tony Scott, Sofia Coppola, Helmut Newton, Guy Bourdin, Vogue editorials

### 7. Anti-bias explícito inline

- Sem asiáticos por default (só quando brief justifica via artista de referência asiático)
- Sem gang signs / peace signs / devil horns por default em prompts de crew
- Etnia declarada inline no parágrafo do sujeito
- Quando há crew: "mixed-gender group with multiple women and multiple men + lista de tons de pele explícita"
- Cidade do artista só quando central à identidade (Toronto pra Drake, Brooklyn pra Pop Smoke; placeless pra Travis/Slayr/Fike)

### 8. Iteração 1 (T4.19-T4.26) preservada no histórico

As tasks da v2 ficam marcadas como **"iteração 1 superada pela v3"** no `_tasks-mvp.md`. Não apagamos — preservamos a história pra rastreabilidade.

Arquivos do pacote `cover_prompt_builder/` que sobrevivem (sem mudança ou com ajuste mínimo):
- `types.py` (ajusta: remove `cenario` do `CoverBrief`)
- `sanitizer.py` (intacto)
- `brief_converter.py` (ajusta: remove mapeamento de cenário)
- `__init__.py` (interface pública estável)

Arquivos que vão pro lixo (reescritos do zero):
- `system_prompt.py`, `vocabulary.py`, `variation.py`, `validators.py`, `user_prompt.py`

Arquivos novos:
- `prompt_skeleton.py` (câmera 2 variantes + guard-rails + palavras banidas)
- `artist_universe.py` (sub-locations + wardrobe + references por artista)
- `genre_dna.py` (vocabulário cultural denso por gênero)
- `mood_modulation.py` (paleta/luz/energia + closer phrase por mood)
- `lighting_setups.py` (config específica por opção do brief)
- `variation_engine.py` (sorteio + anti-repetição via DB)

## Consequências

### Tasks T4.27-T4.33

7 tasks novas no ledger, descritas em detalhe em `_tasks-mvp.md` "Bloco prompt DNA v3".

### CLAUDE.md regra 6

Atualizar de:
> Capa pode ser gerada por IA (aba dedicada `/capas`) ou enviada manualmente. Geracao usa SYSTEM_PROMPT v2 estruturado (Captured Not Composed + DNA universal + anti-aesthetics + 7 blocos) + brief de 6+2 campos (genero primario+secundario, artista primario+secundario, quem aparece, mood, cenario, atmosfera de luz, nota livre opcional) + sorteio de 7 eixos de variacao em Python (...).

Pra:
> Capa pode ser gerada por IA (aba dedicada `/capas`) ou enviada manualmente. Geracao usa SYSTEM_PROMPT v3 estruturado em 12 elementos (camera video-still DNA fixo em 2 variantes -- padrao e underground; thematic sentence + frase mestre + sujeito etnia-inline + frase-soco + wardrobe pool + sub-location sorteada do universo do artista + lighting + guard-rail anti-destruicao + color palette + optional details + energy + shot on fixo + references culturais + 3-word closer) + brief de 5+2 campos (genero primario+secundario, artista primario+secundario, quem aparece, mood, atmosfera de luz, nota livre opcional -- SEM cenario, inferido do universo do artista) + anti-repeticao via query nas ultimas 5 variation_seeds do user. Sub-locations curadas por artista (5 validados, expansivel). Claude Sonnet 4.6 com prompt caching -> fal.ai gpt-image-2 quality=low ($0.013/capa, ~30s). NUNCA mencionar nome do artista no prompt final (likeness via 3 camadas). Detalhes em `docs/decisoes/2026-05-22-prompt-dna-capa-v3.md`.

### Riscos

- **5 artistas só no MVP** — qualquer artista fora do dicionário cai em fallback gracioso (só gênero+mood). Capa OK mas não tão calibrada. Mitigação: expandir dicionário conforme uso real.
- **Anti-repetição precisa de >= 5 capas geradas do mesmo artista** pra ter efeito. Mitigação: aceitável pra MVP, comentar no botão "Gerar variação" que se há poucas capas, pode repetir.
- **Câmera underground com termos "proibidos"** — gpt-image-2 pode renderizar vertical glitch line como linha gráfica literal. Mitigação: monitorar visualmente e recalibrar se for o caso. Decisão consciente do produto.
- **Drop do campo cenário** quebra qualquer brief em prod que tenha cenário no JSONB. Como o banco está limpo (Gustavo zerou presets na T4.22 e a aba foi testada com brief v2 mas presets atuais foram criados na sessão de teste), aceitável. Sem migration nova.
- **Sub-location sorteada via Sonnet 4.6, não em Python** — implica passar a lista de sub-locations no system prompt e instruir o modelo a sortear UMA. Aumenta tokens do system prompt (mais $$ por chamada pré-cache). Mitigação: prompt caching ephemeral já está habilitado (T4.21).

## Referências

- ADR predecessora: `docs/decisoes/2026-05-21-prompt-dna-capa-v2.md` (superseded mas preservado pra história)
- Sessão de validação visual: `beatpost_handoff_v3.md` (anexo, não versionado)
- Tasks de implementação: `_tasks-mvp.md` T4.27-T4.33
- Sub-locations underground (texto agressivo): mensagem do Gustavo de 2026-05-22 ("vamos buildar tudo")
- Migration 019 (preserva, sem necessidade de migration nova)
- Modelo Claude: `claude-sonnet-4-6` (mesmo)
- Provedor de imagem: `fal.ai/openai/gpt-image-2` quality=low (mesmo)
