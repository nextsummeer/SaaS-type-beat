# Sessao 2026-05-07 — Brainstorm da jornada do cliente (inputs do upload + geracao de capa)

> **Importancia:** Sessao critica de produto. Definiu a forma como o produtor interage com a plataforma no momento mais importante (o upload), e abriu o escopo do MVP pra incluir geracao de capa por IA — feature nao prevista no plano original.

## Participantes

- Gustavo (produto/dev)
- Claude (sparring de produto)

## Contexto inicial

Gustavo estava travado pra comecar a desenvolver a automacao por causa de duas duvidas de produto que nao tinham resposta clara no plano original:

1. **Como saber qual estilo de type beat e qual capa o produtor quer**, dado que existem milhares de combinacoes possiveis (Drake Type Beat, Drake x The Weeknd Type Beat, Nettspend Type Beat, Fakemink Type Beat, Lucy Bedroque Type Beat, etc.)?
2. **Como integrar aprendizados das novas features de IA da BeatStars** (geracao de nome/desc/tags + drag-and-drop multi-arquivo) sem cair nos mesmos problemas (resultados genericos, fora da vibe).

A discussao se desdobrou em decisoes mais profundas sobre input do upload, geracao de capa e o papel da IA.

## Topicos discutidos

### 1. Quem decide o estilo do beat — IA ou produtor?

**Conclusao:** O produtor decide. A IA recebe contexto, nao adivinha.

**Razao:** Producer **sabe** pra quem fez o beat. Pedir IA pra inferir pelo audio (caminho que a BeatStars adotou) entrega resultado generico, exatamente como Gustavo experimentou ao testar a feature deles com um beat afrobeat.

**Detalhamento:** Campo "Type beat de quem?" no upload, com lista controlada (autocomplete) de ~80-100 artistas mais usados + suporte a custom. Custom passa por validacao via Spotify API pra normalizar nome canonico.

### 2. Aprendizados da BeatStars — o que copiar e o que evitar

**Drag-and-drop com auto-roteamento por tipo de arquivo (BeatStars feature nova):**
- Excelente UX. Vai ser copiado na **V1.5** (automacao BeatStars).
- No MVP atual (so YouTube), so tem 2 slots (audio + capa) — nao precisa sofisticacao.

**Geracao de nome/desc/tags por IA da BeatStars (feature nova):**
- Falhou na pratica (Gustavo testou). Razao: detecta gênero so pelo audio, sem contexto.
- Validou a tese do BeatStars: **a abordagem certa e pedir contexto ao produtor antes de gerar**.
- Sem mudanca de estrategia — caminho do BEATPOST ja era esse.

### 3. Geracao de capa por IA — pivot importante de escopo

A decisao original (`docs/decisoes/2026-04-25-capa-manual.md`) deixava capa por IA pra V2. Dois fatos novos derrubaram essa decisao:

1. **Custo caiu de $0.20 pra $0.05/imagem** (validacao em producao de Gustavo via fal.ai gpt-image-2).
2. **Capa por IA e diferencial competitivo critico** — nenhum concorrente faz, e producer underground nao tem skill de design.

**Tres armadilhas identificadas e descartadas no caminho:**

- ❌ Gerar capa baseada no **nome do artista** → likeness e proibido, mapeamento e infinito.
- ❌ Capa **template + texto + cor** (proposta inicial do Claude) → Gustavo refutou: "ninguem posta capas assim". Capas reais sao fotograficas.
- ❌ **Texto sobreposto** (titulo do beat na capa) → Gustavo refutou: producers underground nao usam texto.

**Decisao final:** Capa = **estilo visual escolhido pelo produtor (no perfil) + mood do beat (no upload)**. Sem nome de artista. Sem texto. Capa custom sempre disponivel como alternativa.

Gustavo gerou 4 capas reais com um prompt fixo (analog film, figura solitaria noturna, face apagada) e o nivel de qualidade validou a abordagem.

### 4. Spotify API — dupla utilidade

Surgiu primeiro como solucao de **normalizacao** de nome de artista digitado pelo produtor. Evoluiu para uma segunda funcionalidade durante a discussao:

**Inspiracao para nomes de beat baseada nos hits do artista.** Producer escolhe "Drake" → sistema puxa top 20 musicas dele via Spotify API → titulos viram input adicional pro Claude → gerador produz nomes no estilo lexical real (ex: "GOD PLAN", "FEELINGS", "HOTLINE BLOCK"). Tatica conhecida no mercado de type beat.

**Cuidado de copyright:** prompt deve gerar variacoes proximas, nao copia literal. Producer pode editar pra usar titulo exato no review (risco fica com ele).

