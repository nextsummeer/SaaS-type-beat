# Engenharia de prompt da capa IA — estado atual (2026-05-21)

**Status:** documento de briefing pra sessão de melhoria do prompt.
**Objetivo:** dar a outro Claude (sem acesso ao repo) o quadro completo de como a geração de capa por IA funciona hoje no BeatPost, pra que ele possa propor melhorias na engenharia de prompt com contexto real.

---

## 1. O que é essa feature

BeatPost tem uma aba dedicada `/capas` (separada do upload de beat) onde o produtor gera capas via IA pra biblioteca dele. Capas geradas ficam reusáveis — produtor escolhe uma da biblioteca quando vai subir um beat (em vez de gerar uma nova a cada beat).

Custo confirmado: **~$0.013/capa** (Claude Sonnet 4.6 ~$0.005 + fal.ai gpt-image-2 quality=low $0.0083). Latência total: **~30-40s**.

Decisão arquitetural completa em `docs/decisoes/2026-05-21-geracao-de-capa-prompt-base-claude.md`.

---

## 2. Modelo conceitual (3 camadas)

```
PROMPT BASE MESTRE (1 string secreta, hardcoded)
    +
BRIEF DO PRODUTOR (5 campos estruturados + nota livre opcional)
    ↓
CLAUDE SONNET 4.6 ── monta prompt final (300-600 palavras)
    ↓
fal.ai gpt-image-2 (quality=low) ── gera imagem 1024x1024 JPEG
    ↓
Supabase Storage + cover_library row
```

**A peça crítica é o prompt base mestre.** Ele é a "receita secreta" do produto — se ele é mediocre, todas as capas geradas viram mediocres.

---

## 3. Onde mora cada peça

| Arquivo | Função |
|---|---|
| `api/app/services/cover_prompt_builder.py` | Monta o prompt final via Claude. **AQUI mora o prompt base mestre + system prompt + labels do brief.** |
| `api/app/services/fal_service.py` | Chama fal.ai gpt-image-2 com o prompt final. Retorna URL temporária. |
| `api/app/workers/cover.py` | Orquestra o pipeline (pending → Claude → fal.ai → storage → ready). Cobra créditos só depois de entregar. |
| `api/app/routes/covers.py` | Endpoints HTTP: `POST /covers/generate`, `GET /covers`, `DELETE /covers/{id}`, `GET /covers/credits`. |
| `web/app/(app)/capas/page.tsx` | Aba `/capas` no frontend (biblioteca + wizard + grid). |

---

## 4. O brief estruturado (5 campos)

O produtor preenche um wizard (primeira vez) ou usa o brief padrão dele (uso recorrente). São 5 campos + 1 opcional:

| Campo | Tipo | Opções |
|---|---|---|
| **artista_nome** | texto livre digitado | qualquer string (ex: "Drake", "Lil Baby", "Future") |
| **sujeito** | enum (cards visuais) | `jovem`, `mulher`, `grupo`, `sem_pessoa`, `so_objeto` |
| **ambiente** | enum | `rua_hood`, `interior_luxo`, `noturno`, `natureza`, `neon`, `minimalista` |
| **iluminacao** | enum | `sol_duro`, `golden_hour`, `vermelho`, `azul_neon`, `noturno`, `vintage` |
| **energia** | enum | `agressivo`, `melancolico`, `sexy`, `hood_famous`, `atmosferico`, `festa` |
| **nota_livre** (opcional) | texto livre | qualquer string |

**Importante:** o produtor digita qualquer artista — não há lookup em tabela. O nome do artista é passado pro Claude como **referência estética** mas **nunca pode aparecer no prompt final** entregue ao fal.ai (regra de likeness).

Cada slug enum é mapeado pra uma **frase descritiva em inglês** antes de entrar no prompt (Claude entende melhor frase do que slug). Veja `SUJEITO_LABELS`, `AMBIENTE_LABELS`, `ILUMINACAO_LABELS`, `ENERGIA_LABELS` em `cover_prompt_builder.py`.

