# _tasks — [NOME] Fase 1 (MVP) @gustavo

**Criado:** 2026-04-25
**Atualizado:** 2026-05-21 (sessao 2: capa IA infra completa, brief presets, skeleton refresh-safe, tier internal)
**Outcome:** Produtor convidado faz login, conecta canal YouTube, configura brief de estilo padrao na aba `/capas` (multi-presets nomeados, ate N por tier), gera capas reusaveis com IA (prompt base + Claude + fal.ai, ~30s, $0.013), sobe um beat informando artista de referencia + mood, escolhe capa da biblioteca ou envia propria, recebe titulo+descricao+tags geradas pela IA, edita o que quiser, confirma agendamento, e ve video publicado/agendado no YouTube Studio dele. Tudo multitenant via Supabase RLS desde dia 1. Meta: beta fechado setembro 2026.

**Iniciado:** 2026-04-25
**Status:** em-execucao
**Proximo passo:** Capa IA — INFRA 100% PRONTA em producao (Vercel + Railway). 8 migrations Supabase aplicadas (cover_library + status pending/ready/failed, brief_presets, creditos por tier, tier internal). Backend: fal_service + cover_prompt_builder + worker cover (INSERT pending → UPDATE ready/failed) + endpoints /covers/* e /covers/briefs/* + DELETE /covers/{id}. Frontend: aba /capas com BriefSelector → ManageBriefsModal (sem mais dropdown floating), CapasWizard 3-step, CapasGrid com status, ConfirmDialog estilo BeatPost. Bugs UX consertados: skeleton refresh-safe + otimismo local, drag de texto fora do modal nao fecha mais, download via blob, descartar via endpoint backend. **Bloqueador critico unico restante: prompt base mestre (T4.6) — Gustavo vai trabalhar isso na proxima sessao.** Placeholder atual (prompt do Lil Baby) funciona pra testar fluxo, mas qualidade final depende da curadoria dele. Tasks pendentes nao-bloqueantes: T4.11 (teste E2E pytest, backlog), T2.7 (curadoria de artistas obsoleta — virou "banco de aprendizado" futuro). Bloqueadores paralelos: (1) Rary republicar beat `ee96c64f` pra validar fix codec, (2) aumento de quota YouTube, (3) OAuth verification, (4) decisao final billing.
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

#### `[ ]` T4.6 — Curadoria do prompt base mestre (Gustavo, manual)

- **Arquivos:**
  - `api/app/services/cover_prompt_builder.py` (constante `PROMPT_BASE_TEMPLATE` hardcoded)
  - `docs/referencias/prompt-base-capa.md` (criar — anotacoes sobre iteracoes do prompt base + versao atual)
- **O que fazer:** Gustavo finaliza o prompt base mestre. Esse e o **molde estrutural** (analog film + sujeito + setting + lighting + palette + energy + shot on) que sera preenchido pelo Claude em runtime com o brief especifico do produtor.
  1. Iterar prompt base ate funcionar bem em 3-5 briefs de teste diferentes (Drake/sexy, Lil Baby/hood, Drake/agressivo ja validados em 2026-05-21)
  2. Cada iteracao: chama Claude com prompt base + brief curto, valida prompt final, gera capa no fal.ai, julga visualmente
  3. Documentar versoes e razoes em `docs/referencias/prompt-base-capa.md`
  4. Versao final vai hardcoded em `cover_prompt_builder.py`
- **Criterio de pronto:** Prompt base entrega capas radio-ready em pelo menos 5 briefs de teste cobrindo estilos diferentes. Hardcoded no codigo.
- **Dependencia:** —
- **Estimativa:** 3-5 dias de iteracao (muito menor que 1-2 semanas dos clusters antigos).
- **Nota seguranca:** prompt base e receita secreta. Git e privado (apos T0.6 ser privatizado). NUNCA logar prompt base em texto puro. NUNCA expor via endpoint publico.

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

## Historico de chats

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