### 5. Onboarding como gancho de retencao

Sugestao do Claude: galeria visual de estilos com cards (preview de 3 capas + nome criativo: "Ghost Mode", "Midnight Drive", "Burn It Down").

Gustavo gostou mas deixou em aberto — quer pensar em uma versao mais criativa/divertida que funcione como gancho de retencao ("pessoas amam essas coisas"). Formato final fica pra task de design da Fase 1.

## Decisoes tomadas (resumo executivo)

| # | Decisao | Status |
|---|---------|--------|
| 1 | Producer informa artista de referencia (IA nao adivinha) | ✅ |
| 2 | Lista controlada de ~80-100 artistas + custom + normalizacao via Spotify API | ✅ |
| 3 | Mood obrigatorio no upload (cards visuais — 6 opcoes) | ✅ |
| 4 | Capa pode ser gerada por IA OU manual (em todos os tiers) | ✅ |
| 5 | Capa IA = estilo do perfil + mood do beat (sem artista) | ✅ |
| 6 | Provider de imagem: fal.ai gpt-image-2 a $0.05/imagem | ✅ |
| 7 | 6-7 estilos visuais curados manualmente no MVP | ✅ |
| 8 | Sem A/B/C de capas no MVP — regeneracao consome quota | ✅ |
| 9 | Sem texto sobreposto em capas | ✅ |
| 10 | Spotify API tambem alimenta gerador de nomes (top tracks → input do Claude) | ✅ |
| 11 | Validacao automatica de qualidade da imagem fica pra V2 (confiar na IA por enquanto) | ✅ |
| 12 | Drag-and-drop multi-arquivo da BeatStars: copiar na V1.5, nao no MVP | ✅ |
| 13 | Onboarding criativo de selecao de estilo: formato em aberto | 🟡 (pendente) |

## Mudancas de escopo no MVP

### Sai do recorte
- Geracao de capa por IA — agora **entra no MVP**

### Continua no recorte (V2+)
- Geracao de capa por **padrao de artista** (continua fora — usamos estilo+mood, nao artista)
- Validacao automatica de qualidade da imagem (CLIP score etc.)
- A/B/C de capas (provavelmente tier premium na V2)
- Multi-canal YouTube
- Billing / Stripe

## Pontos cegos identificados durante a sessao

- **Lista de artistas vai envelhecer rapido.** Type beat tem rotatividade brutal. Manutencao recorrente da lista e necessaria (Gustavo revisa customs mais usados 1x/mes).
- **Custom tende a ser maioria de inicio.** Aceitar isso. Evoluir lista organicamente.
- **Curadoria de 6-7 prompts mestres e trabalho visual real** — 1-2 semanas de iteracao. Nao tentar fazer com Claude sem validacao visual.
- **Coerencia visual do canal** importa pra producers serios — decisao de "estilo padrao no perfil" enderecou isso.
- **Copyright em titulos:** "inspirado em" no prompt do Claude, nao copia literal. Producer assume risco se editar pra titulo exato.
- **fal.ai rate limit** precisa ser validado antes de abrir beta com 50 producers.

## Acoes geradas

### Documentacao (concluido nesta sessao)
- [x] ADR `2026-05-07-fluxo-upload-e-inputs-do-produtor.md`
- [x] ADR `2026-05-07-geracao-de-capa-mvp.md`
- [x] Atualizar regra 6 do CLAUDE.md
- [x] Atualizar `docs/_mapa.md`
- [x] Atualizar `_tasks-mvp.md` (recorte + tasks novas)

### Pendentes
- [ ] Curadoria visual dos 6-7 estilos (Gustavo, ~1-2 semanas)
- [ ] Definir formato final do onboarding criativo (Gustavo)
- [ ] Validar quota fal.ai pra suportar beta de 50 producers
- [ ] Revisar Terms of Service do Spotify API antes de implementar
- [ ] Curadoria inicial da lista de ~80-100 artistas trending

## Significado dessa sessao para o projeto

Essa foi a sessao mais importante do projeto ate aqui (depois da fundadora) por **alterar a forma como o producer interage com a plataforma**, definindo:

1. O contrato de **input** do produtor (artista + mood + estilo visual).
2. A entrega de **capa por IA** como parte do MVP, nao mais V2.
3. A integracao com **Spotify API** como nova dependencia critica.
4. O caminho pra **retencao** via onboarding com personalidade.

A jornada do cliente passa de "sobe audio + capa, espera, recebe 3 copies" para uma experiencia muito mais opinionada e direcionada visualmente.