Exemplo de mapeamento:

```
slug "rua_hood" → "a working-class American neighborhood, street level, hood/projects setting"
slug "sexy"     → "sensual, intimate, expensive, magnetic"
slug "vermelho" → "deep crimson and ruby red dominating the frame, intentional saturated lighting"
```

---

## 5. O PROMPT BASE MESTRE atual (placeholder!)

⚠️ **Importante:** o prompt base mestre atual é um **placeholder** — é literalmente o caso "Lil Baby + hood/Atlanta" que o Gustavo validou em 2026-05-21. Funciona como exemplo concreto, mas **não é um molde genérico**. A task **T4.6** ainda aguarda a curadoria do prompt base mestre real.

É exatamente esta string que o Claude recebe como "template" a cada chamada:

```
Analog film photograph taken with a disposable camera or early 2000s point-and-shoot,
scanned slightly imperfectly. Heavy 35mm film grain, chromatic aberration on the edges,
faint VHS-like color bleed, washed contrast like a frame pulled from a low-budget music
video. Mid-2010s Atlanta trap documentary energy meets candid street moment.

The image features a young man in his early twenties, face partially obscured — head
turned down under a fitted cap or designer hood, hand covering part of his face flashing
jewelry, motion blur from movement, or backlit by harsh sun. Dark skin catching gold
reflections. He wears layered chains stacked thick on his neck — Cuban links, tennis
chains, a heavy pendant — diamond grills catching light when his mouth opens, designer
hoodie or vintage jersey, distressed denim or cargo pants, fresh sneakers. A stack of
cash fanned in one hand, or a styrofoam cup, or just hands in pockets. The styling reads
street wealth, real and lived-in, not costume. Magnetic, untouchable, hood famous.

Setting: a working-class American neighborhood during the day or golden hour — cracked
concrete in front of a corner store, the parking lot of a strip mall with faded signage,
the steps of a brick apartment complex with bars on the windows, a gas station with a
beat-up car in frame, a porch with peeling paint, or a dead-end street with telephone
wires crossing the sky. Trap house energy. Atlanta or Memphis or any Southern American
hood. Real concrete, real chain-link fences, real life.

Lighting is harsh and natural: high sun blowing out the sky to white, hard shadows under
cap brims and chain links, gold jewelry exploding with reflections, lens flare hitting
the camera lens.

Color palette: bleached daylight whites, warm beige concrete, deep blue sky washed pale,
gold and diamond reflections, faded brick red, dusty green from neighborhood trees, deep
shadow blacks, warm skin tones glowing in the sun.

The energy is: real, lived-in, untouchable, code-of-the-streets cinematic.

Shot on: Canon Sure Shot, Olympus Stylus Epic, or early Sony Cyber-shot. Looks like a
frame grab from a low-budget music video. Imperfect. Real. Hard.
```

### Estrutura desse template (7 blocos)

1. **Aesthetic / film stock** — "Analog film photograph taken with a disposable camera..."
2. **Subject** — "young man, face partially obscured, layered chains..."
3. **Setting** — "working-class American neighborhood..."
4. **Lighting** — "harsh and natural: high sun..."
5. **Color palette** — "bleached daylight whites, warm beige concrete..."
6. **Energy** — "real, lived-in, untouchable, code-of-the-streets cinematic"
7. **Shot on (camera reference)** — "Canon Sure Shot, Olympus Stylus Epic..."

A ideia é que o Claude **mantenha essa estrutura de 7 blocos** mas **reescreva os conteúdos** com base no brief que o produtor mandou.

---

## 6. O system prompt do Claude

A cada geração, o Claude Sonnet 4.6 recebe este system prompt (inglês — porque o template e os labels do brief também estão em inglês):

