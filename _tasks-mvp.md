# _tasks — [NOME] Fase 1 (MVP) @gustavo

**Criado:** 2026-04-25
**Atualizado:** 2026-06-02 (sessao 9: T2.15 aceitar WAV -> converter pra MP3 320k no servidor ENTREGUE; tasks T2.15 + T4.44 criadas pras 2 features de upload pedidas pelo Gustavo. ANTES -- sessao 8: T4.40 capa IA -- letterbox removido + variacao pose/framing/cenario autoritativo; sessao 7 FECHADA: T4.37+T4.38+T4.39 entregues + rodada grande de polish de UI pos-T4.39 -- AudioPlayer multicolor+drag, modal capas React Portal, larguras padronizadas, abas /capas reorganizadas, botao salvar link inline na review)
**Outcome:** Produtor convidado faz login, conecta canal YouTube, configura brief de estilo padrao na aba `/capas` (multi-presets nomeados, ate N por tier), gera capas reusaveis com IA (prompt base + Claude + fal.ai, ~30s, $0.013), sobe um beat informando artista de referencia + mood, escolhe capa da biblioteca ou envia propria, recebe titulo+descricao+tags geradas pela IA, edita o que quiser, confirma agendamento, e ve video publicado/agendado no YouTube Studio dele. Tudo multitenant via Supabase RLS desde dia 1. Meta: beta fechado setembro 2026.

