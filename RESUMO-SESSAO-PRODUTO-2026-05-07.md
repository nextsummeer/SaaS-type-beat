# Sessão de Produto BEATPOST — 2026-05-07

> Resumo executivo de uma sessão crítica de produto que redefiniu a jornada do cliente no MVP do BEATPOST e expandiu o escopo para incluir geração de capa por IA.

---

## Sobre o BEATPOST (contexto rápido)

Producer Hub SaaS B2C para produtores de type beats que publicam no YouTube. A plataforma automatiza upload, geração de vídeo, SEO e publicação. Stack: Next.js + FastAPI + Supabase + QStash + Gemini + Claude + ffmpeg + YouTube Data API v3.

**Foco atual:** MVP de automação de upload e publicação no YouTube (Fase 1).
**Meta:** beta fechado em setembro de 2026.

---

## Por que essa sessão importa

Foi a sessão mais importante do projeto depois da fundadora. Definiu **a forma como o produtor interage com a plataforma no momento mais crítico (o upload)** e abriu o escopo do MVP para incluir geração de capa por IA — feature que estava na V2.

A mudança principal: o produto deixa de ser uma "ferramenta de automação genérica" e passa a ter uma jornada de cliente opinionada e direcionada visualmente.

---

## O problema que destravou a discussão

Gustavo estava travado para começar a desenvolver com duas dúvidas sem resposta no plano original:

1. **Como saber qual estilo de type beat o produtor quer**, dado que existem milhares de combinações (Drake Type Beat, Drake x The Weeknd, Nettspend, Fakemink, Lucy Bedroque, etc.)?
2. **Como integrar aprendizados das novas features de IA da BeatStars** (que ele testou e achou genéricas) sem cair nos mesmos problemas?

---

## Decisões tomadas

### 1. Inputs do upload — produtor informa, IA não adivinha

| Campo | Como funciona |
|-------|--------------|
| **Artista de referência** | Lista controlada (~80-100 artistas trending) com autocomplete + suporte a custom. Custom é validado pela Spotify API para normalizar o nome canônico ("FAKEMINK" → "Fakemink"). |
| **Mood do beat** | Obrigatório no upload, via cards visuais grandes (6 opções: Sad, Aggressive, Romantic, Dark, Energetic, Atmospheric). 1 clique. |
| **Capa** | Pode ser gerada pela IA OU enviada manualmente. Botão "usar minha própria capa" sempre disponível em todos os tiers. |

**Por quê:** o produtor SABE pra qual artista o beat foi feito. Pedir IA pra adivinhar pelo áudio (caminho que a BeatStars adotou) entrega resultado genérico. Validado por Gustavo testando a feature da BeatStars com um beat afrobeat.

### 2. Geração de capa por IA entra no MVP

Antes era V2. Agora é MVP. Dois fatos novos derrubaram a decisão antiga:

- **Custo caiu de $0.20 para $0.05/imagem** via fal.ai gpt-image-2 (validado em produção).
- **É diferencial competitivo crítico** — nenhum concorrente faz, e produtor underground não tem skill de design.

**Como funciona:**
- Capa = **estilo visual escolhido pelo produtor (no perfil) + mood do beat (no upload)**
- **NÃO usa nome de artista** (likeness é proibido legalmente)
- **Sem texto sobreposto** (produtores underground não usam texto em capa)
- 1 capa gerada por upload (sem A/B/C). Regenerar consome quota.
- Sem validação automática de qualidade (confia na IA, produtor regera se ficar ruim)

### 3. Biblioteca de 6-7 estilos visuais curados

Sugestão inicial (nomes provisórios):

| Slug | Nome | Vibe | Para quem |
|------|------|------|-----------|
| `ghost_mode` | 👁️ Ghost Mode | Underground melancólico, analog grain, face apagada | Nettspend, Lucy Bedroque, Bladee |
| `midnight_drive` | 🌃 Midnight Drive | Atmosférico noturno, neon | Drake melódico, Don Toliver |
| `burn_it_down` | 🔥 Burn It Down | Drill agressivo, fumaça, vermelho | Pop Smoke, Central Cee |
| `nightmare_mode` | 💊 Nightmare Mode | Rage/hyperpop, glitch digital | Carti WLR, Destroy Lonely |
| `golden_hour` | 🌅 Golden Hour | Solar, cores quentes, afrobeat | Tems, Burna Boy, Rema |
| `vhs_tape` | 📼 VHS Tape | Boom bap vintage, anos 90 | J. Cole, Joey Bada$$ |
| `trap_dreams` | 🌌 Trap Dreams | Trap psicodélico, fantasia | Travis Scott luxo |