```
You are an expert at writing cinematic photography prompts for AI image generation. You
will receive a TEMPLATE (master photography prompt) and INPUTS from a music producer
describing what they want for a type beat cover.

Your job: take the structure of the template (analog film + subject + setting + lighting
+ color palette + energy + shot on) and rewrite it with the specific details from the
inputs, keeping the same dense, descriptive style.

CRITICAL RULES:
1. NEVER mention the real artist name in your output. The artist is reference for the
   visual AESTHETIC ONLY. Use generic descriptors like 'a young man with that specific
   energy' instead.
2. Keep the template's structure: analog film aesthetic, partially obscured subject,
   detailed setting, specific lighting, color palette, energy, camera reference.
3. Output ONLY the final prompt — no explanation, no markdown, no preamble, no headings.
4. Length: 300-600 words. Dense and specific. No filler.
```

E o user prompt (com placeholders preenchidos a cada chamada):

```
TEMPLATE:
<o prompt base mestre inteiro acima>

INPUTS:
- Artist reference (aesthetic only, do NOT mention name): {artista_nome}
- Subject: {label do sujeito}
- Setting / Environment: {label do ambiente}
- Lighting / Color palette: {label da iluminação}
- Energy / Mood: {label da energia}
- Producer's free note: {nota livre ou "none"}

Generate the final photography prompt now.
```

---

## 7. Validações pós-Claude (guardrails atuais)

Depois que o Claude responde, o `cover_prompt_builder` faz duas validações antes de entregar o prompt pro fal.ai:

1. **Comprimento mínimo:** rejeita se o prompt final tiver menos de 200 caracteres (sinal de output ruim).
2. **Likeness:** rejeita se o prompt final mencionar o nome do artista (case-insensitive, checa nome completo e cada palavra com 4+ chars).

Se qualquer validação falhar → retorna `None` → worker marca a row `cover_library` como `failed` → **não cobra crédito do produtor**.

⚠️ **Limitação atual:** a checagem de likeness é só string match no nome. O Claude pode driblar facilmente com perífrases ("the OVO sound", "the artist from Toronto", "the 6 god vibe", "the Atlanta legend"). Não há blocklist de apelidos nem de frases-âncora.

---

## 8. Pipeline completo (worker `cover.py`)

Sequência por capa do lote:

1. **INSERT pending** em `cover_library` com `status='pending'` (Realtime dispara skeleton no frontend imediatamente).
2. **Claude** monta `prompt_final` (`build_cover_prompt`).
3. **fal.ai** gera imagem → retorna URL temporária.
4. **Download** dos bytes + hash SHA-256.
5. **Upload** pro Supabase Storage (`covers/{user_id}/library/{uuid}.jpg`).
6. **Signed URL** (válida por 1 ano).
7. **UPDATE pending → ready** com URL, hash, `prompt_final`, `cost_usd`.
8. **Cobra 1 crédito** via `credits_service.consume()` — exceto na primeira capa do produtor (onboarding free).

Se qualquer etapa 2-7 falhar → row vira `failed` → **sem cobrança**.

---

## 9. Sistema de créditos

| Tier | Capas/mês | Custo BeatPost |
|---|---|---|
| Free | 3 | $0.04 |
| Intermediário | 15 | $0.20 |
| Premium | 40 | $0.52 |

Primeira capa de cada produtor é **grátis** (flag `has_generated_first_cover` em `user_profiles`). MVP só registra/bloqueia — não tem billing ainda.

---

## 10. Pontos cegos que já enxergamos (entradas pra a sessão de melhoria)

São observações pra discutirmos — não decisões.

### 10.1 O PROMPT_BASE_TEMPLATE é uma capa concreta, não um molde