**Iniciado:** 2026-04-25
**Status:** em-execucao
**Proximo passo:** **Sessao 9 (2026-06-02): T2.15 (aceitar WAV -> MP3 320k no servidor) ENTREGUE** -- ffmpeg_service.transcode_to_mp3 + convert.py converte nao-MP3 + frontend aceita WAV; 4 testes convert verdes, typecheck+build verdes; validacao em prod pendente (subir WAV real). **Proxima: T4.44 (gerar capa por IA direto no /upload, modal escolher/criar brief).** | HISTORICO: **T8.4 (plano de acao ramificado + card no dashboard) com refinamento metas+/plano page+fase gerando 10s** entregue em prod. Sequencia visual completa do onboarding: 5 perguntas + tempo desperdicado + capa mock + youtube mock + GERANDO PLANO (10s orb signature com chain de estagios) + REVELACAO DAS METAS (3-5 cards motivacionais). `/plano` page no sidebar (secao "Aprender", peso baixo) com hero + grid de metas + 15 tarefas detalhadas por categoria. ActionPlanCard no dashboard com metas compactas + link real pro /plano. Storage localStorage com metas+tarefas + backward-compat. **Validacao visual em prod pendente** -- Gustavo testa 2 perfis diferentes pra ver metas distintas. **DECISAO ARQUITETURAL gravada na memoria** (`project_onboarding_e_plano_de_acao`): plano de acao usa TEMPLATES + REGRAS PREDICADAS (`shouldInclude(answers)`), NAO IA -- custo IA seria ~$0.0013/plano mas templates ganharam por (a) variaveis poucas e constrained, (b) valor real esta no CONTEUDO de cada card (Rary escreve), (c) determinismo e (d) controle de edicao. Padrao arquitetural definido em 4 camadas pra escalar quando Rary comecar conteudo: ONBOARDING (signal capture) -> PROFILE (inferProfile() traduz pra estagio 0-3 + flags) -> KNOWHOW (.md files em `web/content/knowhow/` com frontmatter `applies_to: { estagios, condicoes }`) -> MATCHER (filtra + ordena). **Proxima decisao pendente:** Gustavo vai pensar nas perguntas refinadas (atual `origem` e ruido pro plano; falta pergunta de monetizacao atual pra capturar estagio). Apos perguntas decididas -> T8.5 implementa schema .md + inferProfile + migra 1-2 tarefas pra validar leitor. **T8.6+ depois:** conteudo educacional embutido (Gustavo + Rary produzem via .md). ANTES: **T8.3 (onboarding wizard: etapa de conectar YouTube MOCK + skippable)** entregue -- onboarding wizard agora tem 8 etapas (5 perguntas + tempo desperdicado + capa + youtube + plano final). Camada de dados em `web/lib/actionPlan.ts` com ~15 tarefas mestre, 6 categorias (Canal, Branding, Loja, Vendas, Beats, Networking), 3 prioridades (foundation/core/growth), 4 niveis de esforco (XS/S/M/L). `buildActionPlan(answers)` filtra por `shouldInclude` e promove prioridade core->foundation via `isPriorityFor` baseado em objetivos. Plano salva no localStorage (`actionPlanStorage.ts`) ao montar PlanRevealStep. PlanRevealStep mostra header personalizado ("X tarefas que vao te tirar de comecando pra vendendo todo mes"), card de reframe magenta destacado ("ANTES DE TUDO: nao comemore venda no primeiro mes" + corrente de causa real algoritmo->impressao->clique->compra), e tarefas agrupadas por categoria (so categorias com tarefas aparecem). ActionPlanCard no dashboard le do localStorage (returns null se sem plano), mostra header com Sparkles + "SUA TRILHA" sem numero (nao quebra a numeracao das outras secoes que continuam 01/02/03/04), barra de progresso, proximas 3 tarefas, tag de categoria + esforco em cada uma, contador total. Inserido entre "02 Agenda" e "03 Proximo passo" do dashboard. **Validacao visual em prod pendente** -- Gustavo precisa testar 2 sets de respostas diferentes (ex: "nunca postou + nao vende" vs "4+/dia + vende em BeatStars") pra ver as trilhas saindo DIFERENTES. Sequencia agora completa o ciclo do onboarding visual. **Proximas tasks (T8.5+):** pagina dedicada /plano + item no sidebar, persistencia em Supabase com RLS, marcar tarefas como concluidas, conteudo educacional embutido em cada tarefa (T8.6+ depende de Gustavo+Rary produzirem conteudo). ANTES: **T8.3 (onboarding wizard: etapa de conectar YouTube MOCK + skippable)** entregue -- nova etapa pos cover step, 4 sub-fases internas (idle + connecting + connected + skipped). Idle tem header + 3 value props numerados em lista editorial (upload direto, agendamento, analytics) com icones Upload/CalendarClock/BarChart3 + card de preview das permissoes do Google (ShieldCheck + 2 itens com check verde + nota "nunca publica sem voce revisar") + CTA principal "Conectar YouTube" inline + link discreto "Conectar depois - vira tarefa nº1 do plano". Connecting reusa o orb padrao (mesmo do CoverStep pos-refinamento: sem wave-bars + 1 anel orbital) em tamanho ligeiramente menor (h-72 w-72 container, orb h-44 w-44), chain "Abrindo permissoes do Google -> Verificando seu canal" (~1.7s). Connected mostra card mock do canal (avatar gradient + Tv2 icon + "Seu canal" + LED success pulsante + "conectado · ha instantes" + Check verde) + mensagem "A partir de agora qualquer beat... sempre depois de voce revisar". Skipped mostra card dashed "Esperando voce - Conectar YouTube - vira tarefa nº1 do seu plano de acao assim que voce entrar" + nota "voce pode explorar o BeatPost sem conectar mas pra publicar de verdade vai precisar plugar o canal". Footer dinamico: Voltar desabilita durante connecting; isLastStep agora e isYoutubeStep + (connected ou skipped) -> "Finalizar" leva pro /dashboard. **Decisao registrada na memoria:** removemos a etapa de upload+BPM da sequencia do onboarding pq violava o mesmo principio que removeu o publish real (Gustavo apontou). Geracao de capa nao precisa do beat (fal.ai usa so o brief), entao forcar upload so pra detectar BPM/tom era friccao alta sem payoff. Upload+BPM acontecem naturalmente depois no dashboard, no primeiro fluxo guiado por spotlight. Memoria [[project-onboarding-e-plano-de-acao]] atualizada com sequencia revisa de 5 etapas. **Bug pego durante o build:** `Youtube` icon nao existe em lucide-react 1.14 -- trocado por `Tv2`. Replace_all inicial foi agressivo demais e renomeou componentes internos (YoutubePhase -> Tv2Phase etc.); corrigido com replace targeted. Pos-refinamento T8.2 (orb): trocado pelo padrao do PendingCard de /capas (Gustavo enviou print, identifiquei que o orb correto era o de "gerando capa" sem wave-bars e com 1 anel, nao o do /beats/[id] que tinha 2 aneis + wave-bars). Keyframes rotate-slow/rotate-slow-reverse promovidas pra globals.css (antes viviam em style jsx local de /beats/[id] e quebravam silenciosamente no /capas PendingCard). ANTES: **T8.2 (onboarding wizard: etapa de geracao da 1a capa MOCK)** entregue -- adicionada apos a tela de resultados, 3 fases internas (picking + generating + done). Picker em grid 1/2/3 cols com 5 mini-covers (Drake/Travis/Weeknd/Fakemink/Nettspend) renderizadas via novo componente MockCover (SVG/CSS com paleta por artista, grão, vinheta, blob de accent). Selecao trava o botao "Gerar capa estilo X" inline. Generating mostra orb morphing (animate-orb-morph com gradient-primary + blur+pulse), barra de progresso, estagio atual em font-display ("Lendo seu estilo -> Montando o brief -> Renderizando -> Finalizando") + chain de estagios com check verde nos concluidos (~5.5s total). Done mostra cover full 340px + headline "Voce fez isso." + teaser nomeando outros artistas (Yeat/Carti/Ken Carson/Lil Baby). Footer dinamico: label "Continuar"/"Vamos la" (transicao resultados->capa pra peso emocional)/"Finalizar" (capa done -> /dashboard). Voltar disabled durante generating. Typecheck+build verdes. **Validacao visual em prod pendente.** Gustavo vai testar o fluxo completo: 5 perguntas -> resultados -> Vamos la -> picker -> Gerar -> orb 5s -> capa mock + teaser -> Finalizar. Proxima sessao = T8.3 (geracao REAL) ou iterar UX baseado no feedback dele. ANTES: **T8.1 (onboarding wizard visual prototype)** entregue -- wizard full-screen em `/onboarding` com 5 perguntas (origem, genero, loja, objetivos multi-select, frequencia), barra de progresso gradient-primary, cards Editorial Mono numerados com magenta-dot no selecionado, tela final com 2 numeros animados count-up (semanal em branco + anual em magenta gradient gigante baseado em 20min/upload manual). Perguntas em `questions.ts` separado (trocar sem mexer no layout). Aba "Onboarding" no sidebar atras de flag `NEXT_PUBLIC_DEV_TOOLS=true` (some sozinho em prod). Rota ja existia no middleware como protegida. Typecheck+build verdes. **Validacao visual em prod pendente** -- Gustavo precisa setar `NEXT_PUBLIC_DEV_TOOLS=true` no Vercel pra aba aparecer, OU acessar `/onboarding` direto via URL. Proxima iteracao depende do feedback dele apos ver visualmente -- perguntas sao placeholder ("pode inventar, depois eu vou pensando"). Memoria salva: [[project_onboarding_e_plano_de_acao]] com causa-raiz do churn (descompasso de expectativa de venda 1mes vs realidade 2-3meses), decisao pelo plano de acao interativo ramificado por estagio (nao biblioteca passiva), e direcao do onboarding (seletor curado de capa, publish real fora do onboarding, OAuth ultimo+pulavel). ANTES: **T4.43 (custo real por capa no usage_tracker)** entregue -- fal_service calcula custo pelos tokens da resposta (antes gravava $0.0083 fixo, real ~$0.0111; subestimava ~25%). Grava cost_usd real + tokens + breakdown em api_usage.metadata. 5 testes verdes. **Validar pos-deploy:** conferir 1 row de api_usage batendo com o dashboard da fal. ANTES: **T4.42 (botoes de geracao da /capas)** entregue -- matou o botao "Gerar variacao" (era identico ao "Gerar 1 capa"), hierarquia visual (1 capa = primario roxo / 3 capas = secundario outline), rotulo "GERAR DO BRIEF: <nome>", anti-repeticao sempre ligado (force_variation), termo "variacao" removido da tela. Typecheck+build verdes, deploy feito. **Validacao visual em prod pendente.** ANTES: **T4.41 (nome do brief no modal da capa)** entregue -- link por ID (`cover_library.brief_preset_id` FK + `brief_preset_name` fallback), rename propaga ao vivo, migration 023 aplicada, testes+build verdes. **Validacao visual em prod pendente** (gerar capa nova pos-deploy, conferir nome no CapaModal). Sessao 8 (2026-05-28) -- **T4.40 (capa IA: letterbox removido + variacao pose/framing/cenario autoritativo + anti-clone Deftones)** entregue, deploy feito e **VALIDADO em prod** (Gustavo: "variacoes incriveis"). Passo B (anti-repeticao de objetos) fica em aberto -- so fazer se aparecer repeticao residual de objetos entre cliques. Sessao 7 (2026-05-26) FECHADA -- **T4.37 + T4.38 + T4.39 ENTREGUES em prod**. T4.38 entregou preview audio+imagem no /upload e /beats/[id]/review (custom AudioPlayer com waveform fake deterministica, MediaPreview com signed URLs, ManualTab do CoverPicker com card grande + meta-bar Replace). T4.37 evoluiu em 2 iteracoes: v1 modal multi-select (rejeitada por Gustavo "vamos deixar mais simples"), v2 ArtistComboBox singular inline com slots (UploadForm 4 slots + botao + adicionar, CapasWizard 2 slots primario/secundario), localStorage `beatpost:recent_artists` com pre-fill slot 1 + sugestoes de RECENTES no dropdown vazio (so no /upload), fallback "usar como texto livre" pra artistas fora do Spotify. T4.39 entregou essentia.js WASM client-side carregado via CDN dinamica (bypass do bundler -- pacote npm tinha `require('fs')` embutido que quebra Turbopack), botao "Auto-detect" no AudioAnalyzeBox com 3 campos BPM/KEY/SCALE separados, worker analyze.py vira noop quando producer ja preenche via cliente, migration 022 split music_key em key+scale com backfill das strings legacy ("A minor" -> key=A scale=Minor), anthropic_service aceita music_scale optional com back-compat. Stack responde ao concorrente typebeat.fun (BeatStars killer com auto-upload + beat store + 0% comissao + AI Channel Audit + Niche Finder) analisado em sessao 7. Bloqueadores pre-beta restantes: OAuth verification + quota YouTube + billing. HISTORICO sessao 6 (2026-05-25) -- T4.34 (estilo titulo) + T4.35 (banco capas manuais, 3 blocos) + T4.36 (bulk upload + selecionar enviadas) + redesign BriefSelector (card editorial protagonista do header /capas) entregues em prod. Rary recebeu tier `internal` pra testar geracao de capas sem trava. HISTORICO sessao 5 (2026-05-25) -- T4.28-T4.33 da v3 + 8 features de UX (#1-#8) entregues em prod. **Pra proxima sessao continuar:** (a) expandir `artist_universe.py` quando Gustavo trouxer pacote de novo artista (Pop Smoke, Future, Kendrick, Carti, 21 Savage etc.), (b) eval suite de regression visual pros 5 briefs canonicos, (c) `vocabulary.py` rico com matriz scene x light x mood pra liberar opcao `aleatorio` no wizard, (d) T4.11 teste E2E pytest, (e) img2img (adiado por Gustavo ate validar text-to-image em uso real). HISTORICO sessao 4 (mantido pra contexto): T4.28 prompt_skeleton com camera video-still em 2 variantes + estrutura 12 elementos + sub-locations por artista (5 validados) + drop campo cenario + anti-repeticao via DB. Sequencia entregue T4.27 setup -> T4.28 skeleton -> T4.29 artist_universe -> T4.30 genre_dna+mood_modulation+lighting_setups -> T4.31 variation_engine -> T4.32 builder+validators+user_prompt+switch+smoke test -> T4.33 drop cenario backend+frontend. Sessao 4 ABRIU em 2026-05-22 apos v2 (T4.19-T4.26) ter sido testada e produzido capas visualmente ruins -- causa: camera "Analog film + 35mm" gerava estetica polida oposta ao desejado. ADR `2026-05-22-prompt-dna-capa-v3.md` substitui v2 com camera video-still fixa (VHS/MiniDV/phone video comprimido) + estrutura 12 elementos + sub-locations por artista (5 validados: Drake, Travis, Weeknd, Fakemink, Nettspend; expansivel) + drop campo cenario do brief (inferido do universo do artista) + anti-repeticao via query nas ultimas 5 variation_seeds + palavras banidas (music video, cinematic, B-roll, director...) + references banidas (cinematografos/Vogue) vs permitidas (Larry Clark, Nan Goldin, Cobrasnake, Hedi Slimane) + anti-bias inline (sem asiaticos default, sem gang signs). Sequencia aprovada: T4.27 setup -> T4.28 skeleton -> T4.29 artist_universe -> T4.30 genre_dna+mood_modulation+lighting_setups -> T4.31 variation_engine -> T4.32 builder+validators+user_prompt+switch+smoke test -> T4.33 drop cenario backend+frontend. img2img fica pra DEPOIS da v3. T4.19-T4.26 marcadas como "iteracao 1 superada pela v3" (preservadas no historico). Tasks velhas (sem mudanca): T4.11 (teste E2E pytest, backlog), T4.15 (generate.py NAO dispara cover.py). Bloqueadores paralelos (sem mudanca): (1) Rary republicar beat `ee96c64f`, (2) aumento quota YouTube, (3) OAuth verification, (4) decisao billing.
**Tags:** beatpost, gustavo, mvp, saas, multitenant, supabase, nextjs, fastapi, gemini, youtube

## Contexto

Gustavo (executor das Fases 1-6) esta construindo o MVP de um Producer Hub SaaS para produtores de type beat. O produto e 100% cloud-native — tudo roda na nuvem, sem ambiente local. Stack: Next.js + FastAPI + Supabase + QStash (conforme definido por Henrique na Fase 0).

Sessao fundadora: `MEU-CEREBRO/sessoes/2026-04-25-1500-brainstorm-gustavo-startup-beatmakers.md`
Plano original: `~/.claude/plans/bom-na-verdade-vamos-sorted-lamport.md`

3 alertas que vem da sessao fundadora e atravessam todas as fases:

1. **Gustavo ainda nao usou a propria ferramenta** (sec 11.1) — MVP precisa ser dogfoodavel ate Fase 5. Ele e o primeiro beta tester.
2. **Diferencial real e A/B/C** (sec 11.10) — nao e automacao generica de postagem. Quem nao bate isso vira commodity.
3. **Beatmaker underground tem resistencia emocional ao marketing**, nao falta de ferramenta (sec 11.2). Nao prometer milagre. MVP entrega operacao automatizada, nao entrega coragem.

## Recorte (o que esta FORA)

- Multi-canal YouTube (V2)
- Billing / Stripe (planos e precos a definir, nao entra no MVP — limites de capa IA so registrados em api_usage)
- Metricas YouTube Analytics (V2)
- Banco proprio de tags trending (V3 — se Gemini grounded falhar)
- Thumbnail gerada baseada em padrao de artista (V2 — capa IA do MVP usa prompt base + brief estruturado + Claude runtime)
- A/B/C de capas por upload (V2 — MVP gera 1 ou 3 variacoes via lote, regeneracao consome creditos do tier)
- Variacao img2img de capa especifica (V1.5 — selecionar capa existente da biblioteca e gerar parecidas mantendo composicao)
- Extensao de navegador pra importar capa de loja (V2+ — descartado em 2026-05-21: alto custo de manutencao, risco de TOS BeatStars, escopo expande produto)
- Validacao automatica de qualidade da imagem (V2 — confiar na IA por enquanto)
- Drag-and-drop multi-arquivo BeatStars-style (V1.5 — quando entrar BeatStars na nuvem)
- Multi-tenant workspace / time (V3)
- TikTok / Instagram (nunca neste projeto)
- Mobile app (nunca neste projeto)

## Decisoes fechadas

| Tema | Decisao | ADR |
|---|---|---|
| **Stack** | Next.js 15 + FastAPI + Supabase + QStash + Gemini + Claude + ffmpeg + YouTube Data API v3 | `2026-04-25-stack.md` |
| **3 postagens** | ~~A/B/C no mesmo canal~~ **REMOVIDO DO MVP (2026-05-11)** — MVP publica 1 video por beat. Maioria dos produtores tem 1 canal. A/B/C entra na V2. | `2026-04-25-3-variacoes-abc.md` |
| **Multi-canal** | Fora do MVP. 1 canal por user. V2 expande. | `2026-04-25-3-variacoes-abc.md` |
| **Multitenancy** | Supabase RLS desde dia 1 em TODAS as tabelas com `user_id` | `2026-04-25-multitenancy-rls.md` |
| **Capa** | Prompt base mestre + brief estruturado (artista + sujeito + ambiente + luz + energia) → Claude monta prompt final → fal.ai gpt-image-2 quality=low ($0.013/capa total). Aba dedicada `/capas` com biblioteca reusavel + estilo padrao salvo. UX assincrona (~30s). Capa manual sempre disponivel em todos tiers. | `2026-05-21-geracao-de-capa-prompt-base-claude.md` (substitui `2026-05-07-geracao-de-capa-mvp.md`) |
| **Analise tecnica + tags** | Gemini 2.0 Audio (BPM/key/genero/artistas similares) + Google Search grounding (tags trending). Sem Cyanite, sem banco proprio. Mood NAO vem do Gemini — vem do produtor (cards visuais). | `2026-04-25-gemini-vs-cyanite.md` (refinada em 2026-05-07) |
| **Nome do beat** | IA sugere 3 (formato `[Artista] Type Beat - [Mood]`) com nomes inspirados nos top hits do artista via Spotify API. User escolhe ou edita. | `2026-04-25-3-variacoes-abc.md` + `2026-05-07-fluxo-upload-e-inputs-do-produtor.md` |
| **Input do upload** | Producer informa artista (lista controlada + Spotify normaliza custom) + mood (cards visuais 6 opcoes). IA NAO adivinha. | `2026-05-07-fluxo-upload-e-inputs-do-produtor.md` |
| **Estilo visual** | Producer configura brief padrao (5 campos) no primeiro acesso da aba `/capas`. Modelo hibrido: default salvo + edicao a qualquer momento + override pontual no momento de gerar. | `2026-05-21-geracao-de-capa-prompt-base-claude.md` |
| **Cobranca** | Pix na unha ate o 10o pagante. Stripe so depois. | `2026-04-25-cobranca-na-unha.md` |
| **Worker async** | Upstash QStash (HTTP-based, $0 idle) — nao Celery | `2026-04-25-stack.md` |
| **Repo** | Monorepo com `web/`, `api/`, `supabase/` | `2026-04-25-stack.md` |

## Principios arquiteturais (aplicam a TODAS as fases)

### P1 — RLS sempre ligado
Toda tabela com `user_id` tem `enable row level security` + policy `auth.uid() = user_id`. Storage tambem (bucket privado por user via path prefix). Nunca usar service-role key no codigo do cliente.

### P2 — Workers idempotentes
QStash faz retry automatico. Worker precisa chegar SEMPRE no mesmo estado final pra mesma row, mesmo executado N vezes. Checa `status` antes de avancar a state machine.

### P3 — usage_tracker em toda chamada paga
Gemini, Claude, YouTube upload, Supabase storage egress. Sem isso nao sabemos se MRR cobre custo por usuario. Pattern do `transcribe/yabadoo/common/usage_tracker.py` adaptado pra row em `api_usage`.

### P4 — Plan mode em cada Fase
Cada Fase abre `/pique:executar`, ele entra em plan mode, voce aprova, executa task por task. Commit + push entre fases.

### P5 — refresh_token nunca em texto puro
pgcrypto `pgp_sym_encrypt` com chave em env `SUPABASE_VAULT_KEY`. Nunca logar.

## Tasks

Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluida · `[-]` bloqueada · `[!]` skipped

---

### Fase 0 — Scaffolding e contexto (Henrique entrega antes de passar pro Gustavo)

#### `[x]` T0.1 — Criar `BEATPOST/` em PROGRAMAS + estrutura monorepo + template

- **Arquivos:** raiz + 19 pastas (`docs/`, `web/`, `api/`, `supabase/`, `.claude/`)
- **O que fazer:** mkdir da arvore + Write CLAUDE.md, README.md, .env.example, .gitignore, .claude/rules/{workflow,testing}.md, docs/_mapa.md, docs/decisoes/_template-decisao.md
- **Criterio de pronto:** `find BEATPOST/ -type f` lista 8 arquivos + estrutura de pastas completa
- **Dependencia:** —

#### `[x]` T0.2 — Criar `_tasks-mvp.md` com Fases 1-6 detalhadas

- **Arquivo:** `_tasks-mvp.md` (este arquivo)
- **Criterio de pronto:** Gustavo abre, le, entende sem perguntar nada
- **Dependencia:** T0.1

#### `[x]` T0.3 — Escrever ADRs + contexto + arquitetura + sessao

- **Arquivos:**
  - `docs/decisoes/2026-04-25-stack.md`
  - `docs/decisoes/2026-04-25-multitenancy-rls.md`
  - `docs/decisoes/2026-04-25-3-variacoes-abc.md`
  - `docs/decisoes/2026-04-25-capa-manual.md`
  - `docs/decisoes/2026-04-25-gemini-vs-cyanite.md`
  - `docs/decisoes/2026-04-25-cobranca-na-unha.md`
  - `docs/contexto/visao-mvp.md`
  - `docs/contexto/publico-alvo.md`
  - `docs/contexto/recorte-mvp.md`
  - `docs/arquitetura/pipeline-upload-postagem.md`
  - `docs/arquitetura/schema-supabase.md`
  - `docs/arquitetura/fluxo-oauth-youtube.md`
  - `docs/arquitetura/workers-qstash.md`
  - `docs/sessoes/2026-04-25-1500-brainstorm-mvp.md`
- **Criterio de pronto:** `docs/_mapa.md` indexa todos. Cada doc tem <150 linhas.
- **Dependencia:** T0.2

#### `[x]` T0.4 — Gerar 9 docs de referencia via Context7

- **Arquivos:** `docs/referencias/{nextjs,fastapi,supabase-auth,supabase-storage,gemini-audio,youtube-data-api-v3,ffmpeg,upstash-qstash,shadcn-ui}.md`
- **O que fazer:** Pra cada lib, query Context7 pegando versao alvo + 5 snippets minimos + gotchas conhecidos
- **Criterio de pronto:** Cada doc tem versao alvo declarada + 5+ exemplos de codigo + secao "Gotchas" + link pra docs oficiais
- **Dependencia:** T0.3

#### `[x]` T0.5 — Criar Supabase project + aplicar migrations

- **Arquivos:**
  - `supabase/migrations/001_initial_schema.sql` (tabelas)
  - `supabase/migrations/002_rls_policies.sql` (policies)
  - `supabase/migrations/003_storage_buckets.sql` (buckets + policies)
  - `supabase/config.toml`
- **O que fazer:** Criar projeto na regiao `sa-east-1`, aplicar migrations, salvar IDs no `CLAUDE.md`, criar buckets `audios` e `covers` privados
- **Criterio de pronto:** `select * from beats` retorna vazio (RLS em vigor); upload via signed URL funciona end-to-end
- **Dependencia:** T0.3 (precisa do schema definido em arquitetura)

#### `[x]` T0.6 — `git init` + commit inicial + criar repo GitHub + push

- **O que fazer:** `git init`, primeiro commit `chore: scaffolding inicial BeatPost`, `gh repo create HENRIQUE4345/beatpost --private --source=. --push`
- **Criterio de pronto:** `gh repo view HENRIQUE4345/beatpost` mostra repo. Push de `master` ou `main` ok.
- **Dependencia:** T0.5 (pra commitar com migrations dentro)

#### `[x]` T0.7 — Configurar Vercel (web/) + Railway (api/)

- **O que fazer:**
  - Vercel: importar repo, root directory = `web/`, framework Next.js, env vars do `.env.local`
  - Railway: importar repo, root = `api/`, buildpack Python, ffmpeg via apt buildpack, env vars
  - Sem deploy real ainda — so webhooks ligados, build vazio passa
- **Criterio de pronto:** Vercel mostra build hello-world. Railway mostra `/health` retornando 200.
- **Dependencia:** T0.6

---

### Fase 1 — Auth + dashboard vazio (Gustavo executa)

> **Por que:** sem auth, qualquer feature seguinte vira inseguranca multitenancy. Comeca pelo basico — login, route guard, layout.

#### `[x]` T1.1 — Setup inicial Next.js + Tailwind + shadcn/ui

- **Arquivo:** `web/`
- **O que fazer:** `pnpm create next-app web --typescript --tailwind --app`. Instalar shadcn/ui (`npx shadcn@latest init`). Configurar paths, alias `@/`.
- **Criterio de pronto:** `pnpm dev` em `web/` mostra pagina inicial Tailwind funcionando
- **Dependencia:** T0.7

#### `[x]` T1.2 — Login Supabase Auth (email + Google)

- **Arquivo:** `web/app/(auth)/login/page.tsx` + `web/lib/supabase/{client,server}.ts`
- **O que fazer:** Componente `<LoginForm />` com Supabase Auth UI (`@supabase/auth-ui-react`). Provider Google habilitado no Supabase dashboard. Callback em `/auth/callback`.
- **Criterio de pronto:** Login com email/Google redireciona pra `/dashboard`
- **Dependencia:** T1.1

#### `[x]` T1.3 — Middleware Next.js — redirect se nao autenticado

- **Arquivo:** `web/middleware.ts`
- **O que fazer:** Middleware checa cookie Supabase, redireciona pra `/login` se rota for `(app)/*` e nao tiver sessao
- **Criterio de pronto:** Acessar `/dashboard` sem login → redireciona pra `/login`. Com login → carrega.
- **Dependencia:** T1.2

#### `[x]` T1.4 — Dashboard vazio + sidebar (Upload, Beats, YouTube, Sair)

- **Arquivos:** `web/app/(app)/layout.tsx`, `web/app/(app)/dashboard/page.tsx`, `web/components/Sidebar.tsx`
- **O que fazer:** Layout com sidebar fixa esquerda 240px + conteudo. 4 itens. Logout chama `supabase.auth.signOut()`.
- **Criterio de pronto:** Logado, ve sidebar. Clicar Sair desloga e volta pra `/login`.
- **Dependencia:** T1.3

#### `[x]` T1.5 — API: `/health` endpoint + integracao web→api

- **Arquivos:** `api/app/main.py`, `api/app/routes/health.py`, `web/lib/api.ts`
- **O que fazer:** FastAPI app com CORS configurado. Rota `GET /health` retorna `{ok: true, version}`. Web chama no boot do dashboard.
- **Criterio de pronto:** Dashboard mostra "API: OK" no canto. CORS nao bloqueia.
- **Dependencia:** T1.1

#### `[x]` T1.6 — Test E2E: login → dashboard → logout

- **Arquivos:** `web/e2e/auth.spec.ts`
- **O que fazer:** Playwright cria user fake via Supabase admin, faz login, verifica dashboard, desloga
- **Criterio de pronto:** `pnpm test:e2e` passa
- **Dependencia:** T1.4

#### `[!]` T1.7 — Onboarding pos-cadastro: galeria de selecao de estilo visual padrao

- **Status:** SKIPPED em 2026-05-21. Substituido pelo wizard dentro da aba `/capas` (ver T4.13). Razao: ADR `2026-05-21-geracao-de-capa-prompt-base-claude.md` descartou conceito de "estilos fixos no onboarding" — configuracao do brief padrao agora acontece na primeira entrada da aba dedicada `/capas`, junto da primeira geracao real. Mantém o objetivo (definir estilo padrao 1x) mas sem rota separada de onboarding.

---

### Fase 2 — Upload + conversao MP3 (Gustavo executa)

> **Por que:** primeiro fluxo real ponta-a-ponta. Web faz upload, backend converte, status atualiza ao vivo.

#### `[x]` T2.1 — UI de upload com progress bar

- **Arquivos:** `web/app/(app)/upload/page.tsx`, `web/components/UploadForm.tsx`
- **O que fazer:** Form com 2 inputs (audio, capa). Upload direto pro Supabase Storage via signed URL (nao passa pelo backend). Progress bar real.
- **Criterio de pronto:** Upload de WAV de 10MB mostra progress de 0 a 100%, salva no bucket `audios/{user_id}/{beat_id}/original.wav`
- **Dependencia:** T0.5, T1.4

#### `[x]` T2.2 — Endpoint POST /beats que cria row + dispara QStash

- **Arquivos:** `api/app/routes/beats.py`, `api/app/services/supabase_service.py`, `api/app/services/qstash_service.py`
- **O que fazer:** Recebe `{audio_path, cover_path}`, valida ownership (RLS via JWT do user), insere row em `beats` com status=uploaded, publica job QStash → `POST /api/beats/{id}/process`
- **Criterio de pronto:** Dado upload do T2.1, row em `beats` aparece com status=uploaded e job aparece no QStash dashboard
- **Dependencia:** T2.1

#### `[x]` T2.3 — Worker convert.py: validacao + avanco de status

- **Arquivos:** `api/app/workers/convert.py`, `api/app/services/qstash_service.py`
- **Decisao (2026-05-11):** MVP aceita somente MP3. Produtor entrega o arquivo ja masterizado com a tag de produtor gravada no audio — nao tocamos no arquivo. Sem ffmpeg nesta etapa (ffmpeg entra so na Fase 5 para gerar o MP4). Loudnorm foi descartado para nao alterar a master do produtor. Se no futuro precisar aceitar WAV/FLAC/M4A (ex: integracao BeatStars), adicionar ffmpeg_service.py aqui.
- **O que faz:** Endpoint `/internal/beats/{id}/convert` chamado pelo QStash. Verifica existencia do arquivo no Storage, avanca status `uploaded → converted`, dispara QStash → analyze. **Idempotente:** se status ja for >= converted, retorna 200 sem fazer nada.
- **Criterio de pronto:** Beat com MP3 no Storage tem status atualizado para converted. Job analyze aparece no QStash.
- **Dependencia:** T2.2

#### `[x]` T2.4 — Pagina /beats/[id] com status em tempo real

- **Arquivos:** `web/app/(app)/beats/[id]/page.tsx`
- **O que fazer:** Subscribe via Supabase Realtime na row do beat. Mostra step list (Upload → Conversao → Analise → Geracao → Pronto pra revisar) com check/loader.
- **Criterio de pronto:** Apos upload, abre `/beats/[id]` e ve "Conversao" com loader → check em ~30s
- **Dependencia:** T2.3

#### `[x]` T2.5 — Test: worker convert avanca status corretamente

- **Arquivo:** `api/tests/workers/test_convert.py`
- **O que fazer:** Pytest com mock do Supabase. Testa: (1) beat uploaded → vira converted e dispara analyze; (2) beat ja converted → retorna skipped sem fazer nada (idempotencia); (3) beat sem arquivo no Storage → marca failed.
- **Criterio de pronto:** `pytest tests/workers/test_convert.py` passa
- **Dependencia:** T2.3

#### `[x]` T2.6 — Migration: novos campos de input (mood, artistas, capa biblioteca)

- **Arquivos:** `supabase/migrations/004_inputs_produtor.sql`
- **Reformulada em 2026-05-21** apos ADR nova de capa. Removidos `visual_style` em beats e `default_visual_style` em users (conceito de estilos fixos descartado). Adicionados `default_brief` JSON e referencia a `cover_library`.
- **O que fazer:**
  - Tabela `artistas_referencia` (id, nome_canonico, spotify_id, popularity, ativo, criado_em). Seed inicial preenchido em T2.7.
  - Tabela `beat_artistas` (beat_id, artista_id, role: 'main' | 'collab') — relacao N:N.
  - Em `beats`: adicionar colunas `mood` (enum sad/aggressive/romantic/dark/energetic/atmospheric, NOT NULL — usado pelo generate.py pra titulo/descricao), `cover_source` (enum 'library' | 'manual' | 'inline_ai', default 'library'), `cover_id` (uuid FK soft pra `cover_library.id`, nullable). Campo `visual_style` REMOVIDO.
  - Em `user_profiles`: adicionar `default_brief` (JSONB com campos `artista_id`, `sujeito`, `ambiente`, `iluminacao`, `energia`, `nota_livre`, nullable — nao preenchido ate primeiro acesso da aba `/capas`). Campo `default_visual_style` REMOVIDO.
  - RLS ligado em `beat_artistas` (via beat → user_id). `artistas_referencia` e leitura publica.
- **Criterio de pronto:** Migration roda limpa. `select * from artistas_referencia` retorna seed. Insert em `beats` exige mood.
- **Dependencia:** T0.5

#### `[ ]` T2.7 — Curadoria inicial: lista de ~80-100 artistas type beat trending

- **Arquivos:** `supabase/seeds/artistas_referencia.sql`
- **O que fazer:** Gustavo cura manualmente lista de 80-100 artistas mais usados em type beats (Drake, Travis Scott, Kendrick, Don Toliver, Future, Carti, Yeat, Lil Baby, Nettspend, Lucy Bedroque, Fakemink, Bladee, Yung Lean, Pop Smoke, Central Cee, Tems, Burna Boy, etc.). Pra cada um: nome canonico + spotify_id (pode ser preenchido via batch script chamando Spotify API).
- **Criterio de pronto:** SQL seed com 80-100 rows valida. Spotify_id preenchido pra >= 90% (alguns artistas underground podem nao ter).
- **Dependencia:** T2.6, T2.8 (precisa do spotify_service pra preencher IDs)

#### `[x]` T2.8 — Service: spotify_service.py (auth + search + top tracks)

- **Arquivos:** `api/app/services/spotify_service.py`
- **Status:** ✅ DONE (verificado em auditoria 2026-05-14). Implementacao real concluida em 2026-05-12 — ver entrada duplicada na Fase 4 abaixo. Client Credentials + get_top_tracks + cache de token em memoria. Cache Redis 7d nao implementado (decisao consciente: cache em memoria do processo basta no MVP).

#### `[ ]` T2.9 — UI upload: campo artista com autocomplete + custom + validacao Spotify

- **Arquivos:**
  - `web/components/SeletorDeArtista.tsx`
  - `web/app/api/artistas/search/route.ts`
  - `web/app/api/artistas/validate/route.ts`
- **O que fazer:**
  - Combobox shadcn que busca em `artistas_referencia` por nome (debounced 200ms)
  - Suporta multi-select (artista principal + colaboradores)
  - Se digitado nao bate nada na lista: oferece "Usar 'XYZ' como custom"
  - Custom passa por `POST /api/artistas/validate` que chama spotify_service.search_artist → confirma com producer "Voce quis dizer X?"
  - Apos confirmar, custom validado pode virar row em `artistas_referencia` (ou ficar como custom local — definir em design)
- **Criterio de pronto:** Producer digita "drake" → autocomplete lista Drake. Producer digita "FAKEMINK" custom → Spotify normaliza pra "Fakemink" e confirma.
- **Dependencia:** T2.6, T2.7, T2.8

#### `[ ]` T2.10 — UI upload: cards visuais de mood (6 opcoes)

- **Arquivos:** `web/components/SeletorDeMood.tsx`
- **O que fazer:** Grid de 6 cards (sad/aggressive/romantic/dark/energetic/atmospheric). Cada card com cor de fundo + emoji grande + nome. Selecao single, obrigatoria. Estado armazenado no form.
- **Criterio de pronto:** Form de upload nao envia sem mood selecionado. Click visual claro. Mobile-friendly.
- **Dependencia:** T2.1

#### `[x]` T2.11 — UI upload: picker de capa (biblioteca + manual + atalho gerar)

- **Arquivos:** `web/components/UploadForm.tsx` (atualiza T2.1), `web/components/CoverPicker.tsx` (novo)
- **Reformulada em 2026-05-21** apos ADR nova de capa. Substituido o toggle "Gerar com IA / Enviar minha" por picker de biblioteca.
- **O que fazer:** Substitui o input de capa atual por componente `<CoverPicker />` que mostra:
  1. **Tab "Biblioteca"** (default): grid de capas ja geradas pelo produtor em `cover_library` (T4.13). Click numa capa = preenche `cover_id`. Empty state se nunca gerou: "Voce ainda nao tem capas. Gerar primeira capa" → link `/capas`.
  2. **Tab "Subir manual"**: input file drag-and-drop (ja existe em T6.19), salva em storage, `cover_source=manual`, `cover_path` preenchido.
  3. **Tab "Gerar agora"**: atalho que abre modal sobreposto com brief atual padrao + botao "Gerar 1 capa (1 credito)". Apos geracao, capa entra na biblioteca + e selecionada automaticamente.
- **Criterio de pronto:** Picker funciona com 3 tabs. Capa selecionada via biblioteca preenche `cover_id` no submit. Manual preenche `cover_path`. Gerar agora dispara fluxo e seleciona.
- **Dependencia:** T2.1, T2.6, T4.13 (aba `/capas` precisa existir), T4.15 (worker cover.py funcionando)

#### `[x]` T2.12 — Endpoint POST /beats atualizado: aceitar artistas + mood + cover_id (biblioteca) ou cover_path (manual)

- **Arquivos:** `api/app/routes/beats.py` (atualiza T2.2)
- **Reformulada em 2026-05-21** apos ADR nova de capa. Substituido `visual_style` por `cover_id` (FK biblioteca).
- **O que fazer:** Atualizar o endpoint da T2.2 para receber `{audio_path, artista_principal_id, colaboradores_ids?, mood, cover_source, cover_id?, cover_path?}`. Validacoes:
  - `mood` obrigatorio
  - Se `cover_source='library'`: `cover_id` obrigatorio (e deve pertencer ao user via RLS check)
  - Se `cover_source='manual'`: `cover_path` obrigatorio
  - Se `cover_source='inline_ai'`: dispara fluxo Claude+fal.ai no worker (T4.15) e usa capa resultante
  - Inserir em `beats` + `beat_artistas`
- **Criterio de pronto:** POST com `cover_id` valido cria beat com capa da biblioteca. POST com `cover_path` cria beat com capa manual. POST sem mood retorna 400. POST com `cover_id` de outro user retorna 403.
- **Dependencia:** T2.2, T2.6, T4.12 (tabela `cover_library` existe)

#### `[x]` T2.13 — Inputs manuais BPM + link da loja no upload

- **Arquivos:**
  - `supabase/migrations/005_store_link.sql` (ADD COLUMN beats.store_link)
  - `web/components/UploadForm.tsx` (campo BPM obrigatorio + checkbox "ja publicado" + campo link condicional)
  - `api/app/routes/beats.py` (aceitar bpm e store_link)
  - `api/app/services/audio_service.py` (remover librosa.beat.beat_track, manter so chroma_cqt)
  - `api/app/workers/analyze.py` (nao atualiza mais bpm — vem do upload)
  - `api/app/services/anthropic_service.py` (substituir placeholder do link na descricao)
  - `api/app/workers/generate.py` (passar store_link)
- **Decisao (2026-05-12):** Librosa erra BPM em type beats com hi-hats em tripletas (caso real: beat 140 BPM detectado como 92). Produtor sabe o BPM real do beat dele — inputs manuais sao mais confiaveis que DSP. Link da loja tambem por input direto: substitui placeholder `[insira seu link de venda]` na descricao quando preenchido.
- **Criterio de pronto:** Upload com BPM=140 chega na review com "BPM - 140" na descricao e tag "140 bpm type beat". Upload com store_link tem o link na descricao em vez do placeholder.
- **Dependencia:** T4.2 (pipeline funcionando — concluido)
- **ADR:** `docs/decisoes/2026-05-12-bpm-manual-e-link-loja.md`

#### `[x]` T2.14 — Pagina /beats: lista de cards de todos os beats do produtor

- **Arquivos:**
  - `web/app/(app)/beats/page.tsx` (lista cards — pagina hoje quebra ao sair de /beats/[id])
  - `web/components/BeatCard.tsx` (card individual com thumbnail, titulo, status, BPM, key, link para review)
  - `api/app/routes/beats.py` (GET /beats que lista os beats do usuario autenticado, ordenados por created_at desc)
- **Problema:** Apos upload, usuario cai em /beats/[id]. Se sair dessa pagina, /beats fica vazio ou da erro — nao consegue voltar pro beat dele. Sem visibilidade do historico de beats gerados.
- **O que fazer:**
  - Pagina /beats lista todos os beats do produtor (multitenant via RLS)
  - Card mostra: thumbnail (capa), titulo do video (ou "[Aguardando IA]" se status != ready_for_review), artista_nome, BPM, key, status (badge colorido), data de criacao
  - Clique no card vai pra /beats/[id] (se em processamento) ou /beats/[id]/review (se pronto)
  - Filtros simples por status (draft/scheduled/published/failed)
  - Empty state se nao tem nenhum beat ("Voce ainda nao subiu nenhum beat. Comecar agora.")
- **Criterio de pronto:** Apos 3 uploads, /beats mostra 3 cards. Clique em cada card abre o detalhe correto. Sair e voltar nao quebra a pagina.
- **Dependencia:** T2.13 (pipeline funcionando)

#### `[x]` T2.15 — Aceitar WAV no upload + converter pra MP3 320kbps no servidor

- **Arquivos:**
  - `web/components/UploadForm.tsx` (input `accept` + validacao do drop aceitam `.wav`; generaliza o path do upload que hoje e hardcoded `original.mp3`)
  - `api/app/services/ffmpeg_service.py` (nova funcao `transcode_to_mp3`: WAV -> MP3 320kbps, SEM loudnorm)
  - `api/app/workers/convert.py` (se o arquivo for WAV: baixa do Storage, transcodifica, sobe o MP3, atualiza `audio_path`, apaga o WAV original; se ja for MP3: continua noop como hoje)
  - `api/tests/workers/test_convert.py` (novo caso: WAV vira MP3 e avanca status; MP3 segue noop/idempotente)
  - `web/components/AudioAnalyzeBox.tsx` (conferir que o Auto-detect de BPM/KEY via essentia.js decodifica WAV — Web Audio decodifica nativamente, validar)
- **Decisao (2026-06-01):** Conversao no SERVIDOR (Opcao B), nao no navegador. ffmpeg ja existe (`ffmpeg_service.py`). MP3 **320kbps** pra qualidade de "MP3 normal" (sem perda alem do esperado da compactacao). **SEM loudnorm/compressor/limitador** — preserva a master do produtor (so muda o formato/codec). Realiza a previsao deixada na nota da T2.3 ("se precisar aceitar WAV... adicionar ffmpeg aqui"). Mantem a filosofia [[project_audio_nao_e_normalizado]]: nao normaliza, so transcodifica container/codec. Trade-off aceito: upload do WAV (~30-50MB) e mais lento que o do MP3.
- **O que fazer:** Produtor pode soltar MP3 (como hoje) OU WAV. Se WAV, o convert.py converte pra MP3 320k e o resto do pipeline (analyze/generate/publish) segue identico, sem saber que veio de WAV.
- **Criterio de pronto:** Upload de WAV de teste -> `audios/{user}/{beat}/original.mp3` existe a 320kbps, `audio_path` aponta pro MP3, WAV original removido do Storage, status avanca pra `converted` e dispara analyze. Upload de MP3 continua noop. `pytest tests/workers/test_convert.py -m "not slow"` passa.
- **Dependencia:** T2.3 (convert.py), T5.3 (ffmpeg_service)
- **FEITO (2026-06-02):** `ffmpeg_service.transcode_to_mp3` (libmp3lame 320k, -vn, sem loudnorm). `convert.py` detecta nao-MP3 via `_precisa_converter`, baixa, transcodifica, sobe `original.mp3`, troca `audio_path` + status numa update, remove o WAV SO depois (idempotencia QStash). Frontend: input `accept` + drop + textos aceitam WAV, `audio_path` vira `original.wav` pra WAV. AudioAnalyzeBox ja lidava com WAV (decodeAudioData). 4 testes do convert verdes (novo caso WAV), typecheck + build verdes. **Validacao em prod pendente:** subir 1 WAV real e ver virar MP3 + pipeline seguir. **Atencao:** conferir limite de tamanho do bucket `audios` no Supabase (WAV ~30-50MB pode bater no limite default).

---

### Fase 3 — Analise IA Gemini Audio + grounded search (Gustavo executa)

> **Por que:** sem analise tecnica + tags trending, nao tem como gerar copy direcionado. Gemini extrai BPM/key/genero, sugere artistas similares (backup) e busca tags trending no Google.
>
> **Importante:** mood do beat **NAO** vem do Gemini — vem do produtor via cards visuais no upload (T2.10). Gemini detecta apenas genero musical (trap/drill/afrobeat/etc), nao mood emocional.

#### `[x]` T3.1 — Service: audio_service.detect_bpm_and_key

- **Arquivo:** `api/app/services/audio_service.py`
- **Decisao (2026-05-11):** Substituido Gemini por librosa (gratuito, preciso, deterministico). Detecta apenas BPM e tom musical (ex: "A minor"). Genero removido (IA falha muito). Artistas similares removidos (produtor informa o artista). Mood removido (vem do produtor via cards visuais). Tom detectado via perfis de Krumhansl-Kessler sobre chromagrama.
- **Criterio de pronto:** Funcao retorna {bpm, music_key} para qualquer MP3 valido.
- **Dependencia:** librosa, soundfile, ffmpeg (ja no nixpacks)

#### `[x]` T3.2 — Service: gemini_service.search_trending_tags (grounded)

- **Arquivo:** `api/app/services/gemini_service.py`
- **Status:** ✅ DONE (verificado em auditoria 2026-05-14). Implementacao real concluida em 2026-05-12 — ver entrada duplicada na Fase 4 abaixo. gemini-2.5-flash + google_search tool + parse via regex + graceful fallback. Chamado em generate.py.

#### `[x]` T3.3 — Worker analyze.py orquestra + atualiza beats

- **Arquivos:** `api/app/workers/analyze.py`
- **O que fazer:** Endpoint `/internal/beats/{id}/analyze`. Baixa MP3 do Storage para arquivo temporario, chama audio_service.detect_bpm_and_key, salva bpm e music_key no row, status=analyzed, dispara QStash → generate. Idempotente. T3.2 (tags) postergado para quando artista estiver disponivel (apos T2.9).
- **Criterio de pronto:** Beat convertido → row tem bpm e music_key. Status=analyzed.
- **Dependencia:** T3.1

#### `[x]` T3.4 — usage_tracker registra cost_usd em api_usage

- **Arquivo:** `api/app/services/usage_tracker.py`
- **O que fazer (escopo executado 2026-05-18, atualizado em relacao ao plano original):**
  - Modulo `usage_tracker.py` com `track(user_id, feature, tokens_in, tokens_out, duration_ms, beat_id, metadata)` e tabela `PRICING` (Claude Sonnet 4.6, Gemini 2.5 Flash, YouTube upload, fal.ai gpt-image-2).
  - Plugado em `gemini_service.search_trending_tags` (tokens via `usage_metadata`).
  - Plugado em `anthropic_service.generate_metadata` (tokens via `response.usage`).
  - Plugado em `youtube_service.upload_video` (quota units 1600 + 50 thumbnail no metadata).
  - Workers `generate.py` e `publish.py` passam `user_id` + `beat_id`.
  - Falha silenciosa: `try/except` envolvendo o INSERT — nunca derruba o pipeline.
  - Escopo NAO incluido: Gemini audio (descartado, analise hoje e librosa local), fal.ai (capa IA pausada), Supabase storage egress (sem medicao por chamada).
- **Criterio de pronto:** Apos `generate.py` rodar, `api_usage` tem 2 rows (claude_sonnet_4_6 + gemini_2_5_flash com cost_usd > 0). Apos `publish.py`, 1 row youtube_upload com quota_units no metadata. 22 testes existentes seguem passando.
- **Dependencia:** T3.3

#### `[ ]` T3.5 — Test: analise de beat real

- **Arquivo:** `api/tests/services/test_gemini.py` (marker `@slow`)
- **O que fazer:** Roda T3.1 + T3.2 contra beat real, valida BPM tolerancia, artistas plausiveis, tags com "type beat"
- **Criterio de pronto:** `pytest -m slow tests/services/test_gemini.py` passa
- **Dependencia:** T3.3

---

### Fase 4 — Geracao 3 variacoes A/B/C + UI picker (Gustavo executa)

> **Por que:** o angulo defensavel. 3 versoes diferentes do mesmo beat, beatmaker escolhe e edita.

#### `[x]` T4.1 — Service: anthropic_service.generate_metadata (simplificado — 1 variacao)

- **Arquivo:** `api/app/services/anthropic_service.py`
- **Decisao (2026-05-12):** A/B/C removido do MVP. Claude gera 1 titulo + descricao com template padrao do produtor + 80-100 tags. Inputs: artista_nome + bpm + music_key + top_tracks (Spotify) + trending_tags (Gemini). Mood removido desta fase (aguarda decisao com socio). Capa obrigatoriamente manual por enquanto.
- **Criterio de pronto:** ✅ Funcao retorna {beat_name, titulo, descricao, tags[]} para qualquer artista.
- **Dependencia:** T2.8 (spotify_service — implementado junto nesta fase)

#### `[x]` T2.8 — Service: spotify_service.py (auth + top tracks)

- **Arquivo:** `api/app/services/spotify_service.py`
- **Decisao (2026-05-12):** Implementado Client Credentials + search_artist + get_top_tracks. Cache de token em memoria. Graceful fallback se Spotify indisponivel.
- **Criterio de pronto:** ✅ get_top_tracks("drake") retorna lista de titulos reais.
- **Dependencia:** SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET no Railway

#### `[x]` T3.2 — Service: gemini_service.search_trending_tags (grounded)

- **Arquivo:** `api/app/services/gemini_service.py`
- **Decisao (2026-05-12):** Implementado. Usa gemini-2.5-flash com google_search tool. Parse manual via regex. Graceful fallback se Gemini indisponivel.
- **Criterio de pronto:** ✅ Retorna lista de tags trending para artista informado.
- **Dependencia:** GOOGLE_API_KEY no Railway

#### `[~]` T4.1-original — Service: anthropic_service.generate_3_variants

- **Arquivo:** `api/app/services/anthropic_service.py`
- **O que fazer:** Funcao recebe `(beat_metadata)` e retorna 3 pacotes `{titulo, descricao, tags[]}`. Inputs incluem: artista principal + colaboradores (do form), mood (do form, cards visuais), BPM/key/genero (do analyze.py), artistas_similares (do analyze.py — backup pra angulo C), tags trending (do analyze.py), e **top 10 musicas do artista via Spotify API** (para alimentar nomes inspirados). Prompt forca angulos distintos:
  - **A:** angulo `[Artista 1] Type Beat - [Mood]` com nome inspirado no estilo lexical dos hits do artista (ex: Drake → "GOD PLAN", "FEELINGS"). Importante: **inspirado em, nao copia literal** — evita problema de copyright.
  - **B:** angulo `[BPM] BPM [Genero] Type Beat - [Tom]`
  - **C:** angulo `[Artista 2] x [Artista 3] Type Beat - [Genero]` (usa colaboradores se houver, senao usa artistas similares do analyze; usa genero detectado pelo Gemini)
- **Criterio de pronto:** 3 titulos disjuntos (>50% palavras diferentes), tags com >50% disjuncao entre as 3 variacoes. Pra "Drake" + mood "sad", pelo menos 1 dos 3 titulos tem palavra-chave inspirada em hit real (testavel comparando com top tracks Spotify).
- **Dependencia:** T0.4 (referencia Claude), T2.8 (spotify_service)

#### `[x]` T4.2 — Worker generate.py cria 1 row em posts (simplificado)

- **Arquivo:** `api/app/workers/generate.py`
- **Decisao (2026-05-12):** Orquestra Spotify + Gemini + Claude. Cria 1 post (variacao='A'). Graceful: Spotify e Gemini sao opcionais (Claude gera mesmo sem eles). Erro real encontrado no primeiro teste — investigar na proxima sessao.
- **Criterio de pronto:** ⚠️ Implementado mas com erro no primeiro teste real. Investigar.
- **Dependencia:** T4.1, T3.2, T2.8

#### `[ ]` T4.2-original — Worker generate.py cria 3 rows em posts

- **Arquivos:** `api/app/workers/generate.py`
- **O que fazer:** Endpoint `/internal/beats/{id}/generate`. Chama T4.1, insere 3 rows em `posts` (variacao A/B/C, status=draft), atualiza beat status=ready_for_review.
- **Criterio de pronto:** Apos analyze, 3 posts criadas com titulos distintos. Status=ready_for_review.
- **Dependencia:** T4.1, T3.3

#### `[x]` T4.3 — UI: review page /beats/[id]/review (simplificado — 1 card)

- **Arquivos:** `web/app/(app)/beats/[id]/review/page.tsx`, `web/lib/api.ts` (fetchPost + patchPost), `api/app/routes/posts.py`
- **Decisao (2026-05-12):** 1 card editavel (titulo + descricao + tags chips + link de venda). Agendamento com datetime-local default hoje 18h. Perfil do produtor salvo em user_profiles (nome + instagram) via pagina /configuracoes.
- **Criterio de pronto:** ✅ Pagina criada. Depende do T4.2 funcionar (erro pendente).

#### `[ ]` T4.3-original — UI: 3 cards lado a lado em /beats/[id]

- **Arquivos:** `web/app/(app)/beats/[id]/page.tsx`, `web/components/VariacaoCard.tsx`
- **O que fazer:** Quando status=ready_for_review, mostra 3 cards com titulo+desc+tags editaveis (Textarea + chips de tag). Cada card tem botao "Salvar".
- **Criterio de pronto:** Editar titulo no card A salva no DB. Recarrega pagina, edicao persistiu.
- **Dependencia:** T4.2

#### `[x]` T4.4 — UI: agendamento integrado na review page (simplificado — 1 data)

- **Arquivo:** `web/app/(app)/beats/[id]/review/page.tsx`
- **Decisao (2026-05-12):** 1 data (default hoje 18h). PATCH /posts/{id} com scheduled_at + status=scheduled. Redireciona pra /beats apos confirmar.
- **Criterio de pronto:** ✅ Implementado. Depende do T4.2 funcionar.

#### `[ ]` T4.4-original — UI: confirmacao de agendamento (default hoje 18h, +3d, +7d)

- **Arquivos:** `web/components/AgendamentoForm.tsx`
- **O que fazer:** Apos editar 3 variacoes, beatmaker clica "Agendar publicacao". Modal mostra 3 date pickers default (hoje 18h, +3d 18h, +7d 18h), editaveis. Confirma → chama `PATCH /posts/{id}` em cada com `scheduled_at`.
- **Criterio de pronto:** Apos confirmar, 3 posts tem `scheduled_at` no DB e `status=scheduled`
- **Dependencia:** T4.3

#### `[ ]` T4.5 — Test: 3 variacoes diferentes pro mesmo beat

- **Arquivo:** `api/tests/services/test_anthropic.py` (marker `@slow`)
- **O que fazer:** Gera 3 variacoes pra um beat, valida disjuncao titulos + tags
- **Criterio de pronto:** `pytest -m slow` passa
- **Dependencia:** T4.1

### Bloco capa IA (reformulado em 2026-05-21 apos ADR `2026-05-21-geracao-de-capa-prompt-base-claude.md`)

> **Mudanca conceitual:** clusters fixos de estilos descartados. Novo modelo: prompt base mestre + brief estruturado do produtor (5 campos) → Claude monta prompt final → fal.ai gpt-image-2 quality=low gera ($0.013/capa total). Aba dedicada `/capas` com biblioteca reusavel + sistema de creditos por tier. UX assincrona.

#### `[x]` T4.6 — Curadoria do prompt base mestre (RESOLVIDA via T4.19-T4.26)

- **Status:** substituida em 2026-05-21 (sessao 3) pelo sistema DNA + sistema de variacao por 7 eixos descrito no ADR `2026-05-21-prompt-dna-capa-v2.md` e implementado nas tasks T4.19-T4.26.
- **Por que:** o conceito de "PROMPT_BASE_TEMPLATE unico" (1 exemplo concreto de capa servindo como molde) provou ser limitante quando o brief pedia algo muito diferente do exemplo. A v2 substitui pelo SYSTEM_PROMPT estruturado em 5 secoes (Master Principle + Universal DNA + Anti-Aesthetics + Genre Anchor + Output Rules), com diversidade real injetada por 7 eixos sorteados em Python.
- **Nota seguranca preservada:** o SYSTEM_PROMPT v2 continua sendo receita secreta. NUNCA logar em texto puro. NUNCA expor via endpoint publico.

#### `[x]` T4.7 — Service: fal_service.py (integracao fal.ai gpt-image-2)

- **Arquivos:** `api/app/services/fal_service.py`
- **O que fazer:**
  - SDK `fal-client` Python
  - Funcao `generate_cover(prompt: str, output_path: str) -> {url, cost_usd}` que chama `fal-ai/gpt-image-2`
  - Configuracao default: **quality=low** (validado em 2026-05-21: $0.0083/imagem, ~30s, qualidade aceitavel pra capa YouTube). Aspecto 1:1 (capa quadrada). Resolucao 1024x1024.
  - Erro graceful: timeout (90s), rate limit, conteudo bloqueado (NSFW/likeness).
  - usage_tracker.track com `feature='fal_cover_generation'`, `cost_usd=0.0083`.
- **Criterio de pronto:** Funcao com prompt teste retorna URL valida em ~30s. Imagem baixada bate aspecto 1024x1024.
- **Dependencia:** —

#### `[x]` T4.8 — Service: cover_prompt_builder.py (Claude monta prompt final)

- **Arquivos:** `api/app/services/cover_prompt_builder.py`
- **O que fazer:** Servico que recebe brief estruturado + chama Claude pra gerar prompt final pro fal.ai.
  - Constante `PROMPT_BASE_TEMPLATE` (hardcoded, da T4.6)
  - Funcao `build_cover_prompt(brief: dict, artista_nome: str) -> str` que:
    1. Carrega artista canonico (nome) de `artistas_referencia` via brief.artista_id
    2. Monta system prompt: "Voce vai gerar um prompt fotografico baseado no template abaixo. Receba os inputs do produtor e gere o prompt final completo seguindo a estrutura do template. NUNCA mencione o nome do artista real no prompt final — descreva apenas estetica e cenario. \n\nTEMPLATE: {PROMPT_BASE_TEMPLATE}"
    3. Monta user prompt: "Artista de referencia: {artista_nome}\nSujeito: {brief.sujeito}\nAmbiente: {brief.ambiente}\nIluminacao: {brief.iluminacao}\nEnergia: {brief.energia}\nNota livre: {brief.nota_livre or 'nenhuma'}\n\nGere o prompt final completo."
    4. Chama Claude Sonnet 4.6 (mesmo modelo de generate.py)
    5. Valida output: rejeita se contem nome do artista real (busca por substring case-insensitive); rejeita se < 200 chars (provavelmente falha)
    6. Retorna prompt final string + custo Claude via usage_tracker
- **Criterio de pronto:** `build_cover_prompt({sujeito: 'mulher', ambiente: 'interior luxo', iluminacao: 'vermelho', energia: 'sexy', nota_livre: ''}, 'Drake')` retorna prompt 400+ chars sem mencionar "Drake".
- **Dependencia:** T4.6 (prompt base), T2.7 (lista de artistas), anthropic_service existente

#### `[x]` T4.9 — Worker cover.py: orquestra Claude + fal.ai + salva biblioteca

- **Arquivos:** `api/app/workers/cover.py`
- **O que fazer:** Endpoint `/internal/covers/generate` chamado pelo QStash ou diretamente pela aba `/capas`. State machine:
  - Recebe `{user_id, brief: dict, lote: 1|3}`
  - Verifica creditos restantes do tier do user. Se 0, retorna 402.
  - Pra cada item do lote (1 ou 3 capas):
    1. `cover_prompt_builder.build_cover_prompt(brief, artista_nome)` — gera prompt final via Claude
    2. `fal_service.generate_cover(prompt_final, output_path)` — gera imagem
    3. Salva imagem em `covers/{user_id}/library/{uuid}.jpg` (Supabase Storage)
    4. Insere row em `cover_library`: `{id, user_id, image_url, brief_used: brief, prompt_final, cost_usd: 0.013, source: 'ai_generated', created_at}`
    5. Decrementa creditos do user (T4.14)
  - Retorna lista de IDs das capas geradas.
  - **Idempotente:** se receber job com mesmo `request_id` (deduplicacao via QStash), retorna resultado anterior.
- **Criterio de pronto:** POST com brief valido gera 1 ou 3 capas em ~30s (paralelo). Capas aparecem em `cover_library`. Creditos decrementados. usage_tracker registra Claude + fal.ai.
- **Dependencia:** T4.7, T4.8, T4.12 (tabela cover_library), T4.14 (sistema de creditos)

#### `[x]` T4.10 — UI aba `/capas`: rota e layout base

- **Arquivos:**
  - `web/app/(app)/capas/page.tsx` (rota)
  - `web/components/CapasHeader.tsx` (header com estilo atual + botao editar)
  - `web/components/CapasGrid.tsx` (grid da biblioteca)
  - `web/components/Sidebar.tsx` (adicionar item "Capas")
- **O que fazer:** Cria rota `/capas` no app group. Layout:
  - **Header:** se `user_profiles.default_brief` existe, mostra resumo ("Estilo: {artista} · {energia} · {nota_livre}") + botao "Editar estilo". Se nao existe, mostra estado "Voce ainda nao configurou seu estilo" + botao "Configurar agora".
  - **Botoes de acao:** "+ Gerar 1 capa (1 credito)" + "+ Gerar 3 variacoes (3 creditos)" + "+ Gerar com brief diferente". Disabled se sem creditos restantes.
  - **Display de creditos:** "X de Y creditos restantes este mes" + barra de progresso.
  - **Grid:** capas da biblioteca em cards 1:1, ordenadas por created_at desc. Cada card tem badge "AI" ou "Manual", data, botao 3-dots com opcoes "usar em beat" / "descartar" / (V1.5) "gerar variacao desta".
  - **Empty state:** se biblioteca vazia, ilustracao + "Gere sua primeira capa".
- **Criterio de pronto:** Rota acessivel. Mostra estado correto (sem estilo / com estilo). Grid renderiza capas reais via signed URLs. Botoes disabled corretamente.
- **Dependencia:** T1.4 (layout app), T4.12 (cover_library), T4.13 (wizard pra configurar primeira vez)

#### `[ ]` T4.11 — Test: pipeline cover.py ponta-a-ponta

- **Arquivos:** `api/tests/integration/test_cover_pipeline.py` (marker `@slow`)
- **O que fazer:** Cria user fake com brief padrao. Dispara worker cover.py com lote=3. Valida que: 3 capas foram geradas, salvas em storage, 3 rows em `cover_library`, `api_usage` registra 3 × (Claude + fal.ai), creditos do user decrementados em 3.
- **Criterio de pronto:** Test `@slow` passa.
- **Dependencia:** T4.9

#### `[x]` T4.12 — Migration: tabela `cover_library`

- **Arquivos:** `supabase/migrations/008_cover_library.sql`
- **O que fazer:** Cria tabela:
  ```sql
  create table cover_library (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    image_url text not null,
    storage_path text not null,
    brief_used jsonb,  -- {artista_id, sujeito, ambiente, iluminacao, energia, nota_livre}
    prompt_final text,  -- prompt completo enviado ao fal.ai (audit trail)
    cost_usd numeric(10,4) not null default 0,
    source text not null check (source in ('ai_generated', 'manual_upload')),
    used_in_beats_count integer not null default 0,
    created_at timestamptz not null default now()
  );
  
  create index idx_cover_library_user_created on cover_library(user_id, created_at desc);
  
  alter table cover_library enable row level security;
  
  create policy cover_library_owner on cover_library
    for all using (auth.uid() = user_id);
  ```
- **Bucket Storage:** `covers/{user_id}/library/{uuid}.jpg` com RLS via path prefix.
- **Criterio de pronto:** Migration roda limpa. Insert via RLS so funciona pro user dono. select de outro user retorna 0 rows.
- **Dependencia:** T0.5

#### `[x]` T4.13 — UI wizard de configuracao de estilo padrao

- **Arquivos:**
  - `web/components/CapasWizard.tsx` (modal/full-screen)
  - `web/components/CapasBrief.tsx` (form dos 5 campos, reutilizavel)
- **O que fazer:** Wizard que aparece:
  1. Na primeira entrada da aba `/capas` (se `default_brief` e null)
  2. Quando produtor clica "Editar estilo" no header
  
  Estrutura:
  - **Step 1:** Mensagem boas-vindas curta + explicacao "vamos definir seu estilo padrao"
  - **Step 2:** Form com 5 campos:
    - Artista de referencia (autocomplete `artistas_referencia` reusa `SeletorDeArtista` da T2.9)
    - Sujeito (6 cards visuais)
    - Ambiente (6 cards visuais)
    - Iluminacao (6 cards visuais)
    - Energia (6 cards visuais)
    - Nota livre (textarea opcional, max 200 chars)
  - **Step 3:** Preview + botao "Gerar 4 capas teste (4 creditos)" — gera lote pra produtor ver vibe
  - **Step 4:** Aprovacao — produtor confirma "Esse e meu estilo" → salva em `user_profiles.default_brief` → redireciona pro grid
  - Botao "Pular teste" disponivel no step 3 (salva brief mas nao gera capas) pra produtores que querem economizar creditos
- **Criterio de pronto:** Wizard completa fluxo. `default_brief` salvo em `user_profiles`. 4 capas teste aparecem na biblioteca apos confirmacao.
- **Dependencia:** T2.9 (SeletorDeArtista), T4.9 (worker funcional), T4.12 (cover_library)

#### `[x]` T4.14 — Sistema de creditos por tier (sem billing)

- **Arquivos:**
  - `supabase/migrations/009_credits.sql`
  - `api/app/services/credits_service.py`
- **O que fazer:**
  - Migration adiciona em `user_profiles`: `tier` (text, default 'free' — enum 'free'|'intermediate'|'premium'), `credits_used_this_month` (int, default 0), `credits_reset_at` (timestamptz, default first day of next month).
  - Tabela `PLAN_LIMITS` em codigo (Python dict): `{free: 5, intermediate: 15, premium: 40}`. Free comeca conservador (decisao 2026-05-21).
  - `credits_service`:
    - `get_remaining(user_id) -> int` — calcula `limit - credits_used_this_month`. Reset automatico se `credits_reset_at < now()`.
    - `consume(user_id, n) -> bool` — verifica disponibilidade, incrementa contador. Retorna false se nao tiver creditos.
    - Capa manual upload **nao consome creditos**.
- **Criterio de pronto:** User free tenta gerar 6 capas → 5 primeiras passam, 6a retorna 402. Apos virada do mes (mock), contador resetado.
- **Dependencia:** T0.5

#### `[ ]` T4.15 — Worker generate.py NAO dispara mais cover.py (capa vem da biblioteca)

- **Arquivos:** `api/app/workers/generate.py` (atualiza T4.2)
- **Reformulada em 2026-05-21**. Antes: generate.py disparava cover.py em paralelo se `cover_source='ai'`. Agora: cover.py e chamado avulso pela aba `/capas`, e no upload de beat o produtor JA escolhe capa da biblioteca (T2.11).
- **O que fazer:** Remover dispatch pra cover.py do generate.py. Quando `cover_source='inline_ai'` (atalho "Gerar agora" no upload, T2.11), o worker cover.py e disparado independentemente do generate.py (pode rodar em paralelo).
- **Criterio de pronto:** Upload com `cover_source='library'` ou `'manual'` nao dispara cover.py. Upload com `cover_source='inline_ai'` dispara cover.py + generate.py em paralelo.
- **Dependencia:** T4.2 (generate ja funcionando), T2.11 (picker no upload)

#### `[x]` T4.16 — Endpoint POST /covers/generate (chamado pela aba `/capas`) + GET /covers + GET /covers/credits + DELETE /covers/{id} + GET/POST/PATCH/DELETE /covers/briefs/*

- **Arquivos:** `api/app/routes/covers.py`
- **O que fazer:** Endpoint publico (autenticado) que aba `/capas` chama. Aceita `{brief?: dict, lote: 1|3, override_default: bool}`.
  - Se `override_default=false` (default), usa `user_profiles.default_brief`.
  - Se `override_default=true`, usa `brief` do payload (e nao salva como default).
  - Valida creditos disponiveis. Dispara worker cover.py via QStash. Retorna `{job_id, estimated_seconds: 30}`.
- **Criterio de pronto:** POST com brief gera 1-3 capas em ~30s. Resposta sincrona (job_id) seguida de Supabase Realtime na tabela cover_library pra atualizar UI.
- **Dependencia:** T4.9 (worker), T4.14 (creditos)

#### `[x]` T4.17 — UI: notificacao quando capa fica pronta (Realtime)

- **Arquivos:**
  - `web/lib/realtime-covers.ts` (subscription)
  - `web/components/CapasGrid.tsx` (atualiza com realtime)
  - `web/components/AppHeader.tsx` (badge contador novas capas)
- **O que fazer:** Subscribe via Supabase Realtime no INSERT da `cover_library`. Quando nova row chega:
  - Atualiza grid em /capas (capa nova aparece com animacao fade-in)
  - Se produtor NAO esta na aba /capas, mostra badge no menu sidebar item "Capas" + toast "Sua capa esta pronta"
  - (Opcional V1.5) Web Push notification se produtor permitiu
- **Criterio de pronto:** Produtor abre /capas, clica gerar, sai pra dashboard, ve badge + toast quando pronta. Volta na aba, ve capa nova.
- **Dependencia:** T4.10, T4.16

#### `[x]` T4.18 — UI display de custo + bloqueio quando sem creditos (ConfirmGenerateModal)

- **Arquivos:**
  - `web/components/CreditosBar.tsx` (header da aba /capas)
  - `web/components/CreditosModalConfirm.tsx` (modal antes de gerar)
- **O que fazer:**
  - Bar mostra "X / Y creditos restantes este mes" com cor amarela quando <30% restante, vermelha quando 0
  - Antes de chamar `/covers/generate`, modal de confirmacao: "Isso vai consumir Z creditos do seu plano. Restarao W. [Cancelar] [Gerar]"
  - Botoes de geracao disabled quando creditos < lote pedido. Mostra tooltip "Sem creditos suficientes. Upgrade pra plano premium em [link]"
- **Criterio de pronto:** Display sempre consistente com `credits_service.get_remaining`. Modal aparece antes de gerar. Bloqueio funciona.
- **Dependencia:** T4.10, T4.14

### Bloco prompt DNA v2 (aberto em 2026-05-21 sessao 3 apos ADR `2026-05-21-prompt-dna-capa-v2.md`) -- ITERACAO 1 SUPERADA PELA v3

> **STATUS 2026-05-22:** Esta v2 foi entregue em prod (T4.19-T4.26 em 9 commits sequenciais 7a1f10d..38fff86) mas teste visual de Gustavo na aba `/capas` produziu capas visualmente ruins. Causa raiz: camera "Analog film + 35mm + Canon Sure Shot" gerava estetica cinematografica polida, oposta ao desejado. Substituida pela v3 (`Bloco prompt DNA v3` abaixo, ADR `2026-05-22-prompt-dna-capa-v3.md`). Tasks marcadas como `[x]` preservadas no historico pra rastreabilidade. Arquivos que SOBREVIVEM no pacote: `types.py`, `sanitizer.py`, `brief_converter.py`, `__init__.py`. Arquivos REESCRITOS na v3: `system_prompt.py`, `vocabulary.py`, `variation.py`, `validators.py`, `user_prompt.py`, `builder.py`.

> **Reformulacao da engenharia de prompt da capa IA.** Substitui o `PROMPT_BASE_TEMPLATE` placeholder (capa Lil Baby hardcoded) por sistema estruturado: principio "Captured, Not Composed" + DNA universal + anti-aesthetics block + gramatica de 7 blocos + brief v2 (6+2 campos com genero como ancora) + sistema de variacao por 7 eixos sorteados em Python + prompt caching Claude. Detalhes no ADR e em `docs/sessoes/2026-05-21-engenharia-prompt-capa-ia-estado-atual.md`.

#### `[x]` T4.19 — Refatorar cover_prompt_builder em pacote (types + system_prompt + vocabulary minimo)

- **Arquivos:**
  - `api/app/services/cover_prompt_builder.py` (DELETAR)
  - `api/app/services/cover_prompt_builder/__init__.py` (criar — re-exporta `build_cover_prompt`)
  - `api/app/services/cover_prompt_builder/types.py` (criar)
  - `api/app/services/cover_prompt_builder/system_prompt.py` (criar — texto integral do SYSTEM_PROMPT v2 em ingles, ~250 linhas)
  - `api/app/services/cover_prompt_builder/vocabulary.py` (criar — versao MINIMA: so mapeamento slug PT → frase EN basica)
- **O que fazer:**
  - Apaga o arquivo monolitico antigo (`cover_prompt_builder.py` na raiz de `services/`)
  - Cria pacote com dataclasses `CoverBrief`, `VariationAxes`, `BuildResult` em `types.py`
  - `system_prompt.py` exporta constante `SYSTEM_PROMPT` com o texto da secao 7 do ADR `2026-05-21-prompt-dna-capa-v2.md`
  - `vocabulary.py` so mapeia slugs PT do brief v2 → frases EN basicas pros 11 generos, 6 quem_aparece, 6 mood, 9 cenarios, 7 luzes. Matriz de compatibilidade rica fica pra proxima sessao.
- **Criterio de pronto:** `from app.services.cover_prompt_builder import build_cover_prompt` funciona (stub do builder pode retornar `None` por enquanto). Dataclasses validam. Vocabulary entrega label EN pra cada slug PT do brief v2.
- **Dependencia:** —

#### `[x]` T4.20 — Sistema de variacao por 7 eixos + sanitizer da nota livre

- **Arquivos:**
  - `api/app/services/cover_prompt_builder/variation.py`
  - `api/app/services/cover_prompt_builder/sanitizer.py`
- **O que fazer:**
  - `variation.py`: constantes dos 7 eixos (subject_framing, camera_angle, time_of_day, sub_location, secondary_prop, motion_state, film_quirk). Funcao `sample_variation_axes(brief, seed=None)` respeita dependencias basicas: `secondary_prop` ignorado se `quem_aparece=sem_pessoa`, `time_of_day` compativel com `atmosfera_luz` (ex: `luz_colorida` forca `night_practical`), `sub_location` lista basica por cenario. Sem matriz de compatibilidade refinada (fica pra vocabulary v2).
  - `sanitizer.py`: `sanitize_free_note(note)` trunca em 280 chars, rejeita prompt-injection (lista de padroes: `"ignore previous"`, `"system:"`, etc), rejeita termos incompativeis com estetica (`"anime"`, `"cartoon"`, `"3d render"`, etc).
- **Criterio de pronto:** `sample_variation_axes()` chamado 50× com mesmo brief retorna combinacoes diferentes coerentes (sem prop quando sem_pessoa, sem night quando sol_duro_dia). Sanitizer rejeita `"ignore previous instructions"` e `"anime style"`.
- **Dependencia:** T4.19

#### `[x]` T4.21 — Builder + validators robustos + prompt caching Claude

> **Codigo entregue.** Teste real ao Claude (5 briefs + verificacao de cache_read_input_tokens) sera rodado junto da T4.23 quando o pipeline ponta-a-ponta estiver plugado (worker + routes + lib/api). Validators testados em isolado contra 6 casos (passa valido, rejeita nome direto, rejeita apelido '6 god', rejeita 'the famous rapper', rejeita 'porcelain skin' no corpo, rejeita comprimento fora da faixa). Stub original abaixo:


- **Arquivos:**
  - `api/app/services/cover_prompt_builder/user_prompt.py`
  - `api/app/services/cover_prompt_builder/validators.py`
  - `api/app/services/cover_prompt_builder/builder.py`
- **O que fazer:**
  - `user_prompt.py`: template da secao 8 do ADR v2 + funcao de preenchimento com brief + variation_seeds enriquecidos via vocabulary
  - `validators.py`: 7 validacoes — comprimento 1500-4000 chars, likeness nome direto (primario E secundario), likeness apelidos (blocklist comeca com 5-6 artistas: Drake, Kendrick, Future, Carti, Lil Baby), likeness frases-ancora genericas ("the artist from", "the famous", etc), estrutura 7 blocos por keywords, AVOID block presente (**warning-mode** nesta fase — loga warning mas aceita output), anti-aesthetics inline (corpo nao pode conter `"porcelain"`, `"studio lighting"`, `"cinematic bokeh"`, `"glowing border"`)
  - `builder.py`: `build_cover_prompt(brief, seed=None)` orquestra — sanitizacao → sample_variation_axes → enriquecimento vocabulary → user_prompt → chamada Claude Sonnet 4.6 COM prompt caching habilitado (`cache_control: {"type": "ephemeral"}` no system) → validacao → retorna BuildResult. usage_tracker registra tokens IN/OUT/CACHE-READ/CACHE-WRITE separados.
- **Criterio de pronto:** 5 briefs de teste diferentes (Lil Baby/trap/flexin/rua, Drake/trap+ambient/sad/paisagem, PartyNextDoor+Bryson/rnb/sexy/interior, Future/ambient/chill/lugar_simbolico, Carti/rage/dark/festa) geram prompts validos 300-600 palavras sem mencionar nome do artista. Segunda chamada com mesmo brief usa cache (verificar via `response.usage.cache_read_input_tokens > 0`).
- **Dependencia:** T4.19, T4.20
- **Nota:** consultar https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching antes de implementar o cache_control.

#### `[x]` T4.22 — Migration brief v2 + script de migracao de dados (3 lugares)

> **Aplicada em producao 2026-05-21.** Pre-acao: deletados 3 presets de teste em `brief_presets` (Tame Impala/The Weeknd/Drake type 2) que estavam no formato v1 antigo. Migration 019 rodou contra 0 rows em todos os 3 lugares (cover_library/user_profiles/brief_presets), criou coluna `variation_seeds JSONB` em cover_library + index GIN. Funcao PL/pgSQL temporaria dropada limpa. Validacao confirmada via query consolidada (col=1, idx=1, funcao=0, presets=0). Decisao: pulado script Python `migrate_cover_briefs_to_v2.py` do ADR original -- SQL puro fez tudo atomicamente.



- **Arquivos:**
  - `supabase/migrations/019_cover_brief_v2.sql` (numeracao apos a 018)
  - `api/scripts/migrate_cover_briefs_to_v2.py`
- **O que fazer:**
  - SQL: renomeia colunas em `cover_library` (sujeito→quem_aparece_legacy, ambiente→ambiente_legacy, iluminacao→iluminacao_legacy, energia→energia_legacy, artista_nome→artista_primario). Adiciona colunas novas: genero_primario, genero_secundario, artista_secundario, quem_aparece, mood, cenario, atmosfera_luz, variation_seeds (JSONB). Index GIN em variation_seeds. Mesma operacao em `brief_presets` (mesma estrutura de colunas).
  - Script Python: itera `cover_library`, `user_profiles.default_brief` (JSONB com keys antigas), `brief_presets`. Converte cada um usando os mapeamentos LEGACY definidos no ADR secao 10 (sujeito.jovem→quem_aparece.homem_solo, ambiente.rua_hood→cenario.rua_americana, iluminacao.vermelho→atmosfera_luz.luz_colorida, energia.hood_famous→mood.flexin, etc). Roda em transacao.
- **Criterio de pronto:** Migration roda limpa em dev/staging. Script Python migra os 3 lugares sem perder rows (SELECT count antes vs depois bate). Backup Supabase manual antes de rodar em producao.
- **Dependencia:** —

#### `[x]` T4.23 — Atualizar worker cover.py + routes/covers.py + lib/api.ts

> Switch atomico do builder feito. `brief_converter.py` novo no pacote (parse_brief + normalize_brief + convert_v1_to_v2 mesma logica do SQL migration 019). `__init__.py` re-exporta builder v2 + types + helpers; `legacy.py` deletado. Routes (covers + briefs) com BriefModel ampliado (v1+v2) + back-compat server-side. Worker chama `parse_brief()` -> `build_cover_prompt(CoverBrief)` -> `BuildResult` e salva `variation_seeds` no UPDATE ready. lib/api.ts com `CoverBrief` ampliado pra aceitar ambos formatos (v1 marcados @deprecated). 49 testes pytest verdes + `pnpm build` 18/18 paginas geradas, sem regressao no frontend.


- **Arquivos:**
  - `api/app/workers/cover.py`
  - `api/app/routes/covers.py`
  - `web/lib/api.ts`
- **O que fazer:**
  - Worker: importa `build_cover_prompt` do pacote novo. Recebe brief com keys novas. Salva os 7 eixos sorteados em `cover_library.variation_seeds` no INSERT pending (ou no UPDATE ready se preferir). Mudancas minimas no resto da logica — pipeline atual fica intacto.
  - Routes: `BriefModel` ganha campos novos (genero_primario obrigatorio, genero_secundario opcional, artista_primario/artista_secundario, quem_aparece, mood, cenario, atmosfera_luz). Validacao Pydantic aceita brief novo. Back-compat: durante 1 release, se request vier com keys antigas (sujeito, ambiente, etc), converte server-side com warning no log.
  - lib/api.ts: types `CoverBrief`, `BriefPreset` atualizados com campos novos.
- **Criterio de pronto:** POST /covers/generate com brief v2 gera capa end-to-end. variation_seeds aparecem no DB. Brief antigo em request (transicao) ainda funciona com warning no log.
- **Dependencia:** T4.21, T4.22

#### `[x]` T4.24 — Reescrever CapasWizard com 6 campos novos

> Wizard reescrito (~720 linhas, mesma arquitetura visual preservada). Step 1: Identidade do beat = artista primario (obrigatorio) + grid de 11 generos (obrigatorio) + botoes "+" pra adicionar 2o artista e 2o genero opcionais. Step 2: Visual = 4 grids (quem aparece 5, mood 6 com descricoes, cenario 8, atmosfera de luz 6 -- `aleatorio` escondido nesta fase). Step 3: Confirmacao com resumo em 2 linhas (Identidade + Visual) + nota livre 280 chars. Modal mechanics (Esc, mousedown/up no backdrop, body scroll lock) preservadas. Skill frontend-design nao foi invocada pq direcao Editorial Mono ja estava madura no wizard anterior -- mantive cards visuais com lucide icons + variavel CSS purple-soft. Build verde 18/18 paginas.


- **Arquivos:**
  - `web/components/CapasWizard.tsx`
  - `web/components/CapasBrief.tsx` (form reutilizavel)
- **O que fazer:**
  - Invocar skill frontend-design pra manter direcao Editorial Mono
  - Wizard com:
    - Genero primario (grid de 11 cards, single-select)
    - Botao "+" pra adicionar genero secundario (opcional, mesma lista, exclui o primario)
    - Artista primario (input texto)
    - Botao "+" pra adicionar artista secundario (opcional)
    - Quem aparece (6 cards — opcao `aleatorio` NAO aparece nesta fase)
    - Mood (6 cards com descricao curta na UI)
    - Cenario (8 cards — exclui `aleatorio` nesta fase)
    - Luz (6 cards — exclui `aleatorio` nesta fase)
    - Nota livre (textarea opcional, max 280 chars)
  - Validacao client-side coerente com o backend (Pydantic mirror)
- **Criterio de pronto:** Wizard cria/edita preset com brief v2. Salva via API. Direcao visual Editorial Mono mantida.
- **Dependencia:** T4.23

#### `[x]` T4.25 — ManageBriefsModal + ConfirmGenerateModal + botao "Gerar variacao"

> ManageBriefsModal: resumo do brief agora le campos v2 (artista_primario + genero_primario + mood + cenario + atmosfera_luz) com fallback v1 (?? artista_nome, ?? energia, etc) durante a janela de transicao. ConfirmGenerateModal nao precisou de mudancas (era ja agnostico a v1/v2). page.tsx + CapasHeader: novo botao "Gerar variacao" entre os 2 botoes existentes, signature `onGenerate(lote, intent)` ampliada com intent='new'|'variation' (tecnicamente identicos -- so signaling UX, logado em console pra futuro analytics). Build verde 18/18 paginas. **Sinceridade (memory feedback_sinceridade_estrategica):** 3 botoes na mesma linha aumenta carga visual; vale rebalancear na proxima iteracao se o produtor mostrar que usa pouco o "Gerar variacao" separado.


- **Arquivos:**
  - `web/components/ManageBriefsModal.tsx`
  - `web/components/ConfirmGenerateModal.tsx`
  - `web/app/(app)/capas/page.tsx`
- **O que fazer:**
  - ManageBriefsModal: lista presets com resumo do brief v2 (genero + mood + cenario em vez de sujeito + ambiente + iluminacao + energia)
  - ConfirmGenerateModal: pequenos ajustes de label se necessario
  - page.tsx: botao "Gerar variacao" ao lado de "Gerar 1" e "Gerar 3". Tecnicamente identico a "Gerar 1" — diferenca e psicologica/UX (sinaliza "vamos so tentar diferente" vs "vamos gerar do zero"). Logar internamente o tipo de acao pra analytics futuras.
- **Criterio de pronto:** Fluxo end-to-end no browser: criar preset v2 → gerar capa → gerar variacao → ver na biblioteca.
- **Dependencia:** T4.24

#### `[x]` T4.26 — Atualizar CLAUDE.md regra 6 + docs/_mapa.md + commit final

> CLAUDE.md regra 6 reescrita refletindo SYSTEM_PROMPT v2 + brief 6+2 campos + 7 eixos de variacao + prompt caching + 3 camadas likeness + sanitizer nota livre + variation_seeds JSONB. docs/_mapa.md ja atualizado na T4.22 (entrada do ADR v2 adicionada, ADR sessao 2 marcado como complementado). Memoria `project_capa_ia_arquitetura.md` reescrita pra refletir DNA v2 + pacote modular + back-compat + pendencias proxima sessao. MEMORY.md indexa nova descricao.


- **Arquivos:**
  - `CLAUDE.md` (regra 6)
  - `docs/_mapa.md` (entrada do ADR v2 — ja adicionada na abertura do bloco)
- **O que fazer:**
  - CLAUDE.md regra 6 reescrita refletindo brief v2 + 7 eixos + DNA (texto novo definido no ADR `2026-05-21-prompt-dna-capa-v2.md` secao Consequencias)
  - Memoria `project_capa_ia_arquitetura.md` atualizada (substitui versao antiga)
- **Criterio de pronto:** docs alinhados com codigo em producao.
- **Dependencia:** T4.19-T4.25

### Bloco prompt DNA v3 (aberto em 2026-05-22 sessao 4 apos ADR `2026-05-22-prompt-dna-capa-v3.md`)

> **Reformulacao APOS teste visual mostrar capas ruins na v2.** Substitui camera "Analog film + 35mm" por camera video-still fixa em 2 variantes (padrao calibrado + underground agressivo). Estrutura de 7 blocos genericos vira 12 elementos ordenados com peças fixas + variaveis. Cenarios genericos saem -- sub-locations agora curadas por artista (5 validados, expansivel) e Claude sorteia UMA por chamada. Brief perde campo `cenario` (inferido do universo do artista). Anti-repeticao via query nas ultimas 5 `variation_seeds` do user. Palavras banidas (music video, cinematic, B-roll, director, scene from...) + references banidas (cinematografos/Vogue) vs permitidas (Larry Clark, Nan Goldin, Cobrasnake, Hedi Slimane). Anti-bias inline (sem asiaticos default, sem gang signs). Detalhes em `docs/decisoes/2026-05-22-prompt-dna-capa-v3.md`.

#### `[x]` T4.27 — Setup v3 (ADR + tasks no ledger + marcar v2 como superseded)

> Este commit. Sem codigo, so docs.

- **Arquivos:**
  - `docs/decisoes/2026-05-22-prompt-dna-capa-v3.md` (novo)
  - `docs/_mapa.md` (adiciona entrada v3, marca v2 como SUPERSEDED)
  - `_tasks-mvp.md` (este arquivo -- topo, bloco v2 marcado, bloco v3 aberto, T4.27-T4.33, historico)
- **Criterio de pronto:** ADR no repo, ledger atualizado, commit limpo.
- **Dependencia:** —

#### `[x]` T4.28 — `prompt_skeleton.py` (camera DNA 2 variantes + guard-rails + palavras/refs banidas)

- **Arquivos:**
  - `api/app/services/cover_prompt_builder/prompt_skeleton.py` (novo)
- **O que fazer:**
  - Constante `CAMERA_DNA_PADRAO` -- texto integral da camera video-still calibrada (ADR §1, variante padrao)
  - Constante `CAMERA_DNA_UNDERGROUND` -- texto integral da camera agressiva (ADR §1, variante underground)
  - Funcao `pick_camera_dna(brief) -> str` -- retorna underground SE `genero_primario == 'underground_trap'` OU `genero_secundario == 'underground_trap'`, senao padrao
  - Constante `SHOT_ON_CLOSER` -- texto fixo "Shot on: a beat-up VHS camcorder..."
  - Constante `GUARD_RAIL_ANTI_DESTRUICAO` -- texto fixo "The compression is light but the image stays soft..."
  - Dict `MOOD_CLOSERS` -- frase final adaptada por mood (sad/dark/sexy/chill/party/flexin)
  - Constante `BANNED_WORDS` -- lista de palavras banidas (music video, cinematic, B-roll, director, BTS, behind-the-scenes, scene from, frame from a movie, film still, movie ending coded)
  - Constante `BANNED_REFERENCES` -- diretores/cinematografos (Drive, Neon Demon, Wong Kar-wai, Tony Scott, Sofia Coppola, Helmut Newton, Guy Bourdin, Vogue)
  - Constante `ALLOWED_REFERENCES` -- fotografos intimos (Larry Clark, Nan Goldin, Cobrasnake, Hedi Slimane, Mark Hunter, Theo Skudra)
- **Criterio de pronto:** Imports OK. `pick_camera_dna(brief_underground)` retorna a versao agressiva. `pick_camera_dna(brief_outro)` retorna a padrao.
- **Dependencia:** T4.27

#### `[x]` T4.29 — `artist_universe.py` (5 artistas validados + fallback gracioso)

- **Arquivos:**
  - `api/app/services/cover_prompt_builder/artist_universe.py` (novo)
- **O que fazer:**
  - Dict `ARTIST_UNIVERSE` com 5 entradas (chave em lowercase): drake, travis scott, the weeknd, fakemink, nettspend
  - Cada entrada tem: `sub_locations` (5-8 frases ricas com referencias culturais especificas), `wardrobe_pool` (vocabulario amplo, sem virar uniforme), `thematic_sentence`, `references` (foto-coded permitidas), `city_anchor` (None quando placeless)
  - Funcao `get_universe(artista_primario, artista_secundario) -> dict` -- normaliza para lowercase, faz lookup. Quando 2 artistas no brief, retorna entrada combinada (`sub_locations` unidas, `references` unidas, `thematic_sentence` adaptada).
  - Fallback gracioso: artista fora do dicionario retorna `{"sub_locations": [], "wardrobe_pool": ["generic genre-appropriate wardrobe"], "thematic_sentence": None, "references": [], "city_anchor": None}` -- builder usa so genero+mood nesse caso.
- **Criterio de pronto:** `get_universe('Drake', None)` retorna dict completo com >=5 sub_locations. `get_universe('Artista Inventado', None)` retorna fallback sem crash.
- **Dependencia:** T4.27

#### `[x]` T4.30 — `genre_dna.py` + `mood_modulation.py` + `lighting_setups.py`

- **Arquivos:**
  - `api/app/services/cover_prompt_builder/genre_dna.py` (novo)
  - `api/app/services/cover_prompt_builder/mood_modulation.py` (novo)
  - `api/app/services/cover_prompt_builder/lighting_setups.py` (novo)
- **O que fazer:**
  - `genre_dna.py`: dict `GENRE_DNA` com 11 generos. Cada entrada tem: `thematic_sentence_template` (com placeholder pra artista city), `vocabulary_pool` (wardrobe + cultural objects), `era_anchor` (ex: "Late-2020s underground internet rap aesthetic" pra underground_trap), `palette_anchors` (cores tipicas do genero)
  - `mood_modulation.py`: dict `MOOD_DNA` com 6 moods (flexin/dark/sad/sexy/party/chill). Cada entrada tem: `palette_hue` (cool/warm/mixed), `energy_phrase` (3-word soco), `closer_phrase` (3-word fim), `body_language` (descricao pose/atitude)
  - `lighting_setups.py`: dict `LIGHTING_SETUPS` com 6 luzes (sol_duro_dia/golden_hour/noite_natural/flash_duro/luz_colorida/meia_luz). Cada entrada tem: `full_description` (3-5 linhas detalhadas pro bloco LIGHTING do prompt), `color_implications` (cores que dominam naturalmente)
- **Criterio de pronto:** Imports OK. `GENRE_DNA['underground_trap']['era_anchor']` retorna string nao-vazia. Idem pros outros 2.
- **Dependencia:** T4.27

#### `[x]` T4.31 — `variation_engine.py` (sorteio + anti-repeticao via DB)

- **Arquivos:**
  - `api/app/services/cover_prompt_builder/variation_engine.py` (novo)
- **O que fazer:**
  - Funcao `fetch_recent_seeds(user_id, artista_primario, limit=5) -> list[dict]` -- query `cover_library` filtrando por user_id + brief_used.artista_primario, ordenando por created_at desc, retorna lista de `variation_seeds` JSONB
  - Funcao `sample_for_brief(brief, universe, force_variation=False) -> dict` -- sorteia: 1 sub_location (de `universe['sub_locations']`, excluindo as ultimas 3-5 se force_variation), 1 lighting setup (do brief, fixo nao aleatorio), N optional_details (do `universe['wardrobe_pool']` + objetos culturais), 1 mood closer (de `MOOD_DNA[mood]['closer_phrase']`)
  - Retorna dict no formato persistido em `variation_seeds`: `{"sub_location_chosen": str, "lighting_setup": str, "optional_details": list[str], "mood_closer": str}`
- **Criterio de pronto:** Chamado 20× pra Drake/trap/dark com force_variation=False retorna pelo menos 5 sub_locations diferentes. Chamado com force_variation=True excluindo lista de 3 sub_locations retorna sub_location FORA dessa lista.
- **Dependencia:** T4.29, T4.30

#### `[x]` T4.32 — `builder.py` + `validators.py` + `user_prompt.py` reescritos pra v3 + switch atomico + smoke test Claude real

- **Arquivos:**
  - `api/app/services/cover_prompt_builder/builder.py` (REESCRITO)
  - `api/app/services/cover_prompt_builder/validators.py` (REESCRITO)
  - `api/app/services/cover_prompt_builder/user_prompt.py` (REESCRITO)
  - `api/app/services/cover_prompt_builder/system_prompt.py` (REESCRITO -- SYSTEM_PROMPT v3 estruturado em 12 elementos)
  - `api/app/services/cover_prompt_builder/__init__.py` (ajusta exports)
  - DELETAR: `api/app/services/cover_prompt_builder/vocabulary.py` (substituido por genre_dna/mood_modulation/lighting_setups)
  - DELETAR: `api/app/services/cover_prompt_builder/variation.py` (substituido por variation_engine)
- **O que fazer:**
  - `user_prompt.py`: monta os 12 elementos ordenados (camera + thematic + frase mestre + sujeito + frase-soco + wardrobe + setting + lighting + guard-rail + palette + optional details + energy+shot on+references+closer)
  - `validators.py`: 5 validacoes -- length 1500-4000, likeness nome direto (primario+secundario), likeness apelidos, BANNED_WORDS no corpo (hard fail), BANNED_REFERENCES no corpo (hard fail). Anti-aesthetics inline V2 removido (substituido por palavras/refs banidas v3). AVOID block warning-mode removido (estrutura v3 nao usa AVOID block).
  - `builder.py`: orquestra sanitize_free_note -> pick_camera_dna -> get_universe -> sample_for_brief -> build_user_prompt -> Claude com prompt caching -> validate -> BuildResult
  - SYSTEM_PROMPT v3: instrucoes pro Sonnet 4.6 seguir estrutura 12 elementos + sortear UMA sub-location e expandir + nunca usar palavras banidas + usar so references permitidas + anti-bias inline (sem asiaticos default, sem gang signs)
  - **Smoke test:** rodar 1 brief de Gustavo (Drake/trap/dark/grupo/noite_natural) e validar visualmente no fal.ai antes de seguir
- **Criterio de pronto:** Smoke test gera capa visualmente coerente com handoff v3. Pacote modular completo. 49+ pytest verdes.
- **Dependencia:** T4.28, T4.29, T4.30, T4.31

#### `[x]` T4.33 — Drop campo `cenario` (backend + frontend + types) + ajustes wizard

- **Arquivos:**
  - `api/app/services/cover_prompt_builder/types.py` (remove `cenario` de `CoverBrief` + `CenarioSlug` Literal)
  - `api/app/services/cover_prompt_builder/brief_converter.py` (remove mapeamento de cenario, remove _AMBIENTE_MAP)
  - `api/app/routes/covers.py` (BriefModel remove campo cenario v2 + ambiente v1)
  - `api/app/routes/briefs.py` (BriefBodyModel idem)
  - `web/lib/api.ts` (CoverBrief interface remove cenario)
  - `web/components/CapasWizard.tsx` (remove step do Cenario)
  - `web/components/CapasBrief.tsx` (idem se aplicavel)
- **O que fazer:**
  - Tira o campo do tipo Python + Pydantic + TypeScript + UI do wizard
  - Atualiza memoria `project_capa_ia_arquitetura.md` refletindo v3
  - Atualiza CLAUDE.md regra 6 com texto da v3 (definido no ADR §Consequencias)
  - Push final pra prod
- **Criterio de pronto:** Wizard nao mostra step Cenario. Backend aceita brief sem cenario. lib/api.ts compilou sem erro. Push verde Railway+Vercel.
- **Dependencia:** T4.32

#### `[x]` T4.34 — Estilo do titulo por produtor (Opcao 1 default / Opcao 2 lowercase)

- **Motivacao:** Dois padroes de titulo dividem a comunidade type beat. Default classico (`[FREE] Slayr x Nettspend type beat "GHOST LOAD"`) vs lowercase gen z (`[free] untiljapan + nosaint type beat - "eye to eye"`). Produtor escolhe nas Configuracoes e a IA respeita.
- **Arquivos:**
  - `supabase/migrations/021_user_title_style.sql` (nova coluna `title_style` em `user_profiles`)
  - `api/app/services/anthropic_service.py` (parametro `title_style` + instrucao no prompt + funcao `_apply_title_style` pos-processamento determinstico)
  - `api/app/workers/generate.py` (le `title_style` do `user_profiles` e passa pro service)
  - `web/app/(app)/configuracoes/page.tsx` (nova secao "Estilo dos titulos" com 2 cards Opcao 1/Opcao 2 mostrando exemplo real, salva junto com perfil)
- **O que fazer:**
  - Migration: `alter table user_profiles add column if not exists title_style text not null default 'default' check (title_style in ('default','lowercase'))`. Default cobre produtores existentes.
  - Service: Quando `title_style == 'lowercase'`, adicionar bloco "ESTILO DO TITULO: lowercase" no prompt explicando as 4 transformacoes ([free], `+` entre artistas, ` - ` antes das aspas, beat_name lowercase dentro das aspas). DESCRICAO continua no formato atual independente do estilo.
  - **Pos-processamento determinstico** (defesa em profundidade — Gustavo pediu garantia anti-erro): funcao `_apply_title_style(titulo, style) -> str` que forca o formato mesmo se Claude errar. Para `lowercase`: `.lower()` + substitui ` x ` por ` + ` + injeta ` - ` antes da primeira aspas + lowercase no conteudo entre aspas. Para `default`: passa direto.
  - Worker: incluir `title_style` no `.select()` do user_profiles + repassar pro `generate_metadata`. Fallback `'default'` se NULL.
  - UI: dois cards de radio entre "Perfil" e "Canal YouTube". Labels "Opcao 1" / "Opcao 2" (sem nome estilizado). Cada card mostra o exemplo formatado em fonte monospace. Salva no mesmo submit do perfil.
- **Criterio de pronto:** Produtor abre /configuracoes, escolhe Opcao 2, salva. Sobe um beat novo. Titulo gerado sai exatamente no formato `[free] artista + artista2 type beat - "beat name"` (verificavel no /review do beat). Trocar pra Opcao 1 e gerar outro beat -> titulo volta pro formato classico. Producer existente sem coluna preenchida = Opcao 1 (default).
- **Dependencia:** — (nenhuma; T4.1 ja entrega o service generate_metadata)

#### `[x]` T4.35 — Banco de capas manuais (upload dedicado, separado de capas IA)

- **Motivacao:** Nem todo produtor usa IA pra capa -- muitos tem suas capas proprias e querem so um banco visual reusavel. Hoje o upload manual no /upload e one-shot (vai pro beat e some). Esta task adiciona um banco persistente reusavel, espelhado em UX a biblioteca IA, mas mais simples (sem brief, sem artista).
- **Decisoes fechadas (sessao 2026-05-25):**
  - **/capas vira 2 espacos via segmented tabs no header**: "Geradas" (capas IA atuais) e "Enviadas" (manuais novas). Trocam o espaco inteiro, nao filtro.
  - **Capa manual NAO tem brief nem artista** -- espaco visual puro. Filtros: Usada/Nao usada + Data.
  - **Crop client-side via react-easy-crop** (~10kb gz, MIT). Produtor escolhe a area quadrada antes do upload. Resolucao final: 1024x1024 (qualidade YouTube).
  - **Limite por tier (total acumulado, NAO mensal)**: free=5, intermediate=25, premium=100, internal=999. Manual nao custa $ pra gerar, so ocupa Storage -- por isso e limite acumulado, nao mensal (excedeu? apaga uma pra subir outra).
  - **Em /upload (CoverPicker)**: tab "Biblioteca" ganha sub-segmented "IA / Manual". Tab "Upload agora" ganha checkbox "Salvar no meu banco manual" (default ON) -- assim a capa enviada one-shot ja vira reusavel sem o produtor pensar.
  - **Nomes**: "GERADAS" / "ENVIADAS" no segmented switch principal. "IA" / "Manual" no sub-switch do /upload.
- **Arquivos:**
  - **Bloco 1 (Backend):**
    - `api/app/services/credits_service.py` (novo `MANUAL_LIMITS` dict + funcoes `get_manual_usage`, `check_manual_quota`)
    - `api/app/routes/covers.py` (novo POST `/covers/manual_upload` + GET `/covers/manual_limit`)
    - `web/lib/api.ts` (funcoes `uploadManualCover`, `fetchManualLimit`)
  - **Bloco 2 (/capas):**
    - `web/app/(app)/capas/page.tsx` (segmented switch Geradas/Enviadas no header, alterna espaco)
    - `web/components/EnviadasGrid.tsx` (novo: grid de capas manuais + filtros Usada/Data, reusa CapaCard)
    - `web/components/ManualUploadModal.tsx` (novo: drag-and-drop -> crop quadrado -> preview -> POST)
    - `web/package.json` (adicionar `react-easy-crop`)
  - **Bloco 3 (/upload):**
    - `web/components/CoverPicker.tsx` (sub-segmented IA/Manual dentro da tab Biblioteca)
    - `web/components/CoverPickerExpanded.tsx` (filtro tipo IA/Manual)
    - Logica do ManualTab no CoverPicker: ao confirmar com checkbox=true, POST /covers/manual_upload + usa o ID retornado em vez de manualFile
- **O que fazer (ordem):**
  - **Bloco 1**: backend primeiro (sem isso nada roda). Adiciona MANUAL_LIMITS, endpoints validam tipo (JPG/PNG), peso (<5MB), quota por tier. Sobe pra `covers/{user_id}/manual/{uuid}.jpg` e cria row em cover_library com source='manual_upload', brief_used=null, prompt_final=null, cost_usd=0.
  - **Bloco 2**: UI da /capas. Skill `frontend-design` invocado pra manter Editorial Mono. Segmented switch principal substitui ou complementa o titulo. Botao "+ Upload manual" simetrico ao "+ Gerar capa" quando em "Enviadas".
  - **Bloco 3**: integra os dois. Sub-switch IA/Manual no CoverPicker. Checkbox "Salvar no banco manual" no ManualTab que, quando true, faz upload antes de associar ao beat.
- **Pontos cegos a tratar:**
  - CapaCard/CapaModal atual usam brief_used pra renderizar -- precisam de estado vazio "Capa enviada manualmente, sem brief associado" quando source='manual_upload'.
  - 402 (quota cheia) precisa de UX clara: "Voce atingiu o limite do seu plano (X/Y). Apague uma capa ou faca upgrade."
- **Criterio de pronto:**
  - **Bloco 1**: POST /covers/manual_upload com imagem 1024x1024 quadrada cria row em cover_library com source='manual_upload'. GET /covers/manual_limit retorna {used, limit, remaining}. Quota cheia retorna 402.
  - **Bloco 2**: Em /capas, switch "Geradas" / "Enviadas" alterna o espaco. Em "Enviadas", produtor faz upload de uma capa retangular, croppa pra quadrada no modal, envia, e ela aparece no grid. Filtros Usada/Data funcionam.
  - **Bloco 3**: Em /upload, sub-switch IA/Manual mostra biblioteca correta. Checkbox "Salvar no banco" no upload agora persiste a capa ao mesmo tempo que ela vai pro beat.
  - **Limite respeitado**: Free atinge 5 manuais e proxima tentativa retorna 402 com mensagem amigavel.
- **Dependencia:** T4.14 (sistema de creditos -- reusa estrutura de tier do user_profiles)

#### `[x]` T4.36 — Bulk upload de capas manuais + botão Selecionar nas Enviadas

- **Motivacao:** Continuacao direta da T4.35. Faltou (1) botao "Selecionar" no segmento Enviadas pra bulk delete e (2) producer pediu upload em massa pra alimentar o banco rapido. Crop interativo um por um inviabilizava lotes.
- **Decisoes fechadas:**
  - **1 botao so**: "+ Upload manual" detecta quantos arquivos foram selecionados. 1 arquivo -> crop interativo (T4.35 original). 2+ arquivos -> bulk com crop AUTOMATICO center-square (pega o menor lado, centraliza, redimensiona pra 1024x1024).
  - **Quota truncada antecipadamente**: se selecionou 10 e tem 3 slots, sobe os 3 primeiros e mostra "X enviadas, Y ignorados (limite do plano)". Se quota acaba no meio do loop (outra aba subiu), para e marca o resto como "Cancelado por limite".
  - **Sequencial, nao paralelo**: ordem clara no progress + evita pico de RAM com varios blobs cropados na memoria ao mesmo tempo.
  - **Trade-off do crop center**: capas quadradas (1080x1080 padrao) = zero perda. Verticais (story 9:16) cortam topo/baixo -- aceitavel pro use case "alimentar banco rapido", producer apaga depois se ficar ruim.
- **Arquivos:**
  - `web/components/ManualUploadModal.tsx` (state machine ganha fases `bulk_uploading` + `bulk_done`, helper `fileToCenterSquareBlob`, BulkRow component com check/x/loader por item, progress bar, summary "X enviadas Y falhas")
  - `web/app/(app)/capas/page.tsx` (botao "Selecionar" no SectionLabel das Enviadas reusa selectionMode + bulk delete ja existentes)
- **Criterio de pronto:** Selecionar 5 imagens no input do upload manual -> bulk dispara, progress mostra 1/5 -> 5/5, todas viram capas no banco. Selecionar 10 com quota=3 -> sobe 3 + msg "7 ignorados". Botao Selecionar nas Enviadas funciona igual nas Geradas (toolbar floating bulk delete aparece).
- **Dependencia:** T4.35 (entregue)

#### `[x]` T4.37 — Modal de selecao de artista via Spotify Web API (UploadForm + CapasWizard)

- **Motivacao:** Hoje campo `artistas` no UploadForm e `artista_primario/secundario` no CapasWizard sao inputs de texto livre. Concorrente typebeat.fun usa modal com busca Spotify (foto + followers + generos) que da sensacao de "plataforma profissional, achei exatamente o artista que quero". Sessao 7 (2026-05-26) decidiu adotar puramente como UX -- nao bloqueia nada no backend, qualquer artista continua valido (curadoria-nao-e-gating).
- **Decisoes fechadas:**
  - **Spotify Web API Client Credentials** (sem login do usuario). Service `spotify_service.py` ja tem auth + cache de token -- so adicionar `search_artists(query, limit=10)`.
  - **Componente unico reusavel** `<SpotifyArtistPicker>` com prop `maxSelect`: 4 no UploadForm, 2 no CapasWizard (primario + secundario).
  - **Fallback gracioso quando busca vazia**: mostra "Nenhum artista encontrado" + opcao "Usar '[query]' como texto livre" -- preserva escape pra artistas underground BR/PT fora do Spotify.
  - **UX hibrida**: depois da selecao, mostra cards pequenos com foto + nome no form + botao "Editar selecao" reabre modal (estilo typebeat.fun, nao TypeBeat).
  - **NAO persiste spotify_id no banco** nesta task (evita migration). Backend continua recebendo `artistas: List[str]` igual hoje. Persistencia fica como follow-up se virar util.
  - **Cache em memoria backend** TTL 1h por query (rate limit Spotify modo Development = 180req/min, com cache passa de centenas de produtores).
- **Arquivos previstos:**
  - `api/app/services/spotify_service.py` (adiciona `search_artists`)
  - `api/app/routes/artists.py` (novo, ou anexa em rota existente) -- `GET /artists/search?q=...` autenticado via Supabase JWT + cache memoria
  - `web/components/SpotifyArtistPicker.tsx` (novo componente reusavel)
  - `web/components/UploadForm.tsx` (substitui inputs texto livre por picker)
  - `web/components/CapasWizard.tsx` (substitui inputs primario/secundario por picker)
  - `web/lib/api.ts` (funcao `searchSpotifyArtists`)
- **Criterio de pronto:** Producer no /upload clica "Selecionar artistas" -> modal abre com search debounced 300ms -> digita "Nettspend" -> lista cards Spotify (foto, followers, generos) -> seleciona 1, clica Confirmar -> form mostra card pequeno com foto/nome. Mesmo fluxo no /capas wizard (maxSelect=2). Backend recebe `artistas: ["Nettspend"]` igual hoje. Producer underground digita nome inexistente no Spotify -> escape "Usar como texto livre" funciona.
- **Dependencia:** T2.8 (spotify_service ja existe), T4.36 (entregue)

#### `[x]` T4.38 — Preview de audio + imagem (upload + review page)

- **Motivacao:** Gap real vs typebeat.fun apontado pelo Gustavo na analise dos prints (sessao 7). Hoje quando o producer arrasta MP3/capa no UploadForm, so aparece o nome do arquivo -- impossivel confirmar "subi o beat certo?" antes de clicar Gerar. Mesma cegueira na /review apos geracao: nao tem player do audio nem thumb da capa, so dados textuais. Risco real: producer publicar arquivo errado no YouTube.
- **Decisoes fechadas:**
  - **Upload (pre-submit):** player HTML5 `<audio controls>` nativo apos drop do MP3 + thumb visual da capa via `URL.createObjectURL()`. Zero backend, puro client.
  - **Review page:** mesmo player de audio + thumb da capa renderizados em cima dos campos editaveis. Frontend chama Supabase direto pra buscar `audio_path` e `cover_path` do beat + gera signed URLs (60min expiry). RLS garante que so o dono ve.
  - **Layout review:** preview vai no topo da pagina, antes do bloco "Revisar conteudo do video", como confirmacao visual do que vai virar video.
  - **Cleanup de blob URLs:** `useEffect` com return pra revogar URLs ao desmontar (evita memory leak).
- **Arquivos previstos:**
  - `web/components/UploadForm.tsx` (adiciona `<audio>` apos `audioFile` setado + thumb apos `coverFile` setado, ambos com cleanup)
  - `web/components/CoverPicker.tsx` (validar se manual tab ja mostra preview -- ler primeiro)
  - `web/app/(app)/beats/[id]/review/page.tsx` (adiciona secao MediaPreview no topo)
  - `web/components/MediaPreview.tsx` (novo, encapsula audio+thumb fetch de signed URLs)
- **Criterio de pronto:** Drag MP3 no /upload -> player aparece logo abaixo do drop area, da pra tocar e pausar. Upload manual de capa -> thumb visual aparece em vez de so nome do arquivo. /review de beat pronto -> topo da pagina tem audio player + thumb da capa final. Build verde. Verificacao visual em dev.
- **Dependencia:** T4.36 (entregue)

#### `[x]` T4.39 — Essentia.js: BPM/KEY/SCALE client-side + 3 campos separados

- **Motivacao:** Hoje librosa server-side (worker analyze.py) detecta BPM e key. Problema validado: librosa erra ~15-20% em trap com hi-hats em tripletas, e key detection e fraco (Krumhansl basico). Concorrente typebeat.fun usa **essentia.js** (descoberto via DevTools no console: `essentia-wasm.web.js:27`) -- biblioteca C++ do Music Technology Group (Barcelona) portada pra WebAssembly, mesma stack interna de algumas features do Spotify. Roda 100% no browser do producer. Resolve precisao E reduz custo de servidor.
- **Decisoes fechadas:**
  - **Licenciamento:** AGPL-3.0 gratis pra DSP classico (RhythmExtractor2013, KeyExtractor). NAO usar modelos ML pre-treinados do essentia (esses tem CC BY-NC-ND 4.0, exige licenca comercial). Cotacao comercial pro pos-beta via `mtg-info@upf.edu`.
  - **Onde roda:** 100% client (browser do producer). Backend NAO recalcula -- confia no input.
  - **UX:** botao "Auto-detect" no UploadForm dispara essentia, mostra loading ~2-3s, preenche 3 campos. Producer edita manualmente se quiser. Tudo ANTES de clicar "Gerar com IA" -- a partir dai os valores ja estao no form, generate.py recebe via POST /beats.
  - **3 campos separados:** BPM (number), KEY (Literal: C, C#, D, ...), SCALE (Literal: Major, Minor). Concat `${key} ${scale}` pra exibir e usar em descricao.
  - **Migration:** split do campo `music_key` atual (string tipo "A minor") em `music_key` (so nota) + `music_scale` (so modo). Script de migracao pra dados existentes.
  - **Worker analyze.py:** vira no-op pro BPM/KEY (mantem so como fallback caso producer pule auto-detect e nao preencha manual). Reduz CPU do Railway.
  - **Lazy load:** essentia WASM (~5-10MB) carregado so quando producer abre /upload, nao na home.
- **Arquivos previstos:**
  - `web/package.json` (add `essentia.js`)
  - `web/lib/essentia/analyzer.ts` (novo, wrapper async com lazy import + funcao `analyzeAudio(file) -> {bpm, key, scale}`)
  - `web/components/AudioAnalyzeButton.tsx` (novo, botao Auto-detect com loading state)
  - `web/components/UploadForm.tsx` (substitui input BPM unico por 3 campos + botao auto-detect)
  - `supabase/migrations/021_split_music_key_scale.sql` (split column + backfill)
  - `api/app/routes/beats.py` (POST /beats aceita `music_key` + `music_scale` separados; back-compat com `music_key` "A minor")
  - `api/app/workers/analyze.py` (passa a ser fallback so se beat.music_key for null)
  - `api/app/services/anthropic_service.py` (template usa `${key} ${scale}` na descricao)
  - `web/app/(app)/beats/[id]/review/page.tsx` (exibe 3 campos)
- **Criterio de pronto:** Producer no /upload arrasta MP3, clica "Auto-detect" -> loading 2-3s -> 3 campos preenchem (BPM=140, KEY=C#, SCALE=Minor). Producer edita SCALE pra Major se quiser. Submit -> beat criado com 3 campos. Descricao gerada usa "140 BPM • C# Major". Migration roda limpa em prod. Build verde. Verificacao visual em dev.
- **Dependencia:** T4.38 (vitoria rapida primeiro)

#### `[x]` T4.40 — Capa IA: remover letterbox + variacao dinamica (pose/framing + cenario autoritativo)

- **Motivacao:** 2 bugs de producao na capa IA (handoff v4 do Gustavo). (1) **Letterbox:** a frase "Thin black letterbox bars on top and bottom of the frame" estava literal nas 2 variantes de CAMERA_DNA -> gpt-image-2 renderizava barras pretas em TODA capa, quebrando thumbnail/video no YouTube. (2) **Capas clonadas:** todo brief gerava cenas quase identicas (ex: mulher sad underground = sempre cama + camisa Deftones + posteres + notebook). Causa-raiz confirmada por verificacao (script temp, sem API): o Python JA variava o sub_location (carro/quarto/hotel) mas o Claude IGNORAVA e copiava o exemplo few-shot literal "Deftones/cama/laptop" do system_prompt elemento 7. Pose e framing nem existiam como eixo de variacao (fixos no system prompt).
- **Decisoes fechadas (sessao com Claude, 2026-05-28):**
  - **Mistura doc v4 + analise:** o Claude GERA o conteudo (escala pra qualquer artista), o Python SORTEIA (determinismo real). Rejeitado deixar o Claude sortear via seed (LLM nao e deterministico; chamadas independentes convergem pro mesmo modo). Rejeitado remover sub_locations curadas do artist_universe (validadas visualmente; servem de semente).
  - **Letterbox:** deletada a frase das 2 variantes (PADRAO + UNDERGROUND). O look video-still se mantem pelos outros ~8 ancoras (motion blur, soft focus, 720x480, color banding...).
  - **Pose/framing:** pools fixos em Python (POSE_POOL 8 neutras + FRAMING_POOL 6), sorteados por seed no variation_engine. Pose so quando quem_aparece != sem_pessoa; framing sempre. Anti-repeticao (force_variation) estendida aos 3 eixos via helper _available_after_recent.
  - **Cenario autoritativo:** sub_location marcada AUTHORITATIVE no user_prompt + secao INPUT INTEGRITY no system_prompt obriga o Claude a NAO trocar por bedroom default.
  - **Anti-clone Deftones:** exemplo few-shot do elemento 7 neutralizado (vira "exemplo de densidade, NAO copiar nomes; gerar objetos frescos a cada geracao").
- **Arquivos:**
  - `api/app/services/cover_prompt_builder/prompt_skeleton.py` (remove letterbox 2x + POSE_POOL + FRAMING_POOL)
  - `api/app/services/cover_prompt_builder/variation_engine.py` (sorteia pose+framing, helper _available_after_recent, trata sem_pessoa)
  - `api/app/services/cover_prompt_builder/user_prompt.py` (injeta pose+framing, secao COMPOSITION, sub_location AUTHORITATIVE)
  - `api/app/services/cover_prompt_builder/system_prompt.py` (anti-clone elemento 7 + secao INPUT INTEGRITY)
- **Criterio de pronto:** Smoke test (sem API) verde: 5 seeds do mesmo brief dao combinacoes distintas de cenario+pose+framing, sem_pessoa zera a pose, injecao no user_prompt OK. **VALIDADO em prod 2026-05-28** (Gustavo: "ficou muito bom, as variacoes estao incriveis") -- cenarios variados, sem barras pretas, Claude obedecendo o cenario. **Passo B (anti-repeticao de objetos via bloco machine-readable + recent_seeds) em aberto** -- so fazer se aparecer repeticao residual de objetos/wardrobe entre cliques; Passo A sozinho ja deixou as variacoes boas.
- **Dependencia:** T4.28-T4.33 (base v3)

#### `[x]` T4.41 — Nome do brief no modal da capa (link por ID + fallback)

- **Motivacao:** o modal de uma capa (CapaModal) mostra os tokens do brief usado (ex: "Feng · Underground · Mulher · Sad · Flash duro") mas NAO mostra o NOME que o produtor deu ao preset. Gustavo quer o nome visivel no painel "01 Brief usado". Requisito-chave: se o produtor renomear o preset depois, o nome no card de capas ja geradas deve refletir o novo nome -> referenciar por ID, nao snapshot cru do nome.
- **Decisoes fechadas (2026-05-28):**
  - **Link por ID + nome de fallback:** `cover_library` ganha `brief_preset_id` (FK -> brief_presets, ON DELETE SET NULL) e `brief_preset_name`. Display: preset existe -> nome AO VIVO da lista de presets ja carregada na pagina (rename propaga); preset deletado -> usa `brief_preset_name` salvo na geracao; sem preset (capa antiga/manual) -> so tokens (como hoje).
  - **So daqui pra frente:** sem backfill de capas antigas (nao da pra casar brief_used antigo com preset atual de forma confiavel).
  - **Backend resolve o nome:** frontend manda so `brief_preset_id`; o worker busca o nome em brief_presets (com checagem de dono) e grava o snapshot. Nao confia no nome vindo do client.
- **Arquivos:**
  - `supabase/migrations/023_cover_brief_preset_link.sql` (2 colunas em cover_library)
  - `api/app/workers/cover.py` (generate_covers recebe brief_preset_id, resolve nome, grava id+nome no _insert_pending)
  - `api/app/routes/covers.py` (GenerateCoverRequest.brief_preset_id; GET /covers retorna as 2 colunas)
  - `web/lib/api.ts` (CoverLibraryItem ganha brief_preset_id + brief_preset_name)
  - `web/app/(app)/capas/page.tsx` (geracao passa id do preset ativo; resolve nome ao vivo+fallback; passa pro modal)
  - `web/components/CapaModal.tsx` (prop briefName, exibe na secao "01 Brief usado")
  - `api/tests/` (teste do link: grava e GET /covers devolve)
- **Criterio de pronto:** gerar capa a partir de um preset nomeado -> abrir modal -> nome aparece acima dos tokens; renomear o preset -> nome no modal reflete o novo; deletar o preset -> nome de fallback persiste. **Implementado + testado local** (3 testes novos no worker verdes, suite backend 52 passed, typecheck + build frontend OK). Migration 023 aplicada no Supabase por Gustavo (2026-05-28). **Validacao visual em prod pendente** (gerar capa nova pos-deploy e conferir o nome no modal).
- **Dependencia:** T4.16 (route covers), T4.23 (worker v3), T4.25 (presets), T4.24 (modal)

#### `[x]` T4.42 — Botoes de geracao da /capas: hierarquia + mata "variacao"

- **Motivacao:** Gustavo apontou que os 3 botoes do header (Gerar 1 capa / Gerar variacao / Gerar 3 variacoes) parecem fazer a mesma coisa -- todos roxos, lado a lado, mesmo peso visual. Confusao na otica do cliente. Investigacao confirmou: "Gerar 1 capa" e "Gerar variacao" eram **tecnicamente identicos** -- o `force_variation` que justificava o botao "variacao" NUNCA era enviado pro backend (triggerGenerate so logava o intent). Alem disso "variacao" e jargao interno: toda capa do mesmo brief ja sai diferente (variation_engine sorteia por seed sempre).
- **Decisoes fechadas (2026-05-28, Gustavo escolheu via AskUserQuestion + print circulando os 2 botoes que sobram):**
  - **Mata o botao "Gerar variacao"** (redundante).
  - **Hierarquia visual:** "Gerar 1 capa" = `btn-primary` (roxo, Sparkles); "Gerar 3 capas" = `btn-ghost` (outline discreto, sem icone, pilula de credito em cor muted). Impossivel confundir.
  - **Renomeia** "3 variacoes" -> "3 capas" (mata o termo "variacao" da tela; modal de confirmacao idem).
  - **Rotulo de contexto** "GERAR DO BRIEF: <nome ativo>" acima dos botoes -- resolve a duvida de qual brief vai gerar quando o produtor troca de brief.
  - **Anti-repeticao sempre ligado:** triggerGenerate passa `force_variation: true` em toda geracao (era o que o botao "variacao" prometia). Limpou o conceito `intent`/`confirmIntent` (codigo morto pos-remocao).
- **Arquivos:**
  - `web/components/CapasHeader.tsx` (2 botoes c/ variant primary/secondary, rotulo do brief, remove Shuffle)
  - `web/app/(app)/capas/page.tsx` (force_variation sempre, remove intent/confirmIntent, simplifica handleGenerate/triggerGenerate)
  - `web/components/ConfirmGenerateModal.tsx` ("Gerar 3 variacoes?" -> "Gerar 3 capas?")
- **Criterio de pronto:** header mostra 1 primario + 1 secundario claramente distintos + nome do brief; geracao manda force_variation. Typecheck + build verdes. **Validacao visual em prod pendente.**
- **Dependencia:** T4.16, T4.25 (presets), T4.41 (mesmo arquivo CapasHeader/page)

#### `[x]` T4.43 — Custo real por capa no usage_tracker (calculado pelos tokens da fal)

- **Motivacao:** Gustavo notou no dashboard da fal que a geracao da plataforma custava $0.0111, mas o `usage_tracker` gravava `$0.0083` HARDCODED (FAL_COST_USD). Subestimava o custo real em ~25% -- ruim pra unit economics quando for precificar planos (regra 5 CLAUDE.md: saber custo por usuario). Confirmado via doc da fal que a resposta do gpt-image-2 devolve bloco `usage` com tokens (input/output, detalhados em text/image). Logo da pra calcular o custo REAL por geracao.
- **Decisao (2026-05-28):** Pra fins de ANALISE (nao cobranca), gravar o custo real por imagem. fal_service calcula via `_cost_from_usage(usage)` usando a tabela de precos por token da fal (texto $5/$10 por 1M in/out, imagem $8/$30 por 1M in/out). Grava cost_usd real + tokens_in/out + breakdown completo em api_usage.metadata. Fallback pro estimado ($0.0111) + warning se a resposta vier sem `usage`.
- **Arquivos:**
  - `api/app/services/fal_service.py` (constantes de preco por token + `_cost_from_usage` + wire no generate_cover/track/return)
  - `api/app/services/usage_tracker.py` (comentario do PRICING fal -- agora custo vem calculado)
  - `api/tests/services/test_fal_cost.py` (teste do calculo)
- **Criterio de pronto:** geracao grava cost_usd real (proximo ao dashboard da fal) + tokens em api_usage; teste do `_cost_from_usage` verde. **FEITO** -- 5 testes novos verdes (caso tipico 540 txt in + 272 img out = $0.01086, bate com o dashboard), suite backend 57 passed. **Validacao em prod pendente** (conferir 1 row de api_usage pos-deploy batendo com o dashboard da fal).
- **Dependencia:** T4.7 (fal_service), regra 5 (usage_tracker)

#### `[ ]` T4.44 — Gerar capa por IA direto no /upload (modal: escolher brief salvo ou criar novo)

- **Arquivos:**
  - `web/components/InlineCoverGenerator.tsx` (novo — modal disparado do picker: lista os briefs salvos pra escolher + gerar, OU abre o `CapasWizard` pra criar um novo brief; chama `POST /covers/generate`; espera a capa via Supabase Realtime em `cover_library`; ao ficar `ready`, devolve o `cover_id`)
  - `web/components/CoverPicker.tsx` (botao "Gerar com IA" — abre o `InlineCoverGenerator`; ao receber o `cover_id` pronto, faz `onPickLibrary(cover_id)` + troca pra aba Biblioteca/IA pra produtor VER a capa selecionada)
  - reusa: `CapasWizard.tsx`, `lib/api.ts` (`fetchBriefs`, `createBrief`, `fetchCoverCredits`) e o fluxo `triggerGenerate` (extrair pra helper compartilhado se preciso)
- **Decisao (2026-06-01):** Botao "Gerar com IA" no picker do /upload abre um MODAL onde o produtor (a) escolhe um dos briefs salvos e gera na hora, ou (b) cria um brief novo pelo mesmo wizard da aba /capas. A capa gerada cai na biblioteca (vira reusavel) e fica auto-selecionada no form. Consome **1 credito** do tier, igual /capas (upload manual continua sem consumir). Reaproveita peças existentes — nao duplicar a logica de geracao. Respeita [[feedback_curadoria_nao_e_gating]] (qualquer artista digitavel) e [[feedback_usar_frontend_design_skill]] (Editorial Mono).
- **O que fazer:** Sem sair do /upload, o produtor gera uma capa por IA e ela ja entra selecionada no beat. Estado de "gerando ~30s" visivel; sem credito -> bloqueia com a mesma mensagem da /capas.
- **Criterio de pronto:** No /upload, "Gerar com IA" abre o modal; escolher um brief salvo (ou criar um) e gerar mostra estado de progresso; em ~30s a capa aparece na Biblioteca e fica selecionada no form, pronta pro submit; 1 row em `api_usage` registrada; sem credito o botao gerar bloqueia. `pnpm typecheck` + `pnpm build` verdes.
- **Dependencia:** T4.23 (cover.py/covers.py/api.ts), T4.24 (CapasWizard), T2.11 (CoverPicker)

---

### Fase 5 — YouTube OAuth + postagem (Gustavo executa)

> **Por que:** o passo final do MVP. Sem isso o beatmaker nao tem entrega real. Esta fase libera o piloto com Gustavo.

#### `[x]` T5.1 — OAuth YouTube: rotas auth + callback

- **Arquivos:** `api/app/routes/youtube.py`, `web/app/(app)/youtube/connect/page.tsx`, `web/app/api/youtube/callback/route.ts`
- **O que fazer:**
  - `GET /api/youtube/auth` — gera URL OAuth e redireciona
  - `GET /api/youtube/callback` — recebe code, troca por tokens, salva em `youtube_accounts` (refresh_token via `pgp_sym_encrypt`)
  - Pagina `/youtube/connect` com botao "Conectar canal"
- **Criterio de pronto:** Beatmaker clica conectar → autoriza no Google → volta logado com canal. Row em `youtube_accounts` salva.
- **Dependencia:** T0.5, T1.4

#### `[x]` T5.2 — Service: youtube_service.upload_video

- **Arquivo:** `api/app/services/youtube_service.py`
- **Decisao (2026-05-12):** Implementado com `google-api-python-client` + `google-auth`. Refresh automatico do access_token quando expirado (persiste o novo). Quando `scheduled_at` no futuro: sobe como `private` + `publishAt` (YouTube agenda). Quando ausente/passado: sobe direto com `privacy_status` final. Thumbnail custom em try/except (canal nao verificado da 403). Trunca titulo (100), descricao (5000), tags (500 chars total).
- **Criterio de pronto:** Funcao retorna `{video_id, url, scheduled, privacy_status_final}`. Falta validar com upload real.
- **Dependencia:** T5.1 — ✅ concluido

#### `[x]` T5.3 — Service: ffmpeg_service.audio_para_video

- **Arquivo:** `api/app/services/ffmpeg_service.py`
- **Decisao (2026-05-12):** Otimizado pra capa estatica: `-r 1 -c:a copy` (sem reencode do MP3, fps minimo). MP4 fica ~5x menor e gera ~10x mais rapido que `-r 30 -c:a aac`. Adicionado `-movflags +faststart` pra streaming. Timeout de 5min, captura stderr no log.
- **Criterio de pronto:** Funcao `audio_to_mp4(mp3, cover, output)`. Falta validar com upload real.
- **Dependencia:** — (ffmpeg ja no nixpacks)

#### `[x]` T5.4 — Worker publish.py: gera mp4 + upload no YouTube

- **Arquivos:** `api/app/workers/publish.py`, `api/app/services/qstash_service.py` (dispatch_publish_job), `api/app/routes/posts.py` (dispara publish no PATCH com status=scheduled)
- **Decisao (2026-05-12):** A/B/C ja removido do MVP — 1 video por beat. Worker baixa MP3 (bucket `audios`) e capa (bucket `covers`) via signed URL, gera MP4 com ffmpeg_service, sobe com youtube_service (passando `scheduled_at` + `privacy_status` do post). Atualiza `youtube_video_id`, `youtube_url`, `published_at` no post. Idempotente: se `youtube_video_id` ja existe, retorna `skipped`. Migration 007 adiciona `posts.privacy_status` (public/unlisted, default public). UI da review tem toggle Publico / Nao listado.
- **Criterio de pronto:** Apos confirmar agendamento na /review, video aparece agendado no YouTube Studio. Falta validar end-to-end com upload real (deploy Railway com novas deps Google + aplicar migration 007).
- **Dependencia:** T5.2 ✅, T5.3 ✅, T4.4 ✅

#### `[ ]` T5.5 — Solicitar quota YouTube no Google Cloud Console

- **O que fazer:** Quota default de 10k/dia limita a 6 uploads/dia/projeto. Solicitar 100k/dia via formulario Google Cloud (aprovacao auto pra usos legitimos).
- **Criterio de pronto:** Quota expandida visivel no console
- **Dependencia:** T5.1 (precisa do OAuth funcionando como evidencia)

#### `[ ]` T5.6 — Test E2E: postar 1 beat real em conta de teste

- **Arquivo:** `api/tests/integration/test_full_pipeline.py` (marker `@slow`)
- **O que fazer:** Cria user fake, conecta canal de teste (preconfigurado), upload beat, valida 3 videos no YouTube Studio
- **Criterio de pronto:** Pipeline ponta-a-ponta passa
- **Dependencia:** T5.4

#### `[x]` T5.7 — Fix codec audio MP4 (YouTube recusava processar MP3 em container)

- **Arquivo:** `api/app/services/ffmpeg_service.py`
- **Bug:** Teste do Rary em 2026-05-19 publicou no YouTube com sucesso (200 OK, video_id retornado), mas o YouTube recusou processar o MP4 ("Processamento cancelado. Nao foi possivel processar o video"). Logs Railway confirmaram: ffmpeg ok, upload ok, falha aconteceu no processamento async do YouTube apos o upload (sem webhook de volta). Status do post ficou `published` mesmo o video estando quebrado.
- **Causa:** `-c:a copy` colocava MP3 cru em container MP4. YouTube lista como "suportado" mas eh instavel; recomendacao da industria eh AAC.
- **Fix:** Trocar `-c:a copy` por `-c:a aac -b:a 320k`. Re-encoda audio uma vez (perda inaudivel a 320k) em troca de upload confiavel. Custo RAM ~30MB extra, cabe no Railway free. Demais flags low-memory (`-r 1`, `-g 1`, `-bf 0`, `profile baseline`) mantidas pra nao voltar OOM.
- **Achado paralelo (nao mexido):** Thumbnail rejeitada com 403 porque canal do Rary nao tem telefone verificado em [youtube.com/verify](https://youtube.com/verify). Codigo ja trata isso em try/except — video sobe sem capa custom. So precisa avisar o Rary se quiser capa de volta.
- **Sobre o som baixo no YouTube:** nao eh nosso pipeline. Convert worker nao toca em audio (`convert.py:29`). YouTube normaliza tudo pra -14 LUFS automaticamente, impossivel evitar. Vale pra qualquer upload.
- **Dependencia:** T5.4
- **Doc:** `docs/sessoes/2026-05-19-youtube-processamento-cancelado.md`
- **Pos-deploy:** Rary tem que (1) verificar telefone se quiser thumbnail custom, (2) republicar beat `ee96c64f` que ficou em `ready_for_review`.

---

### Fase 6 — Polimento dashboard + handoff (Gustavo executa)

> **Por que:** beta privado precisa estar minimamente apresentavel. Empty/error/loading states + convites.

#### `[x]` T6.1 — Dashboard lista beats com status + thumb + canal

- **Arquivos:** `web/app/(app)/beats/page.tsx`, `web/components/BeatCard.tsx`, `web/components/BeatListRow.tsx`
- **Status:** ✅ DONE (verificado em auditoria 2026-05-14). Implementado como bonus da Fase 2 Analytics em 2026-05-14. Listagem real fica em `/beats` (nao /dashboard) com cards em grade ou lista (toggle), filtros por status, thumb da capa, titulo, status, data. Multitenant via RLS. Dashboard cards de metricas tambem foram entregues como bonus (contadores reais de publicados/em fila/agendados + views totais).

#### `[x]` T6.2 — Pagina /beats/[id] mostra link YouTube + agenda

- **Arquivos:** `web/app/(app)/beats/[id]/review/page.tsx`
- **Status:** ✅ DONE (verificado em auditoria 2026-05-14). Review page mostra link YouTube clicavel quando `youtube_video_id` existe, data agendada via DateTimePicker custom (T6.10), status (T6.11 bloqueia reagendamento se ja publicado). MVP foi simplificado pra 1 video por beat — entao "3 links" virou "1 link" conforme decisao de 2026-05-11.

#### `[x]` T6.3 — Empty state + error state + loading state em todas as paginas

- **Arquivos:** `web/app/(app)/beats/page.tsx`, `web/app/(app)/beats/[id]/page.tsx`, paginas de analytics
- **Status:** ✅ DONE (verificado em auditoria 2026-05-14). /beats tem loading + error + empty states (linhas 167-248). /beats/[id] tem fetchError handling. Paginas de analytics tem skeletons especificos por bloco (entregue na T7.11). Dashboard usa DashboardStats com graceful fallback.

#### `[ ]` T6.4 — README.md guia de setup local em 10 passos

- **Arquivo:** `README.md`
- **O que fazer:** Reescrever README atual com 10 passos numerados que beatmaker tecnico consegue seguir sem ajuda. Incluir troubleshooting de ffmpeg e Supabase local.
- **Criterio de pronto:** Pessoa nova clona, segue, tem app rodando local em <30 min
- **Dependencia:** T6.3

#### `[ ]` T6.5 — Convidar Gustavo no Supabase + Vercel + Railway + GitHub

- **O que fazer:** Add Gustavo como collaborator nos 4 servicos. Compartilhar `.env` real via 1Password Family ou similar (NUNCA por chat).
- **Criterio de pronto:** Gustavo confirma acesso aos 4 dashboards
- **Dependencia:** T6.4

#### `[x]` T6.13 — Redesign páginas de auth (login/forgot/reset) com background WebGL

- **Arquivos:**
  - `web/components/WebGLShader.tsx` (novo — shader RGB de three.js, vibe underground)
  - `web/app/(auth)/layout.tsx` (novo — provê background WebGL pras 3 rotas)
  - `web/components/LoginForm.tsx` (reescrito visual NexusGate adaptado pro BeatPost)
  - `web/components/ForgotPasswordForm.tsx` + `ResetPasswordForm.tsx` (mesmo visual glass)
  - `web/app/(auth)/{login,forgot-password,reset-password}/page.tsx` (simplificadas — só renderizam form, layout cuida do background)
  - `web/package.json` + lockfile (adiciona `three` + `@types/three`)
- **Decisão (2026-05-13):** Gustavo achou tela de login pobre, mandou referência do 21st.dev (NexusGate). Adaptações: nome BeatPost, copy "BUILT BY PRODUCERS. BUILT FOR THE GRIND." (sem emojis gaming), quick access apenas Google (não 3 redes), background = WebGL shader (THREE.js, fragmento RGB animado) em vez do vídeo de gaming. Layout `(auth)/layout.tsx` aplica o shader nas 3 páginas de auth pra consistência (login + recuperar senha + nova senha). Cards `backdrop-blur-sm bg-black/50 border border-white/10` flutuam sobre o shader. Funcionalidade Supabase 100% preservada: login/signup/Google OAuth/esqueci-senha/reset, validação senha ≥6 chars, traduzirErro, redirect pro dashboard.
- **Critério de pronto:** ✅ Typecheck verde. Visual coerente nas 3 rotas. Funcionalidade Supabase intocada.
- **Dependência:** T6.12

#### `[x]` T6.12 — Fluxo "Esqueci minha senha"

- **Arquivos:**
  - `web/components/LoginForm.tsx` (link "Esqueci minha senha" abaixo do campo de senha, só no modo login)
  - `web/app/(auth)/forgot-password/page.tsx` + `web/components/ForgotPasswordForm.tsx` (envia email)
  - `web/app/(auth)/reset-password/page.tsx` + `web/components/ResetPasswordForm.tsx` (recebe link do email + nova senha)
- **Decisão (2026-05-13):** Fluxo completo de recuperação de senha via Supabase Auth nativo. (1) `/forgot-password` chama `auth.resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`, mostra confirmação verde de "e-mail enviado" (não diz se a conta existe — protege contra enumeração). (2) Supabase manda email com link mágico. (3) `/reset-password` valida sessão recovery (link expirado/usado mostra erro com CTA pra solicitar novo), tem 2 campos (senha + confirmar), valida mínimo 6 chars + senhas iguais, chama `auth.updateUser({ password })`, mostra sucesso verde e redireciona pro dashboard. Middleware não toca essas rotas (já estão fora do `rotasProtegidas` e do `redirect /login se logado`). Não exige migração nem mudança no Supabase Dashboard (URL Configuration já foi corrigida em sessão anterior).
- **Critério de pronto:** ✅ Link na tela de login → `/forgot-password` → email enviado → clica link → `/reset-password` → digita senha → dashboard. Typecheck verde.
- **Dependência:** —

#### `[x]` T6.11 — Bloqueio de reagendamento em beats já publicados

- **Arquivos:** `web/app/(app)/beats/[id]/review/page.tsx`
- **Decisão (2026-05-13):** Gustavo notou que beats com vídeo já no YouTube ainda mostravam o card "Agendar publicação" ativo — clicar "Confirmar" novamente geraria upload duplicado no canal. Solução: detectar `post.youtube_video_id` e (1) substituir o card de agendamento por card verde "Publicado no YouTube" com data, link "Ver no YouTube" e aviso pra editar no Studio; (2) banner amber no topo da página avisando que edições nos campos não sincronizam com o vídeo já no YouTube. Interface `Post` ampliada com `youtube_url`, `youtube_video_id`, `published_at` (backend já retornava via `select("*")`, só faltava tipar).
- **Critério de pronto:** ✅ Beat publicado: nada de agendamento aparece, mostra card verde com link YouTube. Beat draft/rascunho: comportamento normal.
- **Dependência:** T6.10

#### `[x]` T6.10 — DateTimePicker custom + presets rápidos no agendamento

- **Arquivos:**
  - `web/components/DateTimePicker.tsx` (novo, ~230 linhas)
  - `web/app/(app)/beats/[id]/review/page.tsx` (substitui `<input type="datetime-local">` por DateTimePicker + presets)
- **Decisão (2026-05-13):** Gustavo achou o `datetime-local` nativo feio (inconsistente entre browsers, ignora tema dark). Solução: componente custom zero-dependency (só React + Tailwind + lucide-react + Intl.DateTimeFormat). Inclui calendário com nav de mês, time picker 24h com ajuste por seta, label humano ("Ter, 13 de maio às 18:00"), click-fora/ESC pra fechar. UX: 5 presets rápidos (Agora, Hoje 18h, Amanhã 18h, Em 3 dias, Em 7 dias) cobrem ~90% dos casos sem precisar abrir o picker. Texto humano de confirmação em verde ("Vai publicar daqui a 4h"). Migração do estado de `string` (datetime-local) pra `Date` real (mais limpo).
- **Critério de pronto:** ✅ Typecheck verde. Picker bonito com tema dark, navegando meses, selecionando dia + hora.
- **Dependência:** T6.9

#### `[x]` T6.9 — Upload: múltiplos artistas (colab) com pipeline cienciente

- **Arquivos:**
  - `web/components/UploadForm.tsx` (lista dinâmica de artistas, + e ✕, máximo 4, dedupe case-insensitive)
  - `api/app/routes/beats.py` (schema aceita `artistas: List[str]` + reconcilia com `artista_nome` legado)
  - `api/app/workers/generate.py` (split por ' x ' → lista; Spotify usa só o principal; Gemini usa nome composto)
  - `api/app/services/anthropic_service.py` (signature trocada `artista_nome` → `artistas: list[str]`; hashtags do template ficam dinâmicas por artista + cruzamento; prompt orienta gerar tags individuais)
- **Decisão (2026-05-13):** Gustavo notou no primeiro teste real que ao colocar 2 artistas (Playboi Carti x Nettspend) a IA não gerava tags individuais. Diagnóstico: backend tratava `artista_nome` como string única → Spotify buscava artista literalmente "Carti x Nettspend" (não existe → lista vazia → BEAT_NAME perdia inspiração); Claude tratava como 1 artista só → hashtag composta sem tags individuais. Solução: frontend manda array, backend mantém string composta no DB (`'Carti x Nettspend'`) por compat, worker reconstrói lista por split ` x `, Spotify usa só o **primeiro** (estilo léxico unifica BEAT_NAME), Gemini usa nome composto (Google entende), Claude recebe lista + instrução de gerar tags por artista + cruzamento. Limite 4 artistas, dedupe case-insensitive, trim automático (preserva nomes compostos tipo "Travis Scott"). Sem migration nova.
- **Critério de pronto:** ✅ Frontend mostra primeiro campo obrigatório + botão "Adicionar" (até 4); demais campos têm ✕; duplicata mostra aviso âmbar. Typecheck verde em TS e imports OK em Python.
- **Dependência:** T6.7

#### `[x]` T6.8 — UI/UX card canal conectado (vermelho de erro -> verde de status)

- **Arquivos:** `web/app/(app)/configuracoes/page.tsx`
- **Decisao (2026-05-13):** Gustavo notou que o vermelho do card "Canal conectado" (fundo `bg-red-500/10` + icone `text-red-400`, originalmente referencia da marca YouTube) passava sinal de alerta/erro em vez de status positivo. Trocado por icone neutro (`bg-zinc-800` + `text-zinc-400`) + badge verde "● Conectado" com bolinha pulsante (`animate-ping`). Cor do estado isolada do branding. Vermelho mantido apenas em (1) empty state quando canal nao conectado (serve como CTA) e (2) banner de erro OAuth (semantica correta de erro).
- **Criterio de pronto:** ✅ Card conectado deixa claro num piscar que esta tudo OK. Typecheck verde.
- **Dependencia:** T6.6

#### `[x]` T6.7 — Sanitize Instagram + link clicavel na descricao do video

- **Arquivos:**
  - `web/app/(app)/configuracoes/page.tsx` (funcao `sanitizeInstagramHandle` aplicada em load/onChange/save)
  - `api/app/services/anthropic_service.py` (template da descricao ganha linha `📷 https://instagram.com/<handle>`)
- **Decisao (2026-05-13):** Frontend: campo Instagram fica blindado contra `@` em qualquer posicao, URL colada (`instagram.com/handle`), espacos, emojis e qualquer caractere fora do padrao Instagram (`a-zA-Z0-9._`). Aplica em 3 pontos (carga do banco, digitacao, save). Descricao do YouTube ganha linha extra com URL completa do Instagram (vira link clicavel quando canal tem Recursos Avancados ativados) abaixo do handle solto `@handle` que ja existia.
- **Criterio de pronto:** ✅ Typecheck verde. Cola `https://instagram.com/nextsummeer/` no campo → vira `nextsummeer`. Novos beats publicados tem 2 linhas Instagram na descricao (`@handle` + `📷 https://instagram.com/handle`).
- **Dependencia:** T6.6

#### `[x]` T6.6 — Unificar YouTube + Configuracoes em pagina unica de perfil

- **Arquivos:**
  - `web/app/(app)/configuracoes/page.tsx` (mescla perfil + conexao YouTube em 2 secoes)
  - `web/components/Sidebar.tsx` (remove item "YouTube")
  - `web/middleware.ts` (remove `/youtube` das rotas protegidas)
  - `api/app/routes/youtube.py` (callback OAuth redireciona pra `/configuracoes`)
  - `web/app/(app)/youtube/page.tsx` (deletado)
- **Decisao (2026-05-13):** Gustavo notou durante uso real que /youtube e /configuracoes sao ambos "perfil do produtor" partido em dois lugares. Unificacao reduz sidebar pra 3 itens (Upload, Beats, Configuracoes) e centraliza conexao YouTube + nome/email/Instagram em uma pagina so. Decisao consciente de NAO adicionar campos novos (BeatStars/Twitter/TikTok) nesta etapa — fica pra quando precisar de verdade.
- **Criterio de pronto:** ✅ Sidebar com 3 itens. /configuracoes mostra secao Perfil + secao Canal YouTube. Callback OAuth volta pra /configuracoes?connected=1 com banner verde. Typecheck verde.
- **Dependencia:** —

---

### Redesign Visual — Interface pós-login (Gustavo executa)

> **Por que:** Interface pós-login está muito crua — conteúdo espremido na esquerda, espaço desperdiçado, sidebar sem personalidade, tipografia sem hierarquia. Referência visual: Vaulto dashboard (dark premium, sidebar com grupos, cards com profundidade). Auth pages não mudam. Executar nessa ordem: tokens → layout → componentes → páginas.

#### `[x]` T6.14 — Fundação visual: Inter + nova paleta CSS

- **Arquivos:** `web/app/globals.css`, `web/app/layout.tsx`
- **O que fazer:**
  - Trocar fonte Geist por **Inter** (Google Fonts via `next/font/google`)
  - Nova paleta de variáveis CSS: `--bg-base` (#0c0c0e), `--bg-surface` (#131316), `--bg-elevated` (#1c1c21), `--border` (#27272f), `--text-primary` (#f4f4f5), `--text-muted` (#71717a), `--accent` (#7c3aed), `--accent-hover` (#6d28d9)
  - `border-radius` padrão: `--radius-sm` 6px, `--radius-md` 10px, `--radius-lg` 16px
  - Aplicar Inter no body via `font-family: var(--font-inter), sans-serif`
  - Manter globals.css da auth intocado (video background + glass já estão bons)
- **Criterio de pronto:** `pnpm typecheck` verde. Toda interface pós-login usa Inter. Fundo base visualmente diferente do atual zinc-950 flat.
- **Dependencia:** —

#### `[x]` T6.15 — Novo layout + sidebar estilo Vaulto

- **Arquivos:** `web/components/Sidebar.tsx`, `web/app/(app)/layout.tsx`
- **O que fazer:**
  - Sidebar com fundo `--bg-surface` + borda direita `--border`
  - Logo "BeatPost" no topo com ícone (Music2 do lucide)
  - Navegação agrupada por categoria (label uppercase muted tipo "GERAL", "CONTA")
  - Itens: Dashboard (LayoutDashboard), Upload (Upload), Beats (Music), Configurações (Settings) — todos com ícone + label
  - Item ativo: fundo `--bg-elevated` + texto primary + sem violeta flat — mais sutil
  - Sair no rodapé com separador acima
  - Layout principal: `flex-1 overflow-y-auto` com padding horizontal generoso + `max-w-5xl mx-auto` no conteúdo (centraliza e evita espaço desperdiçado)
- **Criterio de pronto:** Dashboard aparece no menu. Conteúdo de todas as páginas fica centralizado horizontalmente. Sidebar visualmente mais rica.
- **Dependencia:** T6.14

#### `[x]` T6.16 — Página Beats: toggle grade/lista + novo visual dos cards

- **Arquivos:** `web/app/(app)/beats/page.tsx`, `web/components/BeatCard.tsx`, `web/components/BeatListRow.tsx` (novo)
- **O que fazer:**
  - Botão toggle no canto direito do header: ícone grade (LayoutGrid) / lista (List)
  - Estado salvo em localStorage para persistir preferência
  - **Modo grade (atual):** cards com `--bg-surface`, `border --border`, `border-radius --radius-md`, hover eleva para `--bg-elevated`
  - **Modo lista (novo):** `BeatListRow` — linha horizontal com thumbnail 48x48, título, artista, BPM, tom, badge status, data, botão "Abrir" — estilo tabela limpa
  - Filtros de status (Todos/Processando/Rascunho/Agendados/Postados/Falhos) mantidos acima
- **Criterio de pronto:** Toggle funciona. Preferência persiste ao recarregar. Modo lista mostra todos os dados relevantes de forma compacta. Typecheck verde.
- **Dependencia:** T6.15

#### `[x]` T6.17 — Upload + Review centralizados com uso do espaço

- **Arquivos:** `web/app/(app)/upload/page.tsx`, `web/components/UploadForm.tsx`, `web/app/(app)/beats/[id]/review/page.tsx`
- **O que fazer:**
  - Upload: form centralizado com `max-w-2xl mx-auto` + card container `--bg-surface border --border rounded --radius-lg p-8`
  - Review: layout em **dois painéis** lado a lado — painel esquerdo (título + descrição + tags, ~60%) + painel direito (agendamento + ações, ~40%). Usa o espaço horizontal que hoje fica vazio.
  - Inputs e textareas com `background: --bg-elevated`, `border: --border`, focus ring em accent
  - Tag chips com novo visual (border + background sutil, × bem posicionado)
- **Criterio de pronto:** Upload não tem mais espaço vazio gigante à direita. Review tem dois painéis que fazem uso natural da largura. Typecheck verde.
- **Dependencia:** T6.15

#### `[x]` T6.20 — Drag-and-drop no upload + widget "Próximas publicações" no dashboard

- **Trigger:** 2026-05-19 (continuação da sessão T6.19) — Gustavo pediu pra investigar o que mais do Beatloadr valeria copiar tirando bulk. Decisão de fazer 2 itens: (B) drag-and-drop no upload de áudio e capa, (C) widget de próximas publicações agendadas no dashboard. Pacotes A (aceitar WAV/FLAC) e D (loudnorm) descartados: A por trade-offs de banda/storage e B por proteção contra roubo de WAV, D porque BeatPost conscientemente NÃO normaliza áudio (preserva master do produtor — documentado em memory `project_audio_nao_e_normalizado`).
- **Arquivos previstos:**
  - `web/components/UploadForm.tsx` (adiciona handlers onDragOver/onDragLeave/onDrop nos botões de áudio e capa)
  - `web/components/agenda/ProximasPublicacoesWidget.tsx` (novo)
  - `web/app/(app)/dashboard/page.tsx` (inclui o widget)
- **O que fazer:**
  1. **Drag-and-drop áudio:** zona do botão existente passa a aceitar drop. Visual: hover state extra com borda accent solid + shadow-glow-accent + label "Solte aqui" quando arrastando. Validação client-side: rejeita arquivo não-MP3 com aviso ("Só MP3 — converta antes de subir").
  2. **Drag-and-drop capa:** mesma lógica pro botão de cover. Aceita JPG/PNG, rejeita outros.
  3. **Widget Próximas Publicações:** card no dashboard mostrando até 5 próximos beats com `scheduled_at` futuro. Cada linha: thumb 32×32 + título + data formatada (DD/MM HH:mm) + contador "em X dias" / "amanhã" / "em X horas". Click vai pra `/beats/[id]/review`. Empty state: "Nenhuma publicação agendada. [Ir pra agenda]". Reusa `useCoverUrl` do BeatCard.
- **Critério de pronto:**
  - Soltar MP3 no botão de áudio preenche o file (sem precisar clicar)
  - Soltar arquivo errado (ex: PDF) mostra aviso vermelho 3s e ignora
  - Soltar JPG/PNG no botão de capa preenche
  - Dashboard mostra widget com beats agendados (ordenados por data crescente)
  - Vazio mostra empty state com CTA "Ir pra agenda"
  - `pnpm build` passa (validar Suspense/prerender)
- **Decisão visual:** mantém linguagem Studio Console (flame orange accent, hairlines, LEDs). Drag ativo no botão usa `shadow-glow-accent` + borda solid accent. Widget no dashboard segue padrão dos cards já existentes (bg-surface + border + radius-lg).
- **Fora do escopo:**
  - Múltiplos formatos de áudio (aceitar WAV/FLAC) — descartado por trade-offs
  - Múltiplos arquivos de uma vez (bulk upload) — fora do MVP
  - Drag pra reordenar publicações no widget — só visualização
- **Estimativa:** ~3-4h (B: 2h, C: 1-2h)
- **Dependência:** T6.19 (rota /agenda + tipo BeatListItem com scheduled_at)

#### `[x]` T6.19 — Calendário visual de agendamento (Variante B, interativo)

- **Trigger:** Gustavo descobriu o Beatloadr em 2026-05-19 (concorrente direto mais alinhado ao recorte do BeatPost — SaaS web YouTube-only). Print do calendário mensal deles disparou a feature. Sessão de design e variantes em `docs/sessoes/2026-05-19-calendario-agendamento-design.md`. Variante B escolhida pelo Gustavo (LITE + drag-and-drop + agendamento rápido).
- **Arquivos previstos:**
  - `web/app/(app)/agenda/page.tsx` (novo — rota /agenda)
  - `web/components/agenda/MonthCalendar.tsx` (novo — grid 7x6, células, números, cabeçalho)
  - `web/components/agenda/BeatChip.tsx` (novo — chip arrastável com thumb + título + LED de status)
  - `web/components/agenda/AgendaHeader.tsx` (novo — mês + nav + contadores LED)
  - `web/components/agenda/QuickScheduleModal.tsx` (novo — modal abre ao clicar célula vazia, lista beats `ready_for_review`, reuso do `DateTimePicker`)
  - `web/components/Sidebar.tsx` (adicionar item "Agenda" entre "Meus beats" e "Analytics")
  - `web/lib/api.ts` (tipo + chamada `reschedulePost(postId, scheduledAt)`)
  - `api/app/routes/posts.py` (novo endpoint `PATCH /api/posts/{post_id}/reschedule`)
  - `api/tests/routes/test_posts_reschedule.py` (testes do endpoint — bloqueio publicado, RLS, validação data)
  - `web/package.json` (adiciona `@dnd-kit/core` + `@dnd-kit/utilities`)
- **O que fazer:**
  1. Página `/agenda` server-rendered base + client island pro grid. Fetch inicial dos beats do mês via Supabase client.
  2. Grid 7x6 que cobre o mês visível (semana começa no domingo, padrão BR). Dias fora do mês com opacity 0.4.
  3. Cabeçalho mostra mês/ano em font-display, nav prev/today/next, 3 contadores estilo `chip-tech` com LEDs: AGENDADOS (info), NA FILA (warning), PUBLICADOS NO MÊS (success).
  4. Hoje destacado: borda accent + LED pulse pequeno.
  5. Beat agendado vira chip dentro da célula (thumb 24×24 da capa via signed URL, título line-clamp-1, LED da cor do `estadoVisual()` que já existe em `BeatCard.tsx`).
  6. Hover em célula vazia (status `ready_for_review` arrastável OU click): célula ganha accent-line border + ícone "+" central.
  7. Drag-and-drop via `@dnd-kit/core`: chip levanta com `shadow-glow-accent`, drop zone destacada com `accent-muted` + border. Drop atualiza `scheduled_at` via PATCH no backend + otimistic UI.
  8. Click em chip → navega pra `/beats/[id]/review` (já existe).
  9. Click em célula vazia → abre `QuickScheduleModal` com (a) lista de beats `ready_for_review` ainda não agendados, (b) `DateTimePicker` pré-preenchido com data clicada + hora 18:00 (preset do projeto).
  10. Backend `PATCH /posts/{id}/reschedule`: valida ownership via RLS, valida que `post.youtube_video_id IS NULL` (bloqueio T6.11), valida data ≥ now, atualiza `scheduled_at`. 422 com mensagem clara em cada falha.
  11. Sidebar: novo item "Agenda" com ícone `Calendar` do lucide, entre "Meus beats" e "Analytics".
  12. Stagger reveal (`.rise rise-N`) na entrada do grid pra continuar a estética do projeto.
- **Decisão visual:** conceito **"Studio Schedule"** — não copiar o purple do Beatloadr. Usar a paleta Studio Console existente (flame orange accent #ff5a1f, hairlines, LEDs, mono em números de dia e contadores). Direção alinhada com `Sidebar.tsx`, `BeatCard.tsx` e `DateTimePicker.tsx`.
- **Critério de pronto:**
  - Acesso via `/agenda` ou item da sidebar
  - Beats com `scheduled_at` aparecem nos dias certos (timezone local BR)
  - Drag de chip atualiza data e backend recebe PATCH (verificável em network tab + DB)
  - Click em célula vazia abre modal com lista de drafts; agendamento confirmado aparece imediatamente
  - Tentar arrastar beat já publicado → bloqueia (cursor not-allowed + tooltip)
  - `pnpm typecheck` passa
  - `pytest api/tests/routes/test_posts_reschedule.py -v` passa (≥4 testes: ownership, publicado, data passada, sucesso)
  - Build Vercel passa
- **Fora do escopo (V2 / variante C):**
  - Bulk schedule (agendar N beats com regra de allocation)
  - Recorrência ("toda terça às 18h")
  - Recolorir por mood ou estilo
  - View semanal ou diária
- **Estimativa:** ~1 dia (backend 2h + grid+chips 3h + dnd+modal 2h + testes+typecheck 1h)
- **Dependência:** T6.10 (DateTimePicker, ✅), T6.11 (bloqueio publicado, ✅)

#### `[x]` T6.18 — Configurações + Dashboard com novo visual

- **Arquivos:** `web/app/(app)/configuracoes/page.tsx`, `web/app/(app)/dashboard/page.tsx`
- **O que fazer:**
  - Config: `max-w-2xl mx-auto`, seções "Perfil" e "Canal do YouTube" em cards separados `--bg-surface border --border rounded --radius-lg p-6`
  - Config: subtítulo de seção em uppercase muted (estilo Vaulto — "PERFIL DO PRODUTOR")
  - Dashboard: header de boas-vindas com nome do produtor, subtítulo descritivo, card de ação primária "Novo beat" em destaque
  - Dashboard: placeholder cards de métricas (views, beats publicados, agendados) com valores "--" e badge "Em breve" — prepara estrutura pra Fase 2 sem dados reais
- **Criterio de pronto:** Config não tem espaço morto. Dashboard tem cara de produto real, não de página vazia. Typecheck verde.
- **Dependencia:** T6.15

---

### Fase 8 — Onboarding + plano de acao (anti-churn)

Tras o produtor de "instalou e desistiu em 30 dias" pra "passou pelo onboarding, entendeu o processo, gerou primeiro resultado, ficou". Causa-raiz do churn identificada: produtor espera venda em 1-1.5 mes, venda real de type beat leva 2-3 (algoritmo + cadeia de decisao do comprador), nao ve venda, conclui que fracassou e desiste antes da corrente fechar. Plano de acao = bussola que troca o placar pra indicadores que vem ANTES da venda. Memoria: [[project_onboarding_e_plano_de_acao]].

#### `[x]` T8.1 — Onboarding wizard: prototipo visual (5 perguntas + tela tempo economizado)
- **Status:** entregue 2026-05-29 -- typecheck+build verdes. Validacao visual em prod pendente.
- **Objetivo:** Construir a CASCA visual do wizard pra Gustavo ver e iterar antes de partir pro funcional. Sem banco, sem API -- estado client-side. Perguntas em config separado (trocar depois sem mexer no layout).
- **Etapas do wizard:**
  1. Como nos conheceu (single select)
  2. Genero musical que produz (single select, cards)
  3. Loja onde vende beats (single select)
  4. O que quer fazer (multi-select)
  5. Quantos beats posta por dia (single select)
  6. Tela final: tempo desperdicado por semana/ano calculado das respostas, numeros subindo gradualmente, CTA "Vamos la"
- **Arquivos:** web/app/onboarding/page.tsx, web/components/onboarding/OnboardingWizard.tsx, web/components/onboarding/questions.ts (config), web/components/onboarding/CountUp.tsx, web/components/Sidebar.tsx (aba dev), web/.env.local (flag NEXT_PUBLIC_DEV_TOOLS)
- **Direcao visual:** Editorial Mono v3 -- preto, branco protagonista, accent magenta/roxo APENAS nos numeros grandes da tela final + barra de progresso. Sem rosa-de-tudo (Typebeat.fun e referencia de fluxo, NAO de paleta).
- **Acesso dev:** aba "Onboarding" no sidebar atras de flag NEXT_PUBLIC_DEV_TOOLS=true (some sozinho em prod sem precisar deletar). Click navega pra /onboarding full-screen (rota fora do grupo (app), ja listada como protegida no middleware).
- **FORA DO ESCOPO desta task (viram tasks futuras T8.3+):**
  - Botao "resetar onboarding" pra testar redirect de primeiro login
  - Toggle real/mock na geracao de capa
  - Etapas funcionais: upload+BPM real, seletor de capa com fal.ai real, OAuth real
  - Geracao do plano de acao + persistencia em banco
  - Redirect automatico de primeiro login (onboarding_completed flag em profiles)
- **Criterio de pronto:** Gustavo abre /onboarding via aba dev, navega entre as 5 perguntas, escolhe respostas (single+multi), ve barra de progresso, chega na tela final, ve numeros subindo, sente a UX. Typecheck+build verdes. Perguntas em arquivo de config separado (facil swap depois).
- **Dependencia:** nenhuma -- visual puro, sem backend.

#### `[x]` T8.2 — Onboarding wizard: etapa de geracao da 1a capa (MOCK)
- **Status:** entregue 2026-05-29 -- typecheck+build verdes. Validacao visual em prod pendente. Refinamento posterior (2026-06-01): orb trocado pelo padrao do PendingCard de /capas (sem wave-bars + 1 anel orbital), keyframes rotate-slow promovidas pra globals.css.

#### `[x]` T8.3 — Onboarding wizard: etapa de conectar YouTube (MOCK + skippable)
- **Status:** entregue 2026-06-01 -- typecheck+build verdes. Validacao visual em prod pendente.

#### `[ ]` T8.5 — Refinar perguntas do onboarding + arquitetura knowhow .md (pre-Rary)
- **Status:** aguardando -- Gustavo vai pensar nas perguntas primeiro antes de comecar
- **Objetivo:** Preparar a arquitetura pra Rary comecar a produzir conteudo SEM ter retrabalho de schema depois. Decidido em 2026-06-01 que plano usa templates+regras, nao IA -- ver memoria [[project_onboarding_e_plano_de_acao]].
- **Camadas a construir/refinar:**
  1. **Refinar perguntas do onboarding:** `origem` e ruido pro plano (so analytics). `genero` nao ajuda hoje. Faltam perguntas que capturem ESTAGIO direto -- candidata principal: monetizacao atual (nunca vendi / primeiras vendas / regularmente / vivo disso). Gustavo vai pensar e definir.
  2. **`inferProfile(answers)`:** funcao que traduz respostas cruas em `{ estagio: 0-3, temCanal, vendeJa, focoEm, ... }`. Estagios: 0 curioso, 1 postando, 2 vendendo, 3 profissional.
  3. **Schema do frontmatter .md:** definir formato oficial pra Rary escrever em cima:
     - `id, title, category, estimated_minutes, priority, effort`
     - `applies_to: { estagios: [0,1], condicoes: [sem_loja] }`
     - `recomendado_para_objetivos: [vender, crescer-yt]`
  4. **Leitor de .md:** componente que parseia frontmatter + renderiza markdown. Stack: provavel `gray-matter` + `react-markdown` (definir).
  5. **Migrar 1-2 tarefas atuais pra .md** pra validar o leitor end-to-end. Por exemplo `escolher-loja-beats.md` e `precos-licencas.md`.
  6. **Matcher:** substitui o `MASTER_TASKS` hardcoded em actionPlan.ts. Le todos os .md de `web/content/knowhow/`, filtra por profile, ordena por priority.
- **FORA DO ESCOPO (vira T8.6+):**
  - Conteudo educacional dentro dos .md (Rary escreve)
  - UI dos cards visuais bonitos do /plano (course-blog)
  - Persistencia em Supabase com RLS (marcar concluido sync entre dispositivos)
  - Integracao com analytics (mostrar progresso real nas metas)
- **Criterio de pronto:** apos as decisoes de Gustavo: (a) perguntas refinadas no questions.ts, (b) inferProfile com testes, (c) 1-2 .md migrados, (d) leitor de markdown renderizando no /plano. Typecheck+build verdes.
- **Dependencia:** Gustavo pensar nas perguntas + reuniao com Rary alinhar schema do frontmatter.

#### `[x]` T8.4 — Onboarding wizard: tela final de plano de acao ramificado + card no dashboard
- **Status:** entregue 2026-06-01 -- typecheck+build verdes. Validacao visual em prod pendente. **Refinamentos pos-feedback (mesmo dia):** (1) wizard reescrito pra metas (nao mais lista de tarefas) + /plano page + sidebar nav + ActionPlanCard reescrito; (2) fase "gerando plano" adicionada com orb signature (~10s apos ajuste -- 4s era curto demais pra ler); (3) decisao arquitetural templates vs IA (ver memoria). **Refinamento original pos-feedback:** Gustavo apontou que (a) tela do wizard deveria ser POPUP/CARD pequeno e motivacional, nao a lista grande de tarefas detalhadas; (b) tarefas/dicas detalhadas devem viver em ABA dedicada (`/plano` no sidebar com peso baixo); (c) onboarding deve mostrar METAS, nao dicas ("postar 25 beats em 30 dias", "subir CTR", "primeiras vendas") -- estilo treinador, animador; (d) o "trilha" no dashboard ficou meio aleatorio (so 4 tarefas, sem expandir); (e) frase "nao comemore venda no primeiro mes" ficou ambigua/negativa ("da a entender que se sair venda e pra ficar triste kkkk"). Refatoracao: novo conceito Meta (volume/crescimento/vendas/loja/qualidade) em actionPlan.ts com `buildMetas(answers)` (10 metas mestre, max 5 retornadas), PlanRevealStep reescrito pra mostrar SO metas em cards compactos com icones e categoria (NAO mais a lista de 15 tarefas), frase trocada por "essas metas movem o que importa -- quando elas batem, venda vem em sequencia". Nova pagina `/plano` (cliente component) com hero + secao de metas (grid 2 cols) + tarefas detalhadas agrupadas por categoria + footer "em breve conteudo educacional embutido". Sidebar ganha nova secao "Aprender" (eyebrow subtle abaixo de Conta) com item "Plano" (icon Target). Middleware adicionado `/plano` em rotas protegidas. ActionPlanCard no dashboard reescrito pra mostrar SO metas (igual ao card do wizard, compacto) + link real pra `/plano`. Storage estendido pra salvar metas + tarefas juntas com backward-compat pra planos antigos.
- **Objetivo:** Etapa FINAL do wizard (a 08, fechando a sequencia). Mostra a "trilha personalizada" do produtor baseada nas respostas do onboarding -- ramificada de verdade, nao placeholder. Plano salva no localStorage e aparece no dashboard tambem.
- **Visao do feature (acordada com Gustavo 2026-06-01):** o "conteudo educativo" da Fase 3 do roadmap original entra no MVP via plano de acao. Cada tarefa do plano vai eventualmente ter conteudo educacional embutido (T8.6+). Esta task entrega o ESQUELETO -- estrutura ramificada com tarefas reais (titulo + descricao curta), sem conteudo completo dentro de cada uma ainda.
- **Camada de dados (`web/lib/actionPlan.ts`):**
  - 6 categorias: Canal, Loja, Branding, Beats, Vendas, Networking
  - ~15 tarefas mestre com condicao de inclusao por resposta do onboarding (ex: "Crie seu canal" so se `frequencia=zero`, "Escolha sua loja" so se `loja=nao-vendo`)
  - 3 niveis de prioridade: foundation / core / growth (foundation primeiro)
  - Promocao de prioridade baseada em objetivos (ex: tarefa SEO sobe se objetivo inclui `crescer-yt`)
  - `buildActionPlan(answers)` -> array ordenado de ActionTask
- **Persistencia (`web/lib/actionPlanStorage.ts`):** localStorage `beatpost:action-plan` -- sem DB ainda (T8.5 traz Supabase + marcar tarefas concluidas).
- **Tela do wizard (`PlanRevealStep.tsx`):**
  - Header "Sua trilha esta pronta" + frase ramificada baseada no numero de tarefas
  - Card de "reframe do placar" em destaque magenta -- "Nao comemora venda no primeiro mes... mes 1 e 2 voce comemora indicador (CTR, retencao, constancia)". Trabalho nº1 do plano.
  - Tarefas agrupadas por categoria (so categorias com tarefas aparecem)
  - Cada tarefa: numero + titulo + descricao 1-linha + tag de esforco (XS/S/M/L)
  - Salva no localStorage ao montar
- **Card do dashboard (`ActionPlanCard.tsx`):** client component (le do localStorage), retorna null se nao tem plano (usuario sem onboarding feito). Mostra header "Sua trilha · 0/N", barra de progresso, proximas 3 tarefas, contador total. Sem "Ver plano completo" ainda (vira T8.5 com pagina /plano).
- **Integracao dashboard:** secao nova entre Agenda e Proximo passo, header com Sparkles + "SUA TRILHA" (sem numero, pra nao quebrar a numeracao 01/02/03/04 das outras secoes que continuam fixas).
- **Wizard:** totalSteps = questions.length + 4 (results + cover + youtube + plan). Plan step renderiza PlanRevealStep com `answers`. Footer "Finalizar" -> /dashboard. Voltar permitido em qualquer fase do plan.
- **FORA DO ESCOPO (vira T8.5+):**
  - Pagina dedicada `/plano` no app + item no sidebar
  - Persistencia em Supabase (DB schema + RLS) + marcar tarefas concluidas
  - Conteudo educacional dentro de cada tarefa (texto/video/checklist -- vira T8.6+)
  - Redirect automatico de 1o login (`onboarding_completed=true` flag em profiles)
- **Criterio de pronto:** Gustavo completa o onboarding com 2 sets de respostas diferentes (ex: "nunca postou + nao vende" vs "4+/dia + vende em BeatStars") e ve trilhas DIFERENTES sendo geradas. Tarefa "Crie seu canal" aparece pro primeiro mas nao pro segundo. Apos finalizar, o card aparece no dashboard mostrando proximas 3 tarefas. Typecheck+build verdes.
- **Dependencia:** T8.3 ✅
- **Objetivo:** Adicionar a etapa de conectar canal do YouTube ao wizard. MOCK (sem OAuth real). Pulavel via link "Conectar depois" -- se pular vira tarefa nº1 do plano de acao no app.
- **Estrutura (4 sub-fases no mesmo stepIndex):**
  1. **idle** — header com valor da conexao (3 props: upload direto, agendamento, analytics), card de preview das permissoes que o Google vai pedir (transparencia), botao primario "Conectar YouTube" inline com icone, link discreto "Conectar depois - vira tarefa nº1 do plano".
  2. **connecting** — orb padrao (mesmo do CoverStep) com chain de estagios "Abrindo permissoes do Google -> Verificando seu canal" (~1.7s mock).
  3. **connected** — card mock do canal (avatar com inicial, nome "Seu canal", stats "1.2K inscritos · 47 videos", badge ✓ verde), mensagem "Pronto, seu canal ta no piloto".
  4. **skipped** — mensagem suave reconhecendo, lembrete "Conectar YouTube ta esperando como tarefa nº1 do plano de acao", icone clock muted.
- **Componentes novos:** `web/components/onboarding/YouTubeStep.tsx`.
- **Modificacoes:** `OnboardingWizard.tsx` -- totalSteps = questions.length + 3 (results + cover + youtube), youtubePhase + state ja persiste, footer label dinamico mantem padrao ("Continuar"/"Vamos la"/"Finalizar"). Voltar disabled durante connecting.
- **Decisao registrada:** "Conectar depois" e soft gate proposital -- OAuth e o passo de maior friccao do fluxo (cara sai do app, ve tela de permissoes do Google). Forcar conexao antes de ele sentir valor aumenta bounce. Skip vira tarefa nº1 do plano. Bonus: OAuth ainda em modo Testing, so 4 test users conseguem conectar de qualquer forma -- skip nao e opcional, e necessario.
- **FORA DO ESCOPO (vira tasks futuras):**
  - OAuth REAL chamando endpoints `/auth/youtube` ja existentes (T8.5+ depois da verification ou pre-beta)
  - Buscar info real do canal apos conexao (subscriber count, channel name) via YouTube Data API
  - Persistencia do skip na DB pra alimentar o plano de acao (T8.4+ quando construir o plano)
- **Criterio de pronto:** Gustavo completa as 5 perguntas, chega na tela de tempo, vai pra capa, gera, finaliza a etapa de capa, chega na YouTube, ve as 3 value props + permission preview, clica Conectar YouTube -> orb gira ~1.7s -> card do canal mock conectado -> Finalizar leva pro dashboard. Tambem testa o caminho do skip: Conectar depois -> tela de skipped -> Finalizar. Typecheck+build verdes.
- **Dependencia:** T8.2 ✅
- **Objetivo:** Adicionar a etapa de "primeira capa" no wizard apos a tela de tempo desperdicado. MOCK (sem fal.ai real) -- objetivo e validar o FLUXO de UX. Geracao real vira T8.3 depois.
- **Estrutura da etapa (3 sub-fases internas, mesmo stepIndex):**
  1. **Picking** — Grid de 5 artistas validados (Drake/Travis/Weeknd/Fakemink/Nettspend) com mini-preview de cover. Texto "estes sao exemplos, no app voce gera de qualquer artista". Botao "Gerar minha primeira capa" inline (disabled ate selecionar).
  2. **Generating** — Orb morphing centralizado (gradient-primary) + estagios subindo ("Lendo seu estilo -> Montando o brief -> Renderizando -> Finalizando") por ~5.5s. Voltar disabled.
  3. **Done** — Capa mock grande (320px) com headline "Voce fez isso." + teaser pos-resultado nomeando outros artistas (Yeat, Carti, Ken Carson, Lil Baby).
- **Componentes novos:** `web/components/onboarding/coverArtists.ts` (5 artistas + paletas), `web/components/onboarding/MockCover.tsx` (SVG/CSS-based placeholder por paleta), `web/components/onboarding/CoverStep.tsx` (orquestra as 3 fases).
- **Modificacoes:** `OnboardingWizard.tsx` -- totalSteps = questions.length + 2 (results + cover); footer label dinamico ("Continuar" / "Vamos la" / "Finalizar"); back disabled durante generating.
- **FORA DO ESCOPO (viram tasks futuras):**
  - Geracao REAL chamando fal.ai/Claude (T8.3 -- decidir se reusa endpoint /capas ou cria endpoint dedicado de onboarding cover com brief curado + bypass de creditos)
  - Mapeamento gênero (resposta da etapa 02) -> artista validado pra deixar cover "relevante" sem digitar (decisao adiada por Gustavo)
- **Criterio de pronto:** Gustavo abre /onboarding, completa as 5 perguntas, ve tela de resultado, clica "Vamos la", chega na etapa de capa, escolhe um artista, ve o orb girando com estagios subindo, ve a capa mock + headline + teaser, clica "Finalizar" e volta pro dashboard. Typecheck+build verdes.
- **Dependencia:** T8.1 ✅

---

## Historico de chats

- **2026-06-02 (sessao 9 -- setup de ferramentas + T2.15 WAV->MP3)** -- Sessao mista. (1) **Setup:** instalado Supabase MCP (read-only, travado no projeto) + Playwright MCP no Claude Code, ambos custo zero; `claude` adicionado ao PATH do Windows (`~/.local/bin`). MCPs precisam de conversa NOVA pra carregar as tools. Memoria [[project_supabase_mcp_instalado]] criada (token Supabase expira ~2026-07-01). (2) **2 features de upload pedidas pelo Gustavo, viraram tasks T2.15 + T4.44.** (3) **T2.15 ENTREGUE:** aceitar WAV no /upload e converter pra MP3 320k no SERVIDOR (decisao: Opcao B, ffmpeg ja existia). `ffmpeg_service.transcode_to_mp3` (libmp3lame 320k, -vn, SEM loudnorm -- preserva master). `convert.py` detecta nao-MP3, baixa do Storage, transcodifica, sobe `original.mp3`, troca `audio_path`+status numa update, remove WAV SO depois (idempotencia QStash). Frontend (UploadForm): input accept + drop + textos aceitam WAV, path vira `original.wav`. AudioAnalyzeBox ja suportava WAV (decodeAudioData). 4 testes convert verdes (novo caso WAV), typecheck+build verdes. **Pendente:** validar em prod com WAV real + conferir limite de tamanho do bucket `audios` (WAV grande). **Proxima: T4.44.**

- **2026-06-01 (sessao roadmap -- light mode + responsividade mobile adiados pro fim)** -- Sessao SEM codigo no projeto, so decisoes de roadmap + memorias atualizadas. (1) **Light mode:** Gustavo perguntou se da pra fazer; diagnostico mostrou 206 cores hardcoded inline em 37 arquivos (rgba(255,255,255,..) em hovers, rgba(0,0,0,..) em sombras) + sem infra de tema (sem next-themes/data-theme). Base e boa (cores em CSS vars no :root do globals.css). Apresentei pontos cegos honestos: publico dark-native (FL/Ableton/BeatStars/YT Studio escuros = demanda baixa), pre-beta com bloqueadores reais (OAuth/quota/billing), glows roxo/magenta morrem no branco (precisa paleta clara propria), manutencao dobra. Gustavo decidiu adiar pro FIM ("quando a plataforma estiver quase pronta") -- motivo dele: nao quer dobrar manutencao de cada componente novo. Decisao certa pelo motivo certo: fazendo no fim, sobre UI estavel, converte as 206 uma vez so. (2) **Responsividade mobile (web only, sem app):** mesma pergunta. Diagnostico: medio (Tailwind facilita, 51 breakpoints ja em 22 arquivos). 3 focos pesados pro fim: sidebar fixa `w-[260px]` SEM handling mobile ([Sidebar.tsx](web/components/Sidebar.tsx) ~linha 174) -- come 70% da tela de celular, precisa virar hamburger+drawer; ~45 larguras fixas em px (modais minWidth 320, dropdowns 360px); calendario da Agenda + graficos do Analytics precisam ser repensados (nao so empilhados). App shell `layout.tsx` tem `mx-auto max-w-6xl px-8` (px-8 pesado pro mobile). **Contraponto honesto que dei (e Gustavo aceitou):** responsividade != light mode -- esta tecida no layout de cada componente, adiar 100% acumula divida em cada tela nova; adotar **responsive-first habit AGORA** nas telas novas (max-w em vez de px fixo, empilhar com `md:` na hora) custa quase nada e deixa a passada final pequena. Memorias salvas: [[project-roadmap-futuro]] secoes 4 (light mode) e 5 (responsividade) com diagnostico tecnico completo + [[responsive-first-telas-novas]] como feedback durable (toda UI nova nasce responsiva). MEMORY.md atualizado. Sem mudanca no codigo nem em deploy nesta sessao.

- **2026-06-01 (sessao fechamento -- timing 10s + arquitetura knowhow .md decidida)** -- Sessao continua. (1) Gustavo apontou que a fase "gerando plano" tava muito rapida (~4s) -- "nem da tempo de ler". Ajustado pra 10s redistribuindo: lendo respostas 2s, calculando metas 2.8s, montando trilha 3.5s (estagio "core" mais longo), finalizando 1.7s. (2) Pergunta arquitetural fundamental de Gustavo: "como vamos cruzar dados sem IA?" + intuicao certa de "arquivo .md como cerebro do conhecimento". Decisao: arquitetura em 4 camadas (onboarding -> profile -> knowhow .md -> matcher) com .md files servindo como fonte de verdade do conteudo educacional. Frontmatter declara `applies_to: { estagios, condicoes }`. Vantagens: Rary escreve direto em md, zero codigo, versionamento git, fonte de verdade. Custo IA pra plano era $0.0013/plano (barato) mas templates ganharam por qualidade+controle (valor real esta no CONTEUDO de cada card, nao no plano em si). Estagios definidos: 0 curioso, 1 postando, 2 vendendo, 3 profissional. Analise das perguntas atuais: `origem` e ruido pro plano (so marketing analytics), `genero` nao contribui hoje, `loja`/`objetivos`/`frequencia` sao alto sinal. Falta pergunta de monetizacao atual pra capturar estagio direto. Gustavo vai pensar nas perguntas antes de avancar -- T8.5 esbocada e aguardando. Memoria atualizada com arquitetura completa.

- **2026-06-01 (T8.4 refinamento -- metas no wizard + /plano + frase venda corrigida)** -- Pos validacao do T8.4 original, Gustavo deu feedback denso e correto: (1) "no onboarding o plano deve ser via popup ou card... E nao pode ser grande! E nao deve ser de dicas! O primeiro contato deve ser estilo de METAS, pra animar o cliente!" -- com exemplos "postar 25 beats em 30 dias", "aumentar views", "melhorar CTR", "conseguir vendas". (2) Dicas/tarefas detalhadas devem viver em aba dedicada no sidebar com peso menor. (3) Card do dashboard ficou aleatorio (4 tarefas sem expandir) e precisava virar link real pra aba completa. (4) Conceito do feature = "treinador do cliente que vai atualizando com base nos dados". (5) Frase "nao comemore venda no primeiro mes" ambigua/negativa ("da a entender que se sair venda e pra ficar triste kkkk"). Refatoracao: novo type Meta com 5 categorias (volume/crescimento/vendas/loja/qualidade), `buildMetas(answers)` retorna 3-5 metas motivacionais personalizadas, PlanRevealStep reescrito (so metas, menor, frase positiva "essas metas movem o que importa, quando batem venda vem em sequencia"), nova pagina `/plano` com hero + metas + tarefas detalhadas por categoria + footer "em breve conteudo educacional", sidebar ganha secao "Aprender" com item Plano (icon Target), middleware atualizado, ActionPlanCard reescrito pra metas + link real. Storage estendido pra metas+tarefas com backward-compat. Typecheck+build verdes.

- **2026-06-01 (T8.4 -- plano de acao ramificado + card no dashboard)** -- Sessao continua de iteracao do onboarding. (1) Discussao sobre plano de acao: Gustavo revelou visao maior que originalmente desenhada -- queria conteudo educacional COMPREHENSIVE ("tornar esse cara um profissional"), cobrindo qual loja escolher, precificacao, branding, comportamento 1:1 com cliente etc. Dei contraponto honesto: o que ele descreveu nao e mais "plano de acao", e juntar a biblioteca de tutoriais da Fase 3 do roadmap original com o plano de acao do MVP -- pode ser otimo (diferencia muito) mas ele vai precisar PRODUZIR conteudo (quem? ele? Rary? IA + curadoria?). Propus caminho faseado: T8.4 entrega esqueleto visual + ramificacao real; T8.5 traz pagina dedicada + persistencia DB + marcar concluido; T8.6+ traz conteudo educacional dentro de cada tarefa. Gustavo topou. (2) Discussao sobre ramificacao: Gustavo nao entendeu meu primeiro framing, reformulei com exemplos concretos (Pedro nunca postou + nao vende vs Joao posta 2/dia + vende no BeatStars) -- planos diferentes pq cada um entra em ponto diferente da trilha. Concordou. (3) Build T8.4: camada de dados em actionPlan.ts (15 tarefas mestre com shouldInclude + isPriorityFor), actionPlanStorage.ts (localStorage v1 -- T8.5 migra pra Supabase), PlanRevealStep.tsx (tela do wizard com header + card de reframe magenta destacado + tarefas agrupadas por categoria), ActionPlanCard.tsx (card no dashboard, le do localStorage, returns null se sem plano). Wizard atualizado: totalSteps = questions.length + 4 (resultado + capa + youtube + plano), isLastStep agora e isPlanStep, plan step nao tem sub-fases. ActionPlanCard inserido no dashboard entre secao 02 Agenda e 03 Proximo passo, header proprio (Sparkles + "SUA TRILHA" sem numero) pra nao quebrar numeracao. Typecheck+build verdes. (4) **Visao acordada e registrada na memoria:** o "conteudo educativo" da Fase 3 do roadmap vai entrar no MVP via plano de acao -- cada tarefa eventualmente tem conteudo embutido. Por enquanto T8.4 entrega so o esqueleto.

- **2026-06-01 (T8.3 -- etapa de conectar YouTube MOCK + skippable + orb refinement T8.2)** -- Sessao continua de iteracao do onboarding visual. (1) Pos validacao do T8.2, Gustavo apontou que o orb da capa nao batia com o padrao da plataforma; identifiquei o do /beats/[id] e troquei -- ele ainda nao era o certo (tinha wave-bars no centro + 2 aneis); Gustavo enviou print do PendingCard de /capas (durante geracao real de capa) e identifiquei o padrao correto: sem wave-bars + 1 anel orbital. Trocado. Keyframes `rotate-slow` + `rotate-slow-reverse` promovidas pra globals.css -- antes viviam em `<style jsx>` local de /beats/[id]/page.tsx e quebravam silenciosamente no PendingCard de /capas que referenciava sem ter definicao no escopo. (2) Discussao breve sobre proxima etapa: propus upload+BPM antes do YouTube, Gustavo questionou "nao vai contra aquilo que falamos do beat que ele nao quer postar?" -- catch correto, o publish real foi removido mas o principio deeper (nao forcar acao real de produto no onboarding sem payoff claro) se aplica a upload+BPM tambem. Geracao de capa nao precisa do beat (fal.ai usa so o brief), entao upload+BPM ficaria solto sem proposito. Removido da sequencia. Upload+BPM acontecem naturalmente no dashboard no primeiro fluxo guiado. (3) Discussao sobre se "Conectar depois" no YouTube e bom -- ja tinhamos alinhado isso lá atras (soft gate), reforcei o porque: OAuth e o passo de maior friccao, OAuth ainda em testing mode (so 4 test users conseguem conectar de qualquer forma), skip vira tarefa nº1 do plano. (4) Build T8.3: novo YouTubeStep.tsx com 4 sub-fases (idle + connecting + connected + skipped), wizard atualizado (totalSteps = questions.length + 3 = 8 etapas no total agora). Connecting reusa o orb signature da plataforma em tamanho menor. Skipped card editorial dashed comunica "ta esperando voce". Footer "Finalizar" agora dispara em isYoutubeStep + (connected || skipped). Bug pego durante typecheck: `Youtube` icon nao existe em lucide-react 1.14 (versao antiga); troquei por `Tv2` (ja usado em /beats/[id]/review). Replace_all foi agressivo demais inicialmente e renomeou componentes internos -- corrigido com replace_all targetado por nome. Typecheck+build verdes. Memoria [[project-onboarding-e-plano-de-acao]] atualizada removendo upload+BPM da sequencia oficial.

- **2026-05-29 (T8.2 -- etapa de geracao da 1a capa MOCK)** -- Gustavo viu T8.1 em prod e gostou ("ficou otimo"). Pediu pra continuar com a etapa de capa do onboarding. Decisao via discussao breve: MOCK primeiro pra iterar UX rapido (cada iteracao real custaria $0.013 + 30s espera; mock e ~1h de build vs 3-4h pra real com decisoes de arquitetura). Gustavo topou: "pode ser o mock primeiro, mas depois vou testar real tambem". Build: 3 componentes novos em `web/components/onboarding/` -- `coverArtists.ts` (5 artistas validados Drake/Travis/Weeknd/Fakemink/Nettspend com paletas), `MockCover.tsx` (placeholder SVG/CSS com gradient + grão + vinheta + blob de accent + "PROD. by you" no topo e nome do artista + "TYPE BEAT" embaixo, variant preview/full), `CoverStep.tsx` (orquestra 3 sub-fases internas no mesmo stepIndex). Orchestra: Picker tem grid 1/2/3 cols com mini-covers + descritor + dot magenta no selecionado + disclaimer "estes sao exemplos, no app voce gera de qualquer artista" + botao "Gerar capa estilo X" inline; Generating mostra orb morphing centralizado (animate-orb-morph com gradient-primary + blur+pulse atras), estagio atual em font-display com DotPulse, barra de progresso + chain de estagios com check verde nos concluidos (~5.5s mock); Done mostra capa full 340px com glow embaixo + headline "Voce fez isso." + teaser nomeando Yeat/Carti/Ken Carson/Lil Baby/Lil Baby. Wizard atualizado: totalSteps = questions.length + 2 (resultados + cover); estado novo coverPhase + selectedArtistId persistem entre back/forward; footer label dinamico ("Continuar"/"Vamos la" na transicao resultados->capa pra peso emocional/"Finalizar" no Done); Voltar disabled durante generating. **Fora desta task (T8.3):** geracao REAL via fal.ai/Claude (decidir endpoint dedicado de onboarding cover com brief curado + bypass de creditos), mapeamento gênero -> artista validado (Gustavo adiou: "talvez seria interessante mas e meio perigoso, temos que pensar melhor"). Typecheck+build verdes.

- **2026-05-29 (T8.1 -- onboarding wizard visual prototype + sessao de design anti-churn)** -- Sessao extensa de design sobre o que seria conteudo educativo na plataforma. Gustavo iniciou querendo "uma aba de tutoriais" como anti-churn. Reframe atraves da conversa: conteudo passivo (blog/biblioteca) vira feature morta e esquecida; o que segura produtor e plano de acao INTERATIVO ramificado por estagio (tipo Duolingo do produtor). Causa-raiz do churn identificada por Gustavo (validada com experiencia pessoal): produtor espera venda em 1-1.5 mes, venda real de type beat leva 2-3 (algoritmo + cadeia de decisao do comprador), conclui que fracassou e desiste antes da corrente fechar. Plano de acao tem como trabalho nº1 trocar o placar -- comemorar indicadores ANTES da venda (constancia, impressoes, CTR, retencao). Decisoes-chave: trilha unica com ramificacao por estagio (NAO IA por usuario -- custo/consistencia), 1a fase gratis e acionavel + plano profundo pago (mas billing pos-MVP), onboarding em wizard no MESMO layout (so dividido em etapas pra ensinar cada parte), publish real REMOVIDO do onboarding (vira 1o upload guiado depois no dashboard via spotlight), 1a capa do onboarding via seletor curado de artistas validados (Drake/Travis/Weeknd/Nettspend) -- ele CLICA num (preserva posse, mata risco de artista inexistente/typo/nicho de 15 ouvintes), framing "VOCE fez isso" e nao "nossa demo" (demo aumenta ansiedade "sera que EU consigo"). Build T8.1: rota `/onboarding` full-screen fora do grupo `(app)` (ja listada como protegida no middleware), wizard em `web/components/onboarding/` (questions.ts + CountUp.tsx + OnboardingWizard.tsx), aba "Onboarding" no Sidebar atras de flag `NEXT_PUBLIC_DEV_TOOLS=true` (some em prod sem precisar deletar). 5 perguntas (origem, genero, loja, objetivos multi, frequencia) + tela final com 2 numeros count-up animados (semanal em branco + anual em magenta gradient gigante baseado em 20min/upload manual × frequencia × 7 × 52). Editorial Mono v3 estrito -- magenta SO na barra de progresso + 1 numero gigante. Memoria criada: [[project_onboarding_e_plano_de_acao]]. **Fora desta task (vira T8.2+):** toggle real/mock capa, reset onboarding dev button, etapas funcionais (upload BPM real, capa fal.ai real, OAuth real), geracao do plano + persistencia, redirect de primeiro login.

- **2026-05-28 (T4.43 -- custo real por capa no tracker)** — Gustavo viu no dashboard da fal que a geracao da plataforma custava $0.0111 e perguntou por que "tao caro" vs gerar manual ($0.0083-0.0093). Investigacao com 2 chutes errados meus (1: era cache do deploy -- nao era; 2: era o tamanho do prompt -- ele testou com mesmo prompt e continuou diferente). **Causa real do "barato/caro":** nem era diferenca de plataforma -- o `usage_tracker` gravava $0.0083 HARDCODED enquanto a fal cobrava ~$0.0111 real. Confirmado via doc da fal que a resposta do gpt-image-2 devolve bloco `usage` com tokens (input/output detalhados em text/image). Gustavo pediu pra gravar o numero real pra analise. **Entregue:** fal_service ganhou `_cost_from_usage()` que calcula custo pela tabela de preco por token (texto $5/$10, imagem $8/$30 por 1M in/out), grava cost_usd real + tokens_in/out + breakdown completo em api_usage.metadata, fallback $0.0111 + warning se vier sem usage. usage_tracker PRICING fal vira fallback. 5 testes novos (caso tipico 540 txt+272 img = $0.01086 ~ dashboard), suite 57 passed. Licao: parei de teorizar com confianca depois de errar 2x e fui pra fonte empirica (doc da fal + teste do usuario). Conclusao do Gustavo no fim: $0.0111/capa e baratissimo (~90 capas/$1), o tracker so precisava ser preciso pra unit economics.

- **2026-05-28 (T4.42 -- botoes de geracao da /capas)** — Gustavo apontou (com print) que os 3 botoes do header (Gerar 1 capa / Gerar variacao / Gerar 3 variacoes) pareciam fazer a mesma coisa -- todos roxos identicos lado a lado. **Descoberta na investigacao:** "Gerar 1 capa" e "Gerar variacao" eram tecnicamente IDENTICOS -- o `force_variation` que justificaria o "variacao" nunca era enviado (triggerGenerate so logava o intent). E "variacao" e jargao interno: toda capa do mesmo brief ja sai diferente (variation_engine sorteia por seed). **Discussao via AskUserQuestion com previews ASCII** (3 layouts) -- Gustavo escolheu "2 botoes com hierarquia" e depois circulou no print os 2 que sobram, confirmando que devem ser visualmente distintos. **Entregue:** matou "Gerar variacao"; "Gerar 1 capa" = btn-primary roxo c/ Sparkles, "Gerar 3 capas" = btn-ghost outline sem icone (pilula credito muted); rotulo "GERAR DO BRIEF: <nome ativo>" acima dos botoes (resolve "de qual brief"); anti-repeticao SEMPRE ligado (force_variation:true em toda geracao); removido codigo morto intent/confirmIntent; termo "variacao" sumiu da tela (modal idem). Typecheck+build verdes. Skill frontend-design invocada mas mantida consistencia total com Editorial Mono existente (sem estetica nova). Deploy autonomo a partir desta sessao -- Gustavo autorizou push sem perguntar. Memoria salva: [[deploy-autonomo]].

- **2026-05-28 (T4.41 -- nome do brief no modal da capa)** — Gustavo pediu pra exibir o NOME que o produtor deu ao preset no modal da capa (CapaModal), que ja mostrava os tokens do brief (Feng · Underground · Mulher...) mas nao o nome. **Diagnostico:** `cover_library.brief_used` e so um snapshot JSONB do conteudo -- sem nome, sem link com `brief_presets` (tabela que tem id + name editavel). **Pontos cegos levantados (contraponto honesto):** (1) referenciar por snapshot do nome nao propaga rename -> escolhido link por ID; (2) capas antigas nao ganham nome (sem backfill confiavel); (3) preset editado no conteudo (nao so renomeado) faz nome ao vivo divergir dos tokens -- raro, aceito. **Decisao (Gustavo escolheu via AskUserQuestion):** link por ID + nome de fallback, so daqui pra frente. `cover_library` ganhou `brief_preset_id` (FK ON DELETE SET NULL) + `brief_preset_name`. Backend resolve o nome a partir do id (checagem de dono, nao confia no client). Frontend resolve display: preset existe -> nome AO VIVO da lista ja carregada (rename propaga, zero query nova); deletado -> snapshot; sem preset -> so tokens. Migration 023 aplicada por Gustavo. 3 testes novos no worker (link grava / preset alheio nao linka / sem preset nao linka), suite backend 52 passed, typecheck + build frontend verdes. **Validacao visual em prod pendente.** Lição reforcada: a pagina /capas ja carregava todos os presets em memoria -> resolver nome ao vivo foi so um find por id.

- **2026-05-28 (sessao 8 -- T4.40 capa IA: variacao + letterbox)** — Sessao focada em 2 bugs de producao da capa IA, partindo do handoff v4 do Gustavo. **(1) Letterbox:** descoberto que a frase "Thin black letterbox bars on top and bottom" estava literal nas 2 variantes de CAMERA_DNA (o doc v4 so viu a PADRAO; a UNDERGROUND tambem tinha) -> removida das duas; look video-still preservado pelos outros ancoras. **(2) Variacao clonada:** hipotese do Gustavo (mulher sad sempre vira cama+Deftones+poster+notebook) CONFIRMADA por script de verificacao temp -- o Python ja sorteava sub_location variado (seed 1/3=carro, seed 2=quarto) mas o resultado visual era sempre cama, provando que o Claude IGNORAVA o input e copiava o exemplo few-shot literal "Deftones/cama/laptop" do system_prompt elemento 7. **Diagnostico-chave:** chamadas ao Claude sao independentes/sem memoria -> "peca pra variar" nao funciona entre geracoes; so o Python (com seed+historico) garante variacao real. **Solucao (mistura doc v4 + analise):** Claude GERA conteudo (escala), Python SORTEIA (determinismo). Adicionados POSE_POOL (8) + FRAMING_POOL (6) sorteados por seed no variation_engine (pose so com pessoa; anti-repeticao via _available_after_recent nos 3 eixos), sub_location marcada AUTHORITATIVE, exemplo Deftones neutralizado (anti-clone), secao INPUT INTEGRITY obrigando o Claude a obedecer cenario/pose/framing. Rejeitado: Claude sortear via seed (LLM nao deterministico) e remover sub_locations curadas (validadas visualmente). Smoke test sem API verde (5 seeds = 5 combinacoes distintas, sem_pessoa zera pose). **Validacao visual em prod pendente** (sem ANTHROPIC_API_KEY local). **Passo B (anti-repeticao de objetos) adiado** ate validar Passo A. Memoria salva: [[feedback-capa-ia-iterar-ousado]] (Gustavo aceita mudanca experimental pq deploy e reversivel).

- **2026-05-27 (polish de UI pos-T4.39 -- 16 commits)** — Sessao longa de refinamento visual nas telas tocadas pela sessao 7, toda guiada por feedback iterativo do Gustavo via prints. Nenhuma logica core tocada (pipeline/capa IA/youtube/auth intactos). Entregas: **(1) AudioPlayer** evoluiu em 6 commits -- cor roxa+halo magenta, multi-color gradient (azul->roxo->rosa->roxo->azul), pulse cascading, drag-to-seek (pointer events + setPointerCapture, pausa durante drag), ring pulse no botao. Tentou SVG polygon/path bezier organico (referencia do Gustavo) mas REVERTEU pras barras retangulares a pedido dele (`git checkout 1c18c81`). **(2) MediaPreview** -- bug 403 da capa na review: RLS de cover_library bloqueia SELECT direto via supabase-js; criou endpoint backend `GET /beats/{id}/media-urls` (service-role bypassa RLS, gera signed URLs). **(3) Modal CoverPickerExpanded** ("Ver todas" capas) -- 6 iteracoes ate achar root cause: classe `.rise` (transform translateY) na page /upload cria containing block que quebra `position:fixed` do modal; solucao = **React Portal** pra document.body. Tambem: reset scroll no topo via raf+setTimeout. **(4) Larguras padronizadas** -- /upload, /configuracoes, /beats/[id]/review tinham max-w menores que o resto; removido pra todas seguirem max-w-6xl do layout pai. DateTimePicker dropdown ganhou width fixa 360px (esticava com form largo). **(5) Abas /capas reorganizadas** -- removidos SectionLabels "02 CAPAS GERADAS" e "01 BANCO ENVIADAS", botoes (Selecionar/Upload/quota) desceram pra linha dos filtros via prop `trailing` no CoverFilterBar + ManualFilterBar. **(6) Review** -- botao "Salvar" inline no campo de link de venda (atalho do "Salvar edicoes" geral). **(7) anthropic_service** -- linha em branco entre as 2 primeiras linhas da descricao. **(8) AudioAnalyzeBox** -- spinners custom no BPM (escondeu nativos feios), wheel scroll nao propaga pra pagina, MonoSelect custom dark pros campos KEY/SCALE (select nativo abria branco do SO), reset state ao trocar audio. **Lição tecnica chave:** essentia.js exige sample rate 44100Hz -- sem resample, BPM detectava ~8% menor (126->116). Fix via OfflineAudioContext. Bloqueadores pre-beta seguem: OAuth verification + quota YouTube + billing.

- **2026-05-26 (sessao 7 FECHADA -- T4.37+T4.38+T4.39)** — Sessao gigantesca de 3 tasks priorizadas apos analise do concorrente typebeat.fun. T4.38 (~3h reais): AudioPlayer custom com waveform fake hash-deterministica (56 bars envelope senoidal, click pra seek), MediaPreview na review com signed URLs Supabase 1h (layout split capa 120px + player flat), ManualTab CoverPicker substituiu icone+nome por preview grande aspect-square 360px + meta-bar com `filename · size · Done · Replace`. T4.37 evoluiu em 2 iteracoes (Gustavo rejeitou modal multi-select inicial -- "deixa mais simples, layout antigo com botao +"): ArtistComboBox singular inline com search Spotify debounced 300ms + dropdown estados (RECENTES quando vazio, RESULTS Spotify, FALLBACK CUSTOM no fim), chip mode com avatar+nome+X quando selecionado, localStorage `beatpost:recent_artists` max 5 com pre-fill slot 1 no /upload, excludeNames evita duplicata entre slots, error banner amber visivel quando backend falha (antes sumia silencioso -- causa do "Travis Scott nao aparece" da primeira iteracao). T4.39 (mais complexa, ~5h): pacote npm essentia.js tem `require('fs')` no glue Emscripten que Turbopack nao resolve, solucao = carregar via CDN dinamica (script tag) com cache do browser entre sites + tipos proprios em lib/essentia/types.ts; AudioAnalyzeBox encapsula 3 campos (BPM number + KEY select de 12 + SCALE select Major/Minor) + botao Auto-detect com estados idle/loading/done/error visualmente diferenciados; backend POST /beats aceita music_key + music_scale separados com normalize/validate; worker analyze.py noop quando ambos campos ja preenchidos pelo cliente (skip librosa server-side, dispatch direto pro generate); audio_service.py.detect_key retorna 2 campos separados como fallback; anthropic_service aceita music_scale optional + back-compat com strings legacy "A minor". Migration 022 aplicada no Supabase ANTES do deploy (Gustavo "Success. No rows returned"): split music_key em music_key (nota so) + music_scale (Major/Minor) com backfill via regex + CHECK constraint. Bloqueadores pre-beta restantes: OAuth verification + quota YouTube + billing.

- **2026-05-26 (sessao 7 em andamento -- T4.38 entregue)** — Sessao aberta apos Gustavo identificar concorrente forte **typebeat.fun** (BeatStars killer com auto-upload + beat store + 0% comissao + AI Channel Audit + Niche Finder). Analise estrategica em 2 etapas: (1) WebFetch do landing page deles -- posicionamento "The #1 Platform to Sell Beats", $17 Pro / $37 Ultimate com unlimited canais, claims "0+ Producers" placeholder indicando baixa tracao real, founder Daniel Pirisi com Billboard placements. (2) Analise dos prints da plataforma deles (Gustavo gravou tela mas Claude Code nao aceita video -- foi screenshots). 3 tasks priorizadas + 2 backlog: **T4.37** modal Spotify (UX premium, qualquer artista vale -- [[curadoria-nao-e-gating]]), **T4.38** preview audio+imagem (gap real), **T4.39** essentia.js BPM/KEY/SCALE em 3 campos. **Achado tecnico critico:** typebeat.fun usa **essentia.js client-side** (descoberto via DevTools no console: `essentia-wasm.web.js`) -- biblioteca C++ do Music Technology Group de Barcelona portada pra WebAssembly, mesma usada internamente pelo Spotify, AGPL gratis pra DSP classico. Resolve precisao do librosa (~15-20% erro em trap com tripletas) e zera custo de servidor pra analise. Backlog: wizard de onboarding pos-cadastro (com hook "104h/year wasted on manual uploads"), attribution survey. **T4.38 entregue:** `MediaPreview.tsx` busca via Supabase client + signed URLs 1h, renderiza thumb 96x96 + audio HTML5 controls. UploadForm ganhou player apos drop do MP3. ManualTab do CoverPicker substituiu icone+nome por thumb visual real. Build verde 18/18 paginas, sem erro de prerender. Memorias salvas: [[curadoria-nao-e-gating]] (modal Spotify NUNCA bloqueia artista fora da curadoria visual).

- **2026-05-25 (sessao 6 FECHADA)** — Sessao do "beta mvp warm-up". 4 entregas grandes em prod:

  **(1) T4.34 — Estilo de titulo por produtor** (3 commits, 1 hotfix UX): coluna `user_profiles.title_style` (migration 021) com check `default | lowercase`, prompt condicional no anthropic_service + funcao `_apply_title_style` pos-processamento determinstico, /configuracoes ganhou secao com 2 cards "Opcao 1" / "Opcao 2" e botao Salvar DEDICADO da secao (correcao UX -- inicialmente o botao do perfil cobria os dois, Gustavo nao via o salvar).

  **(2) T4.35 — Banco de capas manuais** (3 blocos, 1 hotfix): Bloco 1 backend (`MANUAL_LIMITS` free=5/inter=25/prem=100 acumulado nao mensal, POST /covers/manual_upload + GET /covers/manual_limit, signed URL 1 ano, `ManualQuotaExceededError` propaga 402 amigavel). Bloco 2 UI /capas (segmented switch principal "Geradas"/"Enviadas" trocando o espaco inteiro, ManualUploadModal com react-easy-crop interativo, EnviadasGrid reusa CapaCard, filtros simples Usada/Data). Bloco 3 CoverPicker no /upload (sub-segmented IA/Manual dentro da tab Biblioteca + checkbox "Salvar no meu banco manual" default ON na tab Manual que faz upload imediato + auto-troca pra Biblioteca>Manual com a nova selecionada). **Hotfix critico:** Railway crashou em 2 deploys porque esqueci `python-multipart` no requirements.txt -- FastAPI nao processa UploadFile sem essa dep, crash de STARTUP nao runtime. Memoria salva.

  **(3) T4.36 — Bulk upload + selecionar enviadas:** input multiple no ManualUploadModal, se 1 arquivo abre crop interativo (T4.35 original), se 2+ vai pro fluxo bulk com crop AUTOMATICO center-square (helper `fileToCenterSquareBlob` pega menor lado, centraliza, redimensiona 1024x1024), loop sequencial pra ordem clara + evitar pico de RAM, quota truncada antes do loop ("X enviadas Y ignorados"), per-item status (pending/uploading/success/failed) com check verde ou X vermelho. Botao Selecionar tambem ganhou exposicao no SectionLabel das Enviadas reusando selectionMode + bulk delete existentes.

  **(4) Redesign do BriefSelector** (commit 4d26f06): Gustavo apontou que o brief ativo estava visualmente apagado e parecia secundario aos creditos. Substituido por card editorial protagonista -- nome do brief em font-display 24px (era 14px), LED verde pulsante "ativo" coerente com badge Conectado de /configuracoes, subhead em mono uppercase mostrando `artista_primario · mood` do brief, hairline + CTA explicito "Trocar brief →", estado vazio em amber com headline "Selecione um brief", hover border-purple sutil como unico accent de marca.

  **(5) Operacao:** Rary (raryarco@gmail.com) recebeu tier `internal` via SQL no Supabase pra testar geracao de capas sem trava de creditos. Lembrete: tier internal so remove o gate, NAO cobranca real do fal.ai.

  **Memorias salvas (3):** botao salvar por secao em telas multi-secao [[feedback-botao-salvar-por-secao]], picker preserva selecao pre-existente no preview limitado [[feedback-picker-preview-preserva-selecao]], python-multipart obrigatorio pra FastAPI UploadFile [[feedback-fastapi-uploadfile-multipart]].

  **8 commits pushed:** 2756aeb, aa4644e, ae04718, 72c4347, 118815f, b14b06f, 66cd86d, 4d26f06.

- **2026-05-25 (T4.34 estilo titulo)** — Pedido do Gustavo: produtores se dividem entre dois padroes de titulo no YouTube (default classico `[FREE] A x B type beat "NAME"` vs lowercase gen z `[free] a + b type beat - "name"`). Implementado T4.34 ponta-a-ponta em 4 camadas: migration 021 (coluna `title_style` com CHECK), anthropic_service (prompt condicional + funcao `_apply_title_style` pos-processamento determinstico), generate.py (le do user_profiles e repassa), configuracoes/page.tsx (nova secao Editorial Mono entre Perfil e Canal YouTube, 2 cards com exemplo em mono, salva junto com perfil). Defesa em profundidade contra erro de formato (pedido explicito de Gustavo "esse erro nao pode acontecer"): DB constraint + prompt explicito + Python forca formato no `data['titulo']` antes de retornar. Typecheck verde. Deploy Vercel+Railway disparado, aguarda teste manual em prod.

- **2026-05-25 (sessao 5 FECHADA)** — Sessao gigantesca de melhorias na capa IA: ~17 commits cobrindo 3 blocos paralelos.

  **BLOCO 1 -- Calibragem do prompt v3 em prod (8 commits):** apos teste visual, varios fixes iterativos: (1) MAX_LENGTH validator 3500 -> 6500 -> 8000 (Sonnet 4.6 gerava prompts maiores que o esperado), (2) blocklist BANNED_WORDS/REFERENCES removendo falsos positivos -- "drive" pegava "hard drive"/"night drives"/"driveway", "music video"/"cinematic"/"behind-the-scenes" apareciam nos PROPRIOS prompts validados do Gustavo, (3) image_size square (512x512) em vez de square_hd (1024x1024) -- subia custo 35% sem ganho visual real, (4) preserva prompt_final em capas failed pra debug via SQL, (5) suaviza wardrobe Weeknd removendo "sheer top + lingerie" + handler content_policy_violation amigavel, (6) hair_directives por artista -> regra do GENERO (underground + female = bleached blonde DEFAULT, sem raiz escura), (7) system_prompt v3 reforcado: subject sempre OBSCURO via OR-list literal (proibido descrever olhar/expressao/makeup que forca rosto visivel), wardrobe como OR-list (nao receita fixa que vira clone), setting com 3-5 objetos culturalmente iconicos (posters de Bladee/Drain Gang/Yeat etc., NAO "Blu-Tack ghosts" generico), (8) OPENAI MODERATION GUARDRAILS section -- lista NEVER com 7 categorias de frases proibidas + 5 channels SAFE pra expressar sensualidade (light/atmosphere/setting/posture/wardrobe).

  **BLOCO 2 -- Retry automatico (2 commits):** content_policy_violation tenta retry com safety_mode=True (builder injeta aviso ULTRA-conservador, regenera prompt safe). Universal retry com backoff exponencial pra fal.ai/download/upload em qualquer erro transiente, EXCETO exhausted_balance (Gustavo controla saldo manual). Cliente nao ve mais a maioria das falhas -- so demora mais (~50s vs ~25s) em casos de retry.

  **BLOCO 3 -- Sprint A+B+C de UX (8 features #1-#8):**
    - **Sprint A (4 quick wins):** #2 "Usar em beat" funciona (era console.log TODO -- redireciona /upload?cover_id=X), #5 brief ativo atualiza quando edita+gera brief Y nao-ativo, #6 linha inteira clicavel pra ativar brief no ManageBriefsModal (era so a bolinha), #7 CoverPicker no /upload defaulta pra tab "Biblioteca" (era "Manual").
    - **Sprint B (3 features visuais):** #4 mini orb roxo/magenta rodando dentro do card pending (reusa keyframes do orb principal de /beats/[id]), #3 multi-select com floating toolbar "Apagar X selecionadas" via Promise.allSettled, #1 modal expandido `CapaModal.tsx` ao clicar numa capa -- imagem grande + brief renderizado bonito + 5 estrelas rating clicaveis + acoes (Usar/Download/Descartar). **Migration 020 aplicada em prod:** cover_library.rating SMALLINT CHECK 1-5 + index GIN. Endpoint PATCH /covers/{id}/rating + rateCover() em lib/api.ts.
    - **Sprint C (#8 grid pra muitas capas) -- 3 iteracoes:** v1 fullscreen na /capas (errado, Gustavo queria no /upload), v2 invertido pra filtros INLINE em /capas + picker expansivel `CoverPickerExpanded.tsx` em /upload (max-w-5xl, NAO fullscreen). v3 reformulacao dos filtros: ARTISTA mantem pills (com fontWeight 500 SEMPRE pra zero layout shift) + STATUS/RATING/DATA viram dropdowns coloridos por categoria (verde/ambar pra Status, dourado pra Rating, azul pra Data, roxo pra Artista). Bug fixado: modal "afundava" ao filtrar -- altura agora fixa em `min(720px, calc(100vh-5rem))`.

  **Bug latente descoberto:** GET /covers nunca incluia `status` no select -- frontend usava em filter/CapaCard mas tava undefined (disfarcado porque CapaCard caia em ReadyCard default). Fix incluido + capas pending/failed renderizam corretamente agora.

  **Memorias atualizadas:** `feedback_blocklist_testar_contra_validados` nova (aprendizado: substring match pega palavras inocentes nos validados, sempre testar antes), `project_capa_ia_arquitetura` ja existente mantida.

  Sem mudancas de schema alem da migration 020 (rating).
  Sem mudancas de plano/roadmap -- continua MVP rumo a beta setembro 2026.

- **2026-05-22 (sessao 4 ABERTA)** — DNA v3 da capa IA. Teste visual de Gustavo na aba `/capas` apos deploy da v2 (T4.19-T4.26) produziu capas ruins. Causa raiz: camera "Analog film + 35mm + Canon Sure Shot" gerava estetica cinematografica polida, oposta ao desejado. Gustavo conduziu sessao paralela com Claude normal iterando direto contra fal.ai e validou visualmente 5 briefs (Drake, The Weeknd, Fakemink+Gunnr, Nettspend+2hollis, Travis+Don Toliver). Da sessao saiu `beatpost_handoff_v3.md` com arquitetura nova. ADR `2026-05-22-prompt-dna-capa-v3.md` substitui v2 (preservada como "iteracao 1 superada" no historico). **Mudancas principais v3:** (1) camera DNA passa de "Analog film" pra "video still" (VHS/MiniDV/phone video comprimido, 720x480 letterbox bars), FIXA, em 2 variantes -- padrao calibrado pros 10 generos + agressiva pro underground (com termos "Heavy/blocky pixelation/vertical glitch line/low-bitrate" liberados SO no underground por decisao consciente de Gustavo); (2) estrutura de 7 blocos genericos vira 12 elementos ordenados; (3) sub-locations saem do conceito de "cenario generico" e viram "por artista" -- dicionario `ARTIST_UNIVERSE` com 5 validados (Drake/Travis/Weeknd/Fakemink/Nettspend), Claude sorteia UMA por chamada e expande com riqueza cultural, fallback gracioso pra artistas fora do dicionario; (4) brief perde campo `cenario` (inferido do universo); (5) anti-repeticao via query nas ultimas 5 `variation_seeds` do user; (6) palavras banidas (music video, cinematic, B-roll, director, BTS, scene from, film still) + references banidas (cinematografos Drive/Wong Kar-wai, editorial fashion Vogue/Helmut Newton) vs permitidas (fotografos intimo-coded: Larry Clark, Nan Goldin, Cobrasnake, Hedi Slimane); (7) anti-bias inline (sem asiaticos default, sem gang signs/peace signs em crews). Img2img adiado pra DEPOIS da v3 (Gustavo ainda criando prompts). 7 tasks novas T4.27-T4.33. Arquivos sobreviventes do pacote v2: types.py, sanitizer.py, brief_converter.py, __init__.py. Reescritos na v3: system_prompt/vocabulary/variation/validators/user_prompt/builder. Migration 019 (schema cover_library.variation_seeds JSONB) preservada -- estrutura nova de seeds: `{sub_location_chosen, lighting_setup, optional_details, mood_closer}`. **Aguardando Gustavo mandar 1 brief validado da sessao paralela pra calibrar T4.28 antes de codar.**

- **2026-05-21 (sessao 3 FECHADA)** — Bloco prompt DNA v2 da capa IA 100% entregue. 8 tasks T4.19-T4.26 todas concluidas em 9 commits sequenciais (`7a1f10d` docs + ADR -> `d32caf7` T4.19 -> `9044544` T4.20 -> `5c5dbc8` T4.21 -> `0363603` T4.22 migration aplicada -> `0e96922` T4.23 switch atomico -> `da0d60a` T4.24 wizard -> `24bab9b` T4.25 botao variacao -> commit fechamento T4.26). **Entregue:** pacote modular `api/app/services/cover_prompt_builder/` com 10 modulos (types, system_prompt secreto 9031 chars, vocabulary minimo, variation 7 eixos, sanitizer nota livre, validators 6 checks, brief_converter back-compat, user_prompt template, builder orquestrador, __init__). Brief v2 com 6+2 campos (genero como ancora). Migration 019 aplicada em prod (coluna variation_seeds JSONB + index GIN + funcao de migracao PL/pgSQL temporaria dropada). Wizard CapasWizard reescrito (~720 linhas, 3-step, mantem Editorial Mono). ManageBriefsModal le campos v2 com fallback v1. Botao "Gerar variacao" adicionado no header. CLAUDE.md regra 6 atualizada. Memoria `project_capa_ia_arquitetura` reescrita. **Decisoes da sessao:** brief evoluiu 5 -> 6+2 campos (reversao consciente, genero virou ancora); migracao destrutiva autorizada (Gustavo unico user, mas cobre 3 lugares -- cover_library/user_profiles/brief_presets); opcao `aleatorio` escondida do wizard ate vocabulary v2 entregar matriz scene x light x mood; validador AVOID em warning-mode por 1 semana; script Python `migrate_cover_briefs_to_v2.py` PULADO (SQL puro atomico foi suficiente). **Pre-acao em prod:** 3 presets de teste v1 deletados (Tame Impala/The Weeknd/Drake type 2) antes de rodar migration -- migration rodou contra 0 rows e validacao confirmou via query consolidada. **Pendente pra proxima sessao:** teste real ao Claude rodando 5 briefs canonicos do builder v2 ponta-a-ponta (custo ~$0.07) + vocabulary v2 rico + eval suite + reavaliar AVOID hard-fail. 49 testes pytest verdes + build Next.js 18/18 paginas no commit final. **Sinceridade:** 3 botoes de gerar na mesma linha (Gerar 1 / Gerar variacao / Gerar 3) aumenta carga visual -- avaliar uso real e rebalancear se variacao se mostrar redundante.

- **2026-05-21 (sessao 3)** — Abertura da fase de engenharia de prompt da capa IA. ADR `2026-05-21-prompt-dna-capa-v2.md` complementa o ADR de 2026-05-21 (sessao 2): adiciona principio "Captured, Not Composed" + DNA universal + anti-aesthetics block (6 categorias) + gramatica visual de 7 blocos + sistema de variacao deterministico por 7 eixos sorteados em Python + prompt caching da Anthropic. Brief evolui de 5 campos pros 6+2 campos (genero primario/secundario + artista primario/secundario + quem aparece + mood + cenario + atmosfera de luz + nota livre). Reversao consciente do plano anterior de reduzir pra 3 campos — genero se mostrou o sinal mais informativo da cena de type beat e foi promovido a ancora estetica. T4.6 (prompt base mestre placeholder) fechada como RESOLVIDA via T4.19-T4.26. 8 tasks novas abertas com plano em 8 etapas. **Decisoes fechadas:** opcao `aleatorio` em cenario/luz escondida do wizard ate vocabulary v2 entregar matriz de compatibilidade scene×light×mood; migrations destrutivas autorizadas (Gustavo unico usuario com dados reais — script cobre os 3 lugares: `cover_library` + `user_profiles.default_brief` + `brief_presets`); validador AVOID block em warning-mode por 1 semana antes de virar hard-fail (evita perda de capas boas por capricho de formato enquanto Claude calibra ao prompt novo). Doc de briefing pra sessao paralela com Claude normal: `docs/sessoes/2026-05-21-engenharia-prompt-capa-ia-estado-atual.md`. Etapa 0 (este commit): so docs + tasks, sem codigo ainda.

- **2026-05-21** — **Sessao gigantesca: capa IA do zero ate producao.** ADR `2026-05-21-geracao-de-capa-prompt-base-claude.md` substitui `2026-05-07-geracao-de-capa-mvp.md` (clusters fixos descartados — Gustavo descobriu que prompt base mestre + brief de 1-2 linhas + Claude gera prompts radicalmente especificos pra qualquer artista, validado em 3 testes Drake/Lil Baby/Carti). **Evolucoes de design durante a sessao**: (1) artista virou TEXTO LIVRE (nao FK rigida — milhares de artistas no mundo, todo dia nasce um); (2) brief unico evoluiu pra MULTI-PRESETS nomeados (free 1 / int 5 / premium ∞), gerenciados via modal "Gerenciar briefs"; (3) onboarding free (primeira capa por user e gratuita) — padrao SaaS sério; (4) tier 'internal' adicionado pra dono/time testar sem limite; (5) skeleton refresh-safe via `cover_library.status` (worker INSERT pending → UPDATE ready/failed) — `optimisticPending` local pra feedback IMEDIATO entre click e Realtime. **Backend entregue**: 8 migrations Supabase (011-018), services `fal_service` + `cover_prompt_builder` (com prompt do Lil Baby como placeholder ate T4.6) + `credits_service` + `presets_service`, worker `cover.py` reescrito, endpoints `/covers/*` e `/covers/briefs/*` + `DELETE /covers/{id}` com cleanup de storage. **Frontend entregue**: aba `/capas` com BriefSelector→ManageBriefsModal (dropdown floating tinha bug de stacking, virou modal direto), `CapasWizard` 3-step com edicao por ID, `CapasGrid` com render por status, `CapaCard` (PendingCard + FailedCard + ReadyCard), `CoverPicker` no upload (tab biblioteca + manual, deselect ao clicar de novo, badge "usada"), `ConfirmDialog` BeatPost-style (substituiu window.confirm), `ConfirmGenerateModal` com onboarding free banner. **Bugs UX corrigidos**: modal "Enviando..." preso → UX assincrona; drag de texto fora do modal fechava → mousedown/mouseup ref; download abria nova aba → fetch blob + URL.createObjectURL; descartar capa dava `permission denied` → endpoint DELETE backend. **Decisoes registradas em memoria**: `feedback_modo_trabalho_guiado` atualizada (modo batelada dentro de bloco aprovado), `feedback_evitar_sql_prematuro` nova, `feedback_usar_frontend_design_skill` nova, `project_capa_ia_arquitetura` nova. **Bloqueador unico restante**: T4.6 prompt base mestre (Gustavo vai trabalhar engenharia de prompt na proxima sessao). Commits: 36bb3af (backend), 9c08ca4 (UI aba), f8c5bbf (empty state ajustado), 4fee597 (wizard T4.13), 7e7477f (fix wizard step 1 reset bug), 6a7b29e (botoes funcionando T4.18), d530f83 (realtime + CoverPicker + endpoint /beats), 930d497 (fix UX modal), f3d2639 (brief presets + skeleton refresh-safe — refactor grande), 43a0741 (tier internal + fix visual), 227b6d0 (dropdown vira modal direto), 61dfd8a (4 fixes pos-teste), 6e3e024 (endpoint DELETE), 437d17d (ConfirmDialog + drag fora nao fecha). 17 commits, ~3500 inserções no total da sessao.

- **2026-05-20** — 4 fixes/features pos-redesign Editorial Mono entregues em sequencia. Sessao tambem teve outage do Railway (Major Outage 22:29 UTC do dia anterior + backlog de builds no dia seguinte com sintoma "unconditional drop overload" + "Application not found" no gateway — nao era nosso codigo). (1) **fix agenda drop (640954f):** trocado `rectIntersection` por `pointerWithin` no @dnd-kit (centro do preview detectava celula errada quando chip era largo) + handleDragEnd usa `agora+30min` como default se a data alvo for hoje (antes usava 18h fixo — depois das 18h o drop sumia em silencio porque `novaData < now`). (2) **dashboard greeting (3d23572):** `DashboardGreeting` puxa `user_profiles.nome` via Supabase com fallback pro handle do email + hint "+ adicionar nome de produtor" linkando pra /configuracoes quando fica no fallback. (3) **analytics overview lifetime (c757008):** trocados os 3 KPIs da /analytics (Analytics API com delay 24-48h) por subs/views/videos via `channels.list?part=statistics,snippet` — mesma engenharia da /analytics/beats: cache 5min + botao Atualizar com `force_refresh=true`. Novo endpoint `GET /analytics/channel-overview`, novo service `get_channel_overview_realtime`, novo cache key `realtime:channel-overview`. UI ganha badge "● live" em card fresh (cache miss) + nome do canal no subtitulo. Custo de quota ~zero (1 unit/refresh manual, cache absorve cliques). Timeline grafica continua via Analytics API (unico caminho pra views/dia). (4) **dashboard views consistency (2144fa2):** Gustavo notou 3 numeros divergentes de "views" entre dashboard (390 ult 90d), Visao Geral (231 lifetime) e Meus beats (242 lifetime BeatPost). Diagnostico: Analytics API com janela conta views historicas de videos deletados/unlisted ("fantasmas") — pode dar numero MAIOR que lifetime real. Solucao: dashboard `Views Totais` migrou pra `fetchChannelOverview()` (mesmo endpoint da Visao Geral). Agora bate em 231/231 e compartilha cache de 5min (1 chamada YouTube por 5min mesmo abrindo as 2 paginas). Memoria `project_youtube_data_vs_analytics_api.md` atualizada com a aplicacao concreta. Build 17/17 verde nos 5 commits.

- **2026-05-19 (noite +2)** — Polish em cima do redesign Editorial Mono + novo fluxo pra rascunhos pendentes. Trigger: depois do deploy inicial, Gustavo notou que (a) os cards estavam quase invisiveis sobre o fundo preto puro, (b) a barra de progresso da `/beats/[id]` estava no caminho do orb (que ele queria como protagonista), (c) o widget "Proximas publicacoes" mostrava empty state quando tinha rascunho pendente — confuso pra o usuario que nao entendia onde o beat foi parar, (d) os filtros de /beats estavam genericos demais. Entregue: (1) bg-surface #0A0A0C→#0E0E12 + borders 6%→9% (perceptivel sem perder profundidade); (2) novo token `--border-hover: rgba(199,181,255,0.30)` lavanda sutil pra hover de cards (BeatCard, DashboardStats, ProximasPublicacoesWidget, RascunhosPendentesList); (3) `NeuralConstellation` SVG novo no banner da dashboard — 16 nos pulsantes com hubs glowing + 24 arestas com gradient roxo→magenta, animacoes escalonadas pra dar sensacao de IA processando; (4) filtros de /beats reestilizados estilo Linear/Notion — cada um com icone tematico (Layers/Activity/FileEdit/CalendarClock/CheckCircle2/Archive/AlertTriangle) + cor especifica + glow sutil + contador mono; (5) `RascunhosPendentesList` novo componente com items draggable; `handleDragEnd` em /agenda detecta `event.active.data.current?.isRascunho` e faz `router.push('/review?agendar_em=<ISO>')` em vez de PATCH (forca revisao); `review/page.tsx` le `?agendar_em` da URL com prioridade > scheduled_at > sessionStorage pre_schedule + scroll suave pra `#secao-agendamento`; `ProximasPublicacoesWidget` reestruturado com 3 estados (empty, RascunhosCallout proativo com CTA primary quando so tem rascunho, RascunhosFooter sutil quando tem mix); bug fix em `DashboardStats.emFila` que tinha filtro errado (excluia ready_for_review mas o label dizia "processando ou rascunho"). Build 17/17 verde. Insight: separar "programar na agenda" (DB-only) de "confirmar publicacao" (worker) ja existia desde T6.19, agora se estende pra fluxo de rascunho — arrastar pra um dia eh INTENCAO, nao acao confirmada.

- **2026-05-19 (noite)** — Sessao longa de redesign visual com Gustavo. Trigger: ele nao gostou da direcao "Studio Console" anterior (flame orange + Bricolage) e mandou um manual HTML completo com paleta roxa+magenta+Nohemi+glassmorphism. **3 iteracoes**: (1) primeira leva Neon Studio "everything glass + gradient" — ele rejeitou ("tudo muito azul e magenta, parece banal, cara de IA"); (2) virada pra **Editorial Mono** (preto puro + branco + cinzas legiveis, cor so onde for evento, layout editorial com section labels numerados e hairlines); (3) cacada de laranjas hardcoded em 10 arquivos (`bg-orange-600`, `rgba(255, 90, 31, ...)`, focus laranja, sparklines roxas em analytics/fontes) + redesign da tela `/beats/[id]` "Processando" com orb CSS morphing pulsante (2 halos, 2 aneis dashed rotativos, reflexo branco, wave bars overlay) — depois sessao pingue-pongue de ajustes finos: testamos Spline 3D mas voltamos pro CSS (logo "Built with Spline" obrigatorio no plano gratuito + cores hardcoded no .splinecode), removemos a barra de progresso do orb pra ele virar protagonista, e os `DONE/RUNNING/PENDING` saiu dos steps porque o checkmark ja diz tudo. Tipografia: Bricolage Grotesque fora, Geist como display+body. **Memoria substituida:** `feedback-direcao-visual-studio-console.md` virou `feedback-direcao-visual-editorial-mono.md` (a antiga dizia explicitamente "NUNCA introduzir purple" — Gustavo mudou de visao consciente). Decisao consciente registrada: Gustavo liberou usar preto puro quando fizer sentido (no manual original era proibido). 20 arquivos modificados, ~1500 inserções, ~800 deleções. Build 17/17 verde.

- **2026-05-19 (tarde +1)** — T6.20 concluida apos analise honesta sobre o que mais do Beatloadr valeria copiar tirando bulk. **Descartados:** (A) aceitar WAV/FLAC no upload — Gustavo levantou que MP3-only protege contra roubo do WAV via conversor de video (verdade no caso de exporta-direto, mas confundi: BeatPost converte tudo pra MP3 internamente antes do YouTube. Mesmo assim retirei pelos trade-offs de banda/storage: WAV e 10x maior). (D) Loudnorm — afirmei errado que BeatPost normalizava. Conferi `convert.py:29` e `ffmpeg_service.py:73`: comentario explicito "Nao toca no audio — produtor entrega ja masterizado", o unico re-encode e MP3->AAC pra container MP4 (T5.7). **Decisao consciente** registrada em memory `project_audio_nao_e_normalizado`: nunca propor normalizacao sem perguntar. **Entregues:** (B) Drag-and-drop no UploadForm — botoes de audio e capa aceitam soltar arquivo direto com visual reativo (borda accent + shadow-glow-accent + scale 1.005 + LED pulse + label mono uppercase). Validacao client-side: MP3 only pro audio, JPG/PNG only pra capa. Aviso amarelo transitorio 3.5s se arquivo errado. (C) `ProximasPublicacoesWidget` no dashboard — card entre stats e CTA principal, lista ate 5 proximos beats com `scheduled_at` futuro ordenado por data, "em X dias/horas/min" em mono accent + data formatada, empty state com CTA "Ir pra agenda". Reusa helpers da lib/agenda + useCoverUrl do BeatCard. Build 17/17 verde antes do push (licao da T6.19 aplicada). Commit `2ff27eb`.

- **2026-05-19 (tarde)** — T6.19 concluida apos 6 commits e bastante debug junto. Trigger: Gustavo descobriu o Beatloadr (concorrente direto, ficha em `docs/contexto/concorrentes/beatloadr.md`), viu o calendario mensal deles e quis o equivalente. Sessao de design previa em `docs/sessoes/2026-05-19-calendario-agendamento-design.md` (Variante B escolhida). Entregue: backend `PATCH /posts/{id}/reschedule` + bloqueio 409 se `youtube_video_id` setado (evita 403 scope insuficiente — videos.update precisa de scope `youtube` full); frontend `/agenda` com grid 7x6 estilo Studio Console (flame orange, hairlines, LEDs, JetBrains Mono pros numeros, Bricolage Grotesque pro titulo); drag-and-drop via @dnd-kit; modal `QuickScheduleModal` + atalho `?agendar_em=` pra pre-marcar data ao subir beat. **Insight fundamental do Gustavo:** modal nao precisava disparar worker imediato — separar "programar na agenda" (so DB) de "confirmar publicacao" (worker) faz drag funcionar sem scope full. Rascunho com `scheduled_at` vira chip arrastavel livremente. Bugs cacados durante a sessao: (1) endpoint /beats nao retornava `published_at` nem `youtube_video_id` — contadores zeravam; (2) **gotcha post.status='scheduled' preso** (publish.py nunca revisita esse campo, beats publicados aparecem como 'scheduled' — memory salva); (3) 4 deploys consecutivos do Vercel **falharam silenciosamente** porque `useSearchParams()` no UploadForm precisa de boundary `<Suspense>` no Next.js 16 — `pnpm typecheck` nao pega, so `pnpm build` (memory salva). Polimento visual final aprovado pelo Gustavo: contraste subido, numeros 14px com cor primary, header com LED pulse, contadores LED com divisores verticais e numeros 22px, chips com cadeado 11px em beats no YT. 50 testes backend verdes. Commits: 7460e4f, 09e12a1, 9432b4f, 4598479, df68eae, 6723d7f (fix Suspense), d3a749f (polimento visual).

- **2026-05-19** — T5.7 concluida. Bug "Processamento cancelado" descoberto no teste do Rary (primeiro uso real fora do dev). Logs Railway confirmaram que ffmpeg+upload subiram OK (video_id=AJF3MRJGRFo) mas YouTube recusou processar o arquivo no async (sem webhook de volta — `status` ficou `published` mesmo com video quebrado). Causa: `-c:a copy` colocava MP3 cru em container MP4. Fix: `-c:a aac -b:a 320k` em `ffmpeg_service.py` (re-encoda 1x, perda inaudivel a 320k). Demais flags low-memory mantidas pra nao voltar OOM. Achado paralelo: thumbnail rejeitada com 403 porque canal do Rary nao tem telefone verificado — codigo ja trata em try/except, so precisa avisar. Achado terceiro (pergunta do Gustavo): som baixo no YouTube nao eh nosso pipeline, eh normalizacao -14 LUFS automatica do YouTube, impossivel evitar. Pos-deploy: Rary tem que republicar `ee96c64f` (ready_for_review) pra validar. Doc: `docs/sessoes/2026-05-19-youtube-processamento-cancelado.md`. 39 testes verdes.

- **2026-05-18** — Sessao longa de custos + projecao financeira (detalhes em `docs/sessoes/2026-05-18-custos-e-projecao-financeira.md`). **T3.4 concluida:** `api/app/services/usage_tracker.py` plugado em Gemini/Claude/YouTube. Custo real medido por upload: **$0.014** (so Claude — Gemini deu timeout no Google Search, YouTube e free). 22 testes verdes. Criado `docs/referencias/custos-da-operacao.md` com auditoria completa de plataformas + queries SQL pra consultar gasto por beat. Criado `docs/financeiro/projecao-custos-2026-05-18.html` (HTML standalone) com projecao em tiers $9.99/$19.99, 20 uploads/mes, mix 70/30, breakeven, custo total/user em escala (de $8.23 com 1 user ate $2.25 com 1000). Discutidos pontos cegos honestos: Stripe BR multi-moeda vs Pix recorrente (Asaas) pra brasileiros; YouTube content policy 2026 (alegacao minha sobre BeatValet desmentida — pesquisa real confirmou que automacao via API e OK, mas spam/inauthentic-content policy atinge type beats sem variacao); estado do OAuth verification descoberto durante a sessao (modo Testing — beta abre bloqueado fora dos 4 emails ja cadastrados). Decisoes pendentes registradas: precos finais, billing (Stripe vs Pix), dominio proprio, politica de privacidade, audit OAuth (4-6 semanas), aumento quota YouTube (critico). Gustavo pediu pra fechar essa sessao aqui e na proxima discutir analise de nicho + conteudo educacional (Fase 3 do produto).

- **2026-05-14** — Sessao de planejamento "analise de nicho" (Fase 3 do produto, estilo VidIQ). Pesquisa profunda sobre VidIQ realizada (relatorio com 6 secoes: modelo, captura de dados, metricas, concorrentes, engenharia reversa, especifico de type beat). Descoberta-chave: VidIQ usa as mesmas APIs publicas que nos, moat e clickstream de 20M usuarios com extensao Chrome; volume de busca e ESTIMATIVA (admitido pela propria empresa); concorrente direto pro nicho e OutlierKit ($9-29/mes); custo viavel ($150-700/mes faixa 100-1000 usuarios). Decisao do Gustavo: usabilidade A+C (pagina dedicada + widget dashboard "ideias da semana"), caminho hibrido de fontes de dados (YouTube API + Spotify + autocomplete + Trends), modelo de creditos por tier no billing futuro. Analise de nicho fica como **Fase 3 do produto** apos MVP base fechar. Auditoria do MVP feita: T2.8, T3.2, T6.1, T6.2, T6.3 confirmadas como ja feitas (ledger desatualizado, marcadas [x]). Bloco capa IA (T2.6 parcial, T2.10, T2.11, T4.6-T4.11) PAUSADO — Gustavo estudando abordagem, decisao na proxima semana. Proximas executaveis decididas: T3.4 (usage_tracker centralizado) e T6.4 (README setup 10 passos).

- **2026-05-13** — T6.14→T6.18: redesign visual interface pos-login. Inter + tokens CSS, sidebar redesenhada com grupos/icones, Dashboard no menu, toggle grade/lista em Beats (BeatListRow novo), upload centralizado, config em cards estilo Vaulto, dashboard com metricas placeholder. Skill frontend-design instalada. Proximo: redesign completo com cores Vaulto via /frontend-design na proxima sessao.

- **2026-04-25 15:00** — Sessao fundadora com Gustavo (`MEU-CEREBRO/sessoes/2026-04-25-1500-brainstorm-gustavo-startup-beatmakers.md`)
- **2026-04-25 16:30** — Henrique conduziu plan mode com Claude, gerou plano em `~/.claude/plans/bom-na-verdade-vamos-sorted-lamport.md`. Aprovado. Iniciou Fase 0.
- **2026-04-25 16:45** — T0.1 fechada. 8 arquivos criados, 19 pastas. Estrutura monorepo pronta.
- **2026-04-25 17:00** — T0.2 fechada. Este `_tasks-mvp.md` criado.
- **2026-04-25 17:30** — T0.3 fechada. 14 docs em `docs/` (6 ADRs + 3 contexto + 4 arquitetura + 1 sessao).
- **2026-04-25 18:00** — T0.4 fechada. 9 docs em `docs/referencias/` (Context7 pra Next.js/Gemini/QStash; conhecimento solido pras outras 6). Proximo: T0.5 (Supabase, requer login Henrique).
- **2026-05-11** — T0.5 + T0.6 fechadas. Supabase criado, migrations aplicadas, commit + push pro GitHub (nextsummeer/SaaS-type-beat).
- **2026-05-11** — T0.5 fechada. Supabase project `beatpost-mvp` criado (sa-east-1). 3 migrations aplicadas (tabelas, RLS, storage buckets). IDs atualizados no CLAUDE.md.
- **2026-05-07** — Sessao de produto com Gustavo (`docs/sessoes/2026-05-07-brainstorm-jornada-cliente.md`). Definidos inputs do upload (artista via lista controlada + Spotify, mood via cards visuais) e geracao de capa por IA entra no MVP (fal.ai gpt-image-2, $0.05/imagem, estilo do perfil + mood do beat). 2 ADRs criadas (`2026-05-07-fluxo-upload-e-inputs-do-produtor.md`, `2026-05-07-geracao-de-capa-mvp.md`). Tasks novas adicionadas: T1.7 (onboarding), T2.6-T2.12 (inputs do upload + Spotify), T4.6-T4.11 (curadoria de estilos + capa IA). Regra 6 do CLAUDE.md atualizada.
- **2026-05-11** — T0.7 codigo pronto. web/: Next.js 16 + TypeScript + Tailwind + shadcn/ui (build passando). api/: FastAPI minimo com /health + requirements.txt + Procfile + nixpacks.toml. Aguardando Gustavo configurar Vercel e Railway nos dashboards. T1.1 tambem coberta (setup Next.js completo ja feito aqui).
- **2026-05-11** — T1.2 concluida. Supabase Auth configurado (@supabase/ssr). LoginForm com email/senha + Google OAuth. Callback em /auth/callback. web/.env.local criado (ANON_KEY pendente de preenchimento). Google OAuth pendente de config no Supabase dashboard.
- **2026-05-11** — T1.3 concluida. Middleware web/middleware.ts protege rotas (dashboard, upload, beats, youtube, configuracoes, onboarding). Redirect pra /login se sem sessao. Redirect pra /dashboard se logado tenta acessar /login. Testado e funcionando.
- **2026-05-11** — T1.5 concluida. web/lib/api.ts com healthCheck(). Dashboard mostra API: OK v0.1.0 (verde) apontando pro Railway. CORS funcionando.
- **2026-05-11** — T1.4 concluida. Layout app com sidebar (web/app/(app)/layout.tsx), dashboard vazio (web/app/(app)/dashboard/page.tsx), Sidebar com Upload/Beats/YouTube/Sair (web/components/Sidebar.tsx). Logout funcional. Testado e funcionando.
- **2026-05-11** — T2.1 concluida. web/lib/storage.ts (uploadWithProgress via XHR), web/components/UploadForm.tsx (dropzone audio + capa opcional + progress bar), web/app/(app)/upload/page.tsx. Testado: MP3 3.45MB salvo em audios/{user_id}/{beat_id}/original.mp3 no Supabase Storage. RLS funcionando.
- **2026-05-11** — T1.6 concluida. Playwright instalado (v1.59.1). playwright.config.ts + web/e2e/auth.spec.ts criados. Teste cria user via Supabase admin, faz login, verifica dashboard, desloga, deleta user. pnpm test:e2e passa (1 passed, 22s).
- **2026-05-11** — T2.2 concluida. POST /beats funcionando end-to-end: upload → row em beats (status=uploaded) confirmado no Supabase. Fixes: GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role (permissao faltando), page.tsx raiz redirecionando para /dashboard, ESLint configurado (next lint removido no Next.js 16).
- **2026-05-11** — T2.3 concluida. Decisao de produto: MVP aceita somente MP3 com tag de produtor ja gravada — sem ffmpeg, sem loudnorm (preserva master do produtor). Worker convert.py valida existencia do arquivo no Storage, avanca status uploaded→converted, dispara job analyze no QStash. Upload form atualizado para aceitar so .mp3. qstash_service.py refatorado com funcao _dispatch generica + dispatch_analyze_job adicionado.
- **2026-05-11** — T2.4 concluida. Pagina /beats/[id] com step list (Upload→Conversao→Analise→Geracao→Pronto). Status atualiza em tempo real via Supabase Realtime. Apos upload, UploadForm redireciona automaticamente para /beats/{id}. Pagina de upload ganhou aviso em amber explicando MP3 com tag de produtor.
- **2026-05-11** — T2.5 concluida. 3 testes pytest para worker convert.py: caminho feliz (uploaded→converted + dispatch analyze), idempotencia (converted→skipped), arquivo ausente (→failed 422). Python 3.11 instalado via winget. 3 passed em 2s.
- **2026-05-11** — DECISAO: A/B/C de titulos/videos removido do MVP. MVP publica 1 video por beat (1 titulo, 1 descricao, 1 conjunto de tags). Motivo: maioria dos produtores tem 1 canal, complexidade nao justifica para beta fechado. A/B/C entra na V2. Tasks T4.1-T4.5 e T5.4 precisam ser revisadas para refletir "1 post por beat" na proxima sessao.
- **2026-05-12** — Fase 4 simplificada implementada. T4.1 (anthropic_service), T2.8 (spotify_service), T3.2 (gemini_service), T4.2 (generate.py worker), T4.3 (review page), T4.4 (agendamento), posts.py (GET+PATCH), user_profiles (migration 004 + pagina /configuracoes), UploadForm atualizado (artista obrigatorio + capa obrigatoria). Erro encontrado no primeiro teste real — nao identificado (contexto esgotado). Investigar na proxima sessao. Ver `docs/sessoes/2026-05-12-fase4-generate-review.md`.
- **2026-05-12** — Debug pipeline upload ponta-a-ponta. Fixes: GRANT authenticated em todas as tabelas, campo email_contato no perfil, fallback QStash via thread HTTP, polling 4s na pagina beats/[id], librosa otimizado (60s@22050Hz), bug critico ThreadPoolExecutor no Gemini corrigido (shutdown wait=False), Spotify+Gemini em paralelo, timeout Claude 60s. Teste final pendente. Ver `docs/sessoes/2026-05-12-debug-pipeline-upload.md`.
- **2026-05-12** — T5.1 concluida. OAuth YouTube ponta-a-ponta funcionando: canal "NEXT SUMMER MUSIK" conectado e salvo com refresh_token cifrado via pgp_sym_encrypt. Backend: services/youtube_oauth.py (state HMAC stateless, exchange_code, channels.list com fallback mine/managedByMe, revoke, save via RPC), routes/youtube.py (GET /youtube/auth+callback+me, DELETE /youtube/me). Migration 006: funcoes SQL upsert_youtube_account + get_youtube_refresh_token com SECURITY DEFINER e search_path = public, extensions (essencial pro pgcrypto). Frontend: pagina /youtube com card conectar/desconectar e modal de confirmacao. Scopes: youtube.upload + youtube.readonly (sem readonly, channels.list nao funciona). Gotchas resolvidos durante o setup: (1) ativar YouTube Data API v3 no projeto correto (nao no Default Gemini), (2) pgcrypto vive em schema 'extensions' no Supabase nao em 'public', (3) prompt=consent+select_account pra forcar tela de selecao de conta. T5.2/T5.3/T5.4 (publish.py + upload + mp4) sao os proximos.
- **2026-05-12** — Pipeline funcionando ponta-a-ponta! Fixes adicionais: GRANT service_role nas tabelas (workers usam admin_client), removido `.maybe_single()` (bug postgrest-py 204), try/except amplo nos workers + `_mark_failed` salva error_message, IDEOTAGS reduzidas 80→40-60 + 12-15 tags fortes, max_tokens 4096→6000 e timeout Claude 60s→120s. T2.13 concluida — BPM manual + link da loja no upload (librosa errava 30% dos type beats com tripletas, ex: Travis Scott 140 BPM virou 92). Pipeline em 50s. T2.14 criada (pagina /beats com cards — hoje quebra ao sair de /beats/[id]). Ver `docs/sessoes/2026-05-12-pipeline-funcionando-bpm-manual.md`.
- **2026-05-12** — T2.14 concluida. GET /beats no backend retorna lista do user (RLS multitenant) com merge dos dados do post variacao='A' (titulo, scheduled_at, post_status). Frontend: fetchBeats em web/lib/api.ts + componente web/components/BeatCard.tsx (thumbnail signed URL do bucket covers ou placeholder com inicial, badge de status colorido — Postado/Agendado/Em Rascunho/Processando/Falhou, BPM+key, datas de criacao e modificacao) + pagina web/app/(app)/beats/page.tsx com filtros em chips (Todos/Processando/Rascunho/Agendados/Postados/Falhou) e empty state com CTA pra upload. Polling 5s pra status atualizar conforme pipeline avanca. Clique no card direciona pra /beats/[id] se em processamento ou /beats/[id]/review se pronto/agendado/postado. Typecheck passa. Lint sem erros novos.
- **2026-05-11** — T3.1+T3.3 concluidas. Decisao: librosa substituiu Gemini para analise de audio (gratuito, deterministico, preciso). Detecta BPM e tom (Krumhansl-Kessler). Genero, artistas similares e mood removidos. Worker analyze.py baixa MP3 do Storage, analisa, salva bpm+music_key, avanca status converted→analyzed, dispara generate. T3.2 (tags Gemini) postergado para apos T2.9 (artista disponivel). 3 testes existentes continuam passando.
- **2026-05-12** — T5.2 + T5.3 + T5.4 concluidas (codigo). Pipeline de publicacao no YouTube fechado: `ffmpeg_service.audio_to_mp4` (capa estatica + audio, otimizado `-r 1 -c:a copy`), `youtube_service.upload_video` (google-api-python-client, refresh automatico do access_token, publishAt para agendamento, thumbnail custom em try/except, trunca titulo/desc/tags nos limites do YouTube), `workers/publish.py` (baixa MP3+capa via signed URL, gera MP4, sobe no YouTube, atualiza youtube_video_id/url/published_at no post, idempotente). Migration 007 adiciona `posts.privacy_status` (public/unlisted, default public). PATCH /posts dispara `dispatch_publish_job` quando recebe status='scheduled'. UI da /review tem toggle Publico/Nao listado. Decisoes confirmadas com Gustavo: (a) envia pro YouTube imediato com publishAt no futuro (YouTube agenda), (b) user escolhe visibilidade na review, (c) scheduled_at no passado vira upload imediato (modo de teste). Pendente: aplicar migration 007 no Supabase Studio, garantir env vars no Railway, validar pipeline com upload real. Teste antigo `test_convert_arquivo_ausente_marca_failed` arrumado (esperava `{status:failed}` mas codigo agora salva `error_message` junto). 3/3 testes verdes, typecheck verde.
- **2026-05-13** — T6.13 ajustada: WebGL shader trocado por video MP4 do Adobe Stock como background. Gustavo nao gostou do shader RGB, mandou video 4K (86 MB original, 14s). Comprimido com ffmpeg pra 720p H.264 CRF 28 sem audio → 1.3 MB final (98% reducao, qualidade preservada pra background com blur por cima). Componente `VideoBackground.tsx` com `<video autoPlay loop muted playsInline>` + overlay escuro (55% opacity) pra card glass ficar legivel. three.js desinstalado (economia ~600KB no bundle). Arquivo final em `web/public/auth-bg.mp4`.
- **2026-05-13** — T6.13 concluida. Redesign das paginas de auth com referencia do 21st.dev (NexusGate). Background = WebGL shader RGB animado via THREE.js (nova dependencia). Layout `(auth)/layout.tsx` aplica o shader nas 3 paginas (login + forgot + reset) pra consistencia. Cards glass `backdrop-blur-sm bg-black/50 border border-white/10` flutuam sobre o shader. Adaptacoes: BeatPost + "BUILT BY PRODUCERS. BUILT FOR THE GRIND." (sem emojis gaming), quick access so Google (nao 3 redes). Funcionalidade Supabase 100% preservada (login/signup/Google/esqueci/reset + validacoes + traduzirErro).
- **2026-05-13** — T6.12 concluida. Fluxo "Esqueci minha senha" implementado via Supabase Auth nativo. Link na tela de login → /forgot-password (envia email, mostra confirmacao neutra sem revelar existencia da conta) → user clica link no email → /reset-password (valida sessao recovery, 2 campos com confirmacao + min 6 chars, updateUser, redirect dashboard). Tambem tratado caso de link expirado/usado com CTA pra solicitar novo. Sem mudanca de middleware (rotas livres) nem schema. Dependeu da correcao previa do Site URL no Supabase Dashboard (URL Configuration) feita pelo Gustavo apos socio dele cair em link pra localhost.
- **2026-05-13** — T6.11 concluida. Gustavo notou que beats ja publicados no YouTube ainda mostravam o card "Agendar publicacao" ativo — confirmar de novo geraria upload duplicado. Solucao: detectar `post.youtube_video_id` e (a) substituir card de agendamento por card verde "Publicado no YouTube" (data, link, aviso de Studio), (b) banner amber no topo avisando que edicoes locais nao sincronizam com YouTube. Interface Post expandida com youtube_url/youtube_video_id/published_at. Icone Tv2 (lucide nao tem Youtube). Typecheck verde.
- **2026-05-13** — T6.10 ajustada apos Gustavo notar bug de UX. Antes: `defaultScheduledAt()` inicializava em "Hoje 18h" mesmo pra beats em rascunho — passa impressao de que a plataforma decidiu sozinha. Depois: estado inicia `null`. Picker mostra placeholder "Selecionar data e hora", presets ficam todos inativos, texto neutro "Escolha uma data acima pra publicar", botao "Confirmar agendamento" disabled ate selecionar algo. Se o post ja tinha scheduled_at, carrega normalmente.
- **2026-05-13** — T6.10 concluida. Substituido `<input type="datetime-local">` (feio, nativo, inconsistente) por DateTimePicker custom + presets rapidos. Componente em `web/components/DateTimePicker.tsx` zero-dependency: calendario com nav de mes, time picker 24h, click-fora/ESC pra fechar, tema dark coerente. UX: 5 presets (Agora, Hoje 18h, Amanha 18h, Em 3 dias, Em 7 dias) cobrem 90% dos casos sem abrir picker. Texto humano de confirmacao ("Vai publicar daqui a 4h"). Estado migrado de string pra Date.
- **2026-05-13** — T6.9 concluida. Upload aceita ate 4 artistas em colab. Diagnostico do problema relatado por Gustavo (Carti x Nettspend nao gerou tags individuais): backend tratava string unica → Spotify buscava artista literal inexistente → BEAT_NAME perdia inspiracao + Claude nao gerava tags por artista. Solucao: frontend manda array, backend mantem string composta no DB (compat), worker faz split por ' x ', Spotify usa principal (1o), Gemini usa nome composto, Claude recebe lista + instrucao de tags individuais. Hashtags do template viram dinamicas (`#cartitypebeat #nettspendtypebeat #cartixnettspendtypebeat` em colab). UI: primeiro campo obrigatorio (sem ✕), demais com ✕, botao "+ Adicionar" some no 4o. Dedupe case-insensitive, trim preserva nomes compostos. Sem migration.
- **2026-05-13** — T6.8 concluida. Card "Canal conectado" tinha icone vermelho (referencia YouTube) que passava sinal de erro/alerta. Trocado por icone neutro cinza + badge verde "Conectado" com bolinha pulsante (`animate-ping`). Estado positivo agora le num piscar. Vermelho mantido no empty state (CTA pra conectar) e em erros OAuth (semantica correta).
- **2026-05-13** — T6.7 concluida. Refinamento de UX no campo Instagram apos Gustavo notar `@` aparecendo dentro do valor. Frontend: funcao `sanitizeInstagramHandle` blinda load/onChange/save contra `@` em qualquer posicao, URL colada (`instagram.com/handle`), espacos, emojis. Label "(sem o @)" removida do form (redundante com prefix decorativo). Backend: `anthropic_service.py` agora gera descricao com 2 linhas Instagram — `@handle` solto (texto morto, igual antes) + `📷 https://instagram.com/<handle>` (vira link clicavel quando Recursos Avancados ativados). Email nao mexido. Typecheck verde.
- **2026-05-13** — T6.6 concluida. Gustavo notou durante uso real que `/youtube` e `/configuracoes` eram dois lugares pra "mesma coisa" (perfil do produtor). Unificado: /configuracoes agora tem 2 secoes (Perfil + Canal do YouTube), sidebar reduzida pra 3 itens (Upload/Beats/Configuracoes), callback OAuth do backend (`api/app/routes/youtube.py`) redireciona pra /configuracoes?connected=1, /youtube deletado, middleware atualizado. Decisao consciente de NAO adicionar campos novos (BeatStars/Twitter/TikTok) nesta etapa. T5.5 (quota YouTube) adiada — exige nome da plataforma + dominio proprio + privacy/ToS + auditoria YouTube (4-8 semanas Google), sera retomada quando socio definir nome. Typecheck verde.
- **2026-05-13** — T6.6→T6.13 concluidas (polimento UX pos-uso-real). T6.6: unificou /youtube + /configuracoes, sidebar ficou com 3 itens. T6.7: sanitize Instagram (3 pontos: load/onChange/save) + link clicavel Instagram na descricao YouTube. T6.8: card canal conectado trocou vermelho (erro) por verde de status com animate-ping. T6.9: upload aceita ate 4 artistas colab — frontend manda array, Spotify usa 1o, Gemini usa composto, Claude gera tags por artista. T6.10: DateTimePicker custom zero-dependency com calendario + time picker + 5 presets; estado inicia null (usuario decide, nao a plataforma). T6.11: beats ja publicados mostram card verde "Publicado" + banner ambar, sem mais card de agendamento. T6.12: fluxo esqueci-senha via Supabase Auth nativo (/forgot-password + /reset-password); Gustavo corrigiu Site URL no Supabase Dashboard. T6.13: redesign auth com referencia NexusGate (21st.dev); background = video MP4 Adobe Stock 1.3MB (comprimido de 86MB .mov 4K); cards glass backdrop-blur. Fix critico: button { color: inherit } em globals.css sobrescrevia text-black do Tailwind em dark mode — removido. Investigacao quota YouTube: codigo ja esta no minimo possivel (1650 units/beat), nao ha desperdicio. Ver docs/sessoes/2026-05-13-t66-a-t613-ux-polimento-auth.md.
- **2026-05-12** — T5.2+T5.3+T5.4 testadas em PRODUCAO ate funcionar ponta-a-ponta. 7 bugs resolvidos durante validacao com beats reais (FAVELA DREAM, VAMP SEASON publicados com sucesso): (1) `FileNotFoundError: 'ffmpeg'` — nixpacks declara ffmpeg em nixPkgs mas nao fica no PATH runtime, resolvido com `imageio-ffmpeg` no requirements; (2) `rc=-9` SIGKILL/OOM do ffmpeg em 1920x1080 — libx264 preset veryfast estourava 512MB do Railway free; resolvido com `preset ultrafast + bf 0 + g 1 + profile baseline` (pico <100MB); (3) video caia em Shorts — YouTube classifica <=3min + 1:1 como Shorts automaticamente; resolvido renderizando MP4 em 1920x1080 com pillarbox preto; (4) capa pequena no meio do video — `img.thumbnail()` so faz downscale, capas <1080 ficavam com margem em cima/baixo tambem; resolvido com `img.resize()` forcando altura 1080 sempre (LANCZOS); (5) bug timezone no input `datetime-local` — agendamento de 19:16 BRT reabria mostrando 22:16 UTC; resolvido convertendo UTC↔local no carregar/salvar; (6) card nao virava "Postado" apos publishAt — YouTube nao tem webhook; resolvido tratando no frontend (scheduled+scheduled_at<=now mostra Postado); (7) links externos nao clicaveis na descricao — exige Recursos avancados ativados no canal (verificacao por video selfie), conta de teste estava `Qualificado` mas nao `Ativado`; Gustavo vai fazer a verificacao. UI extra: aviso amber na review quando link `beatstars.com/beat/...` longo (recomenda `bsta.rs/XXX` que cabe na previa truncada do YouTube). Doc completa: `docs/sessoes/2026-05-12-t52-t53-t54-publicacao-youtube.md`.