Cada estilo é um **prompt mestre** com sintaxe de variação (rotate scenes, alternate palettes) + modificadores por mood.

### 4. Spotify API entra como dependência crítica

**Dupla utilidade:**

1. **Normalização de nomes de artistas** custom (free tier Client Credentials Flow)
2. **Inspiração para nomes de beat** — sistema puxa top 10 hits do artista e alimenta o Claude. Drake → Claude gera nomes inspirados no estilo lexical de "God's Plan", "Hotline Bling", "Feelings". Importante: **inspirado em, não cópia literal** (evita problema de copyright).

### 5. Onboarding criativo como gancho de retenção

Galeria visual de cards com nomes criativos + preview de 3 capas por estilo. Produtor escolhe a vibe que é ele. Formato exato fica em aberto — Gustavo vai propor versão mais divertida ("pessoas amam essas coisas").

---

## Mudanças no escopo do MVP

### Saiu do recorte (entrou no MVP)
- ✅ Geração de capa por IA

### Continua fora do MVP
- ❌ Geração de capa por **padrão de artista** (capa IA do MVP usa estilo+mood, não artista)
- ❌ A/B/C de capas (V2, talvez tier premium)
- ❌ Validação automática de qualidade da imagem (confiar na IA por enquanto)
- ❌ Drag-and-drop multi-arquivo BeatStars-style (V1.5)
- ❌ Multi-canal YouTube, billing, métricas Analytics (V2+)

---

## Pontos cegos identificados

1. **Lista de artistas vai envelhecer rápido.** Type beat tem rotatividade brutal — Nettspend, Fakemink, Lucy Bedroque não existiam há 1 ano. Manutenção recorrente da lista (Gustavo revisa customs mais usados 1x/mês).

2. **Custom de artista tende a ser maioria de início.** Aceitar isso. Lista cresce organicamente.

3. **Curadoria de 6-7 prompts mestres é trabalho visual real (1-2 semanas).** Não tentar gerar com Claude sem validação visual humana. Capa IA-slop arruína o diferencial.

4. **Coerência visual do canal** importa pra produtores sérios. Decisão de "estilo padrão no perfil" enderecou isso.

5. **Copyright em títulos:** prompt do Claude usa "inspirado em", não cópia literal. Se produtor editar pra título exato, risco fica com ele.

6. **fal.ai rate limit** precisa ser validado antes de abrir beta com 50 produtores.

---

## Princípios que ficam para o futuro

- **O produtor sabe melhor que a IA o que ele quer.** Sempre que possível, capturar contexto explícito em vez de inferir do áudio.
- **Separar concerns:** capa = identidade visual do produtor (estilo + mood, sem artista). Copy/SEO = artista + tags trending + nomes inspirados em hits reais.
- **Coerência visual do canal vale mais que variação por upload.** Por isso "estilo padrão no perfil" + override opcional.
- **Sempre ter fallback humano:** capa custom em todos os tiers, edição de título no review, regeneração manual.

---

## Próximos passos pendentes

### Trabalho de produto (Gustavo)
- [ ] Curadoria visual dos 6-7 estilos (1-2 semanas) — bloqueante pra Fase 4
- [ ] Definir formato final do onboarding criativo
- [ ] Curadoria inicial da lista de ~80-100 artistas trending
- [ ] Validar quota fal.ai pra suportar beta de 50 produtores
- [ ] Revisar Terms of Service do Spotify API

### Documentação criada nesta sessão
- ADR `docs/decisoes/2026-05-07-fluxo-upload-e-inputs-do-produtor.md`
- ADR `docs/decisoes/2026-05-07-geracao-de-capa-mvp.md`
- Sessão `docs/sessoes/2026-05-07-brainstorm-jornada-cliente.md`
- ADR antiga `docs/decisoes/2026-04-25-capa-manual.md` marcada como parcialmente superseded
- Regra 6 do `CLAUDE.md` atualizada
- 13 tasks novas adicionadas no `_tasks-mvp.md` (T1.7, T2.6-T2.12, T4.6-T4.11)