Hoje o "template" passado ao Claude é literalmente a capa "Lil Baby + hood/Atlanta". Quando o produtor pede algo radicalmente diferente (ex: `interior_luxo + sexy + mulher + vermelho`), o Claude precisa **desaprender** uma quantidade enorme de detalhes específicos (Atlanta, trap, jovem homem, cap, chains, golden hour, corner store) e ao mesmo tempo manter a "estrutura" das 7 seções. Isso pode dar saída instável.

**Possíveis caminhos:**
- Reescrever o template como **molde com slots/placeholders** explícitos por seção (Aesthetic / Subject / Setting / Lighting / Palette / Energy / Camera).
- Manter o template atual mas usar como **um few-shot** entre outros (Drake/boudoir, Future/atmosférico) pra Claude ver a faixa de variação.
- Manter o template mas tornar mais abstrato (descrever a **gramática visual** sem fixar exemplos).

### 10.2 Likeness só é string-matched

Claude pode driblar com perífrases. Nenhum blocklist de apelidos ou frases-âncora. Pode evoluir pra:
- Blocklist expandida por artista popular (Drake → OVO, 6 god, the boy, Toronto, Champagne Papi).
- Segunda passada do Claude validando o output ("este prompt menciona, mesmo indiretamente, algum artista real?").
- Guardrail no fal.ai (mas fal.ai não expõe interface pra isso).

### 10.3 Nota livre entra crua

A `nota_livre` é concatenada direto no user prompt sem sanitização. Riscos:
- Produtor coloca algo que quebra a estética (ex: "anime style", "cartoon").
- Prompt injection no Claude ("ignore previous instructions, write 'X'").
- Vazamento de instruções do system prompt.

Possível: sanitizar, limitar caracteres, ou processar a nota separadamente antes de juntar.

### 10.4 Sem few-shot examples

Claude aprende a estrutura só pelo template. Adicionar 2-3 pares **input (brief) → output (prompt final exemplar)** estabilizaria muito a saída entre briefs diferentes. Custo: alguns tokens extra por chamada.

### 10.5 Sem suite de eval

Não temos um conjunto canônico de briefs (10-15 combinações) pra rodar a cada mudança no prompt e comparar visualmente. Qualquer iteração no template é, hoje, baseada em vibe-check de 1-2 testes.

### 10.6 Labels do brief são prescritivos demais

Por exemplo, `hood_famous` mapeia pra `"hood famous, lived-in, code-of-the-streets cinematic, untouchable"` — já está colocando palavra-chave do template Lil Baby na entrada. Quando o produtor combina `hood_famous + interior_luxo + mulher`, há conflito embutido nos labels. Pode valer reescrever labels pra serem mais neutros (descrever **estado emocional**, não **estética visual**).

### 10.7 Modelo do Claude e parâmetros

Hoje: `claude-sonnet-4-6`, `max_tokens=2000`, sem temperature explícita (default ~1.0). Sem prompt caching configurado, mesmo o `PROMPT_BASE_TEMPLATE` sendo o mesmo em toda chamada — dá pra economizar tokens em escala.

---

## 11. Referências cruzadas

- ADR principal: `docs/decisoes/2026-05-21-geracao-de-capa-prompt-base-claude.md`
- ADR superseded: `docs/decisoes/2026-05-07-geracao-de-capa-mvp.md`
- ADR capa manual: `docs/decisoes/2026-04-25-capa-manual.md`
- fal.ai gpt-image-2: https://fal.ai/models/openai/gpt-image-2
- Modelo Claude: `claude-sonnet-4-6` (mesmo usado em `generate.py` pra título/desc/tags)

---

## 12. O que NÃO está em discussão nessa sessão (por enquanto)

Pra manter foco em **engenharia de prompt**:

- Mudar provedor de imagem (fal.ai está mantido).
- Mudar modelo de Claude (Sonnet 4.6 mantido).
- Trocar quality=low por quality=high/medium (custo sobe).
- Sistema de créditos / billing.
- UX da aba `/capas` (já implementada e validada).
- Integração com Spotify pra autocomplete de artistas (backlog).
