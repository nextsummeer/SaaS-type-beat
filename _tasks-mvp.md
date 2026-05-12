# _tasks — [NOME] Fase 1 (MVP) @gustavo

**Criado:** 2026-04-25
**Atualizado:** 2026-05-11
**Outcome:** Produtor convidado faz login, escolhe estilo visual padrao (onboarding), conecta canal YouTube, sobe um beat (qualquer formato) informando artista de referencia (lista controlada + Spotify) e mood (cards visuais), opcionalmente envia capa propria, recebe capa gerada por IA + 3 variacoes A/B/C de titulo+descricao+tags geradas pela IA (com nomes inspirados em hits do artista via Spotify), edita o que quiser, confirma agendamento, e ve 3 videos publicados/agendados no YouTube Studio dele. Tudo multitenant via Supabase RLS desde dia 1. Meta: beta fechado setembro 2026.

**Iniciado:** 2026-04-25
**Status:** em-execucao
**Proximo passo:** Rodar migration `005_store_link.sql` no SQL Editor do Supabase, esperar deploy do Railway, testar upload com BPM manual + link da loja. Se OK: proximo e T5.1 (YouTube OAuth).
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
- Thumbnail gerada baseada em padrao de artista (V2 — capa IA do MVP usa estilo+mood, nao artista)
- A/B/C de capas por upload (V2 — MVP gera 1 capa, regeneracao consome quota)
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
| **Capa** | IA por estilo+mood (fal.ai gpt-image-2 $0.05) **OU** upload manual em todos os tiers. Sem texto, sem nome de artista. | `2026-05-07-geracao-de-capa-mvp.md` (revisa `2026-04-25-capa-manual.md`) |
| **Analise tecnica + tags** | Gemini 2.0 Audio (BPM/key/genero/artistas similares) + Google Search grounding (tags trending). Sem Cyanite, sem banco proprio. Mood NAO vem do Gemini — vem do produtor (cards visuais). | `2026-04-25-gemini-vs-cyanite.md` (refinada em 2026-05-07) |
| **Nome do beat** | IA sugere 3 (formato `[Artista] Type Beat - [Mood]`) com nomes inspirados nos top hits do artista via Spotify API. User escolhe ou edita. | `2026-04-25-3-variacoes-abc.md` + `2026-05-07-fluxo-upload-e-inputs-do-produtor.md` |
| **Input do upload** | Producer informa artista (lista controlada + Spotify normaliza custom) + mood (cards visuais 6 opcoes). IA NAO adivinha. | `2026-05-07-fluxo-upload-e-inputs-do-produtor.md` |
| **Estilo visual** | Producer escolhe 1 dos 6-7 estilos no onboarding (default do canal). Pode trocar por upload. | `2026-05-07-geracao-de-capa-mvp.md` |
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

#### `[-]` T1.7 — Onboarding pos-cadastro: galeria de selecao de estilo visual padrao

- **Arquivos:**
  - `web/app/(app)/onboarding/page.tsx`
  - `web/components/SeletorDeEstilo.tsx`
  - `web/lib/estilos-visuais.ts` (constantes dos 6-7 estilos)
- **O que fazer:** Apos primeiro login, redireciona pra `/onboarding` antes do dashboard. Mostra galeria de cards (1 por estilo visual) com 3 capas exemplo cada, nome criativo + emoji + descricao curta. Producer clica → salva `default_visual_style` na tabela `users` (ou `user_settings`). Skip permitido (default `ghost_mode`). Producer pode mudar depois em `/configuracoes`.
- **Criterio de pronto:** Novo user logado ve onboarding antes do dashboard. Selecao salva no DB. Apos salvar, redirect pra `/dashboard`. Re-login direto vai pro dashboard (nao reabre onboarding).
- **Dependencia:** T1.4 (dashboard), T4.6 (estilos curados — pode comecar com placeholders), T2.6 (migration com `default_visual_style`)
- **Nota de UX:** Formato exato da galeria fica em aberto, Gustavo vai propor versao mais criativa que possa funcionar como gancho de retencao (ver sessao 2026-05-07-brainstorm-jornada-cliente.md).

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

#### `[ ]` T2.6 — Migration: novos campos de input (mood, estilo, artistas)

- **Arquivos:** `supabase/migrations/004_inputs_produtor.sql`
- **O que fazer:**
  - Tabela `artistas_referencia` (id, nome_canonico, spotify_id, popularity, ativo, criado_em). Seed inicial preenchido em T2.7.
  - Tabela `beat_artistas` (beat_id, artista_id, role: 'main' | 'collab') — relacao N:N.
  - Em `beats`: adicionar colunas `mood` (enum sad/aggressive/romantic/dark/energetic/atmospheric, NOT NULL), `cover_source` (enum 'ai' | 'manual', default 'ai'), `visual_style` (text, FK soft pra biblioteca de estilos, nullable — usa default do user se nulo).
  - Em `users` (ou nova `user_settings`): adicionar `default_visual_style` (text, default 'ghost_mode').
  - RLS ligado em `beat_artistas` (via beat → user_id). `artistas_referencia` e leitura publica.
- **Criterio de pronto:** Migration roda limpa. `select * from artistas_referencia` retorna seed. Insert em `beats` exige mood.
- **Dependencia:** T0.5

#### `[ ]` T2.7 — Curadoria inicial: lista de ~80-100 artistas type beat trending

- **Arquivos:** `supabase/seeds/artistas_referencia.sql`
- **O que fazer:** Gustavo cura manualmente lista de 80-100 artistas mais usados em type beats (Drake, Travis Scott, Kendrick, Don Toliver, Future, Carti, Yeat, Lil Baby, Nettspend, Lucy Bedroque, Fakemink, Bladee, Yung Lean, Pop Smoke, Central Cee, Tems, Burna Boy, etc.). Pra cada um: nome canonico + spotify_id (pode ser preenchido via batch script chamando Spotify API).
- **Criterio de pronto:** SQL seed com 80-100 rows valida. Spotify_id preenchido pra >= 90% (alguns artistas underground podem nao ter).
- **Dependencia:** T2.6, T2.8 (precisa do spotify_service pra preencher IDs)

#### `[ ]` T2.8 — Service: spotify_service.py (auth + search + top tracks)

- **Arquivos:** `api/app/services/spotify_service.py`
- **O que fazer:**
  - Client Credentials Flow (env: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`)
  - `search_artist(query: str) -> {name, id, popularity} | None` — primeira correspondencia ou None
  - `get_top_tracks(artist_id: str, market='US') -> list[str]` — titulos das top 10 musicas
  - Cache via Upstash Redis (TTL 7 dias) pra evitar chamadas duplicadas
  - Erro graceful: timeout, rate limit, sem resultado
- **Criterio de pronto:** `search_artist("drake")` retorna nome canonico "Drake". `get_top_tracks("drake_id")` retorna 10 titulos reais.
- **Dependencia:** T0.4 (referencia spotify a criar)

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

#### `[ ]` T2.11 — UI upload: opcao "usar minha propria capa" (toggle)

- **Arquivos:** `web/components/UploadForm.tsx` (atualiza T2.1)
- **O que fazer:** Toggle/radio no form: "Capa: [Gerar com IA] [Enviar minha]". Se "Enviar minha", aparece input file (jpg/png, max 5MB). Se "Gerar com IA", nao aparece input — capa sera gerada no worker. Default = "Gerar com IA".
- **Criterio de pronto:** Toggle alterna corretamente. Upload com cover_source=manual salva capa no storage. Upload com cover_source=ai nao exige capa.
- **Dependencia:** T2.1, T2.6

#### `[ ]` T2.12 — Endpoint POST /beats atualizado: aceitar artistas + mood + cover_source + visual_style override

- **Arquivos:** `api/app/routes/beats.py` (atualiza T2.2)
- **O que fazer:** Atualizar o endpoint da T2.2 para receber `{audio_path, cover_path?, artista_principal_id, colaboradores_ids?, mood, cover_source, visual_style?}`. Validar mood obrigatorio. Validar consistencia cover_source/cover_path. Inserir em `beats` + `beat_artistas`.
- **Criterio de pronto:** POST com todos campos cria row + relacoes corretamente. POST sem mood retorna 400.
- **Dependencia:** T2.2, T2.6

#### `[ ]` T2.13 — Inputs manuais BPM + link da loja no upload

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

#### `[ ]` T3.2 — Service: gemini_service.search_trending_tags (grounded)

- **Arquivo:** `api/app/services/gemini_service.py`
- **O que fazer:** Funcao `search_trending_tags(artistas[]) -> {tags[]}` usando Gemini com tool `google_search`. Prompt pede top tags de YouTube pra cada artista.
- **Criterio de pronto:** Pra `["Drake", "The Weeknd"]` retorna 15+ tags com pelo menos 5 contendo "type beat"
- **Dependencia:** T3.1

#### `[x]` T3.3 — Worker analyze.py orquestra + atualiza beats

- **Arquivos:** `api/app/workers/analyze.py`
- **O que fazer:** Endpoint `/internal/beats/{id}/analyze`. Baixa MP3 do Storage para arquivo temporario, chama audio_service.detect_bpm_and_key, salva bpm e music_key no row, status=analyzed, dispara QStash → generate. Idempotente. T3.2 (tags) postergado para quando artista estiver disponivel (apos T2.9).
- **Criterio de pronto:** Beat convertido → row tem bpm e music_key. Status=analyzed.
- **Dependencia:** T3.1

#### `[ ]` T3.4 — usage_tracker registra cost_usd em api_usage

- **Arquivo:** `api/app/services/usage_tracker.py`
- **O que fazer:** Funcao `track(user_id, feature, tokens_in, tokens_out)` calcula cost_usd e insere em `api_usage`. Chamada nas T3.1 e T3.2.
- **Criterio de pronto:** Apos analyze, `api_usage` tem 2 rows (gemini_audio + gemini_search) com cost_usd > 0
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

#### `[ ]` T4.6 — Curadoria visual: 6-7 prompts mestres de estilo + 3 capas exemplo cada

- **Arquivos:**
  - `api/app/services/estilos_visuais.py` (constantes com prompts mestres)
  - `web/lib/estilos-visuais.ts` (espelho frontend pra galeria)
  - Storage: `public/estilos-exemplo/{slug}/{1,2,3}.jpg` (3 capas exemplo por estilo)
- **O que fazer:** Gustavo cura iterativamente 6-7 estilos visuais (sugestao inicial: Ghost Mode, Midnight Drive, Burn It Down, Nightmare Mode, Golden Hour, VHS Tape, Trap Dreams). Pra cada estilo:
  1. Escreve prompt mestre com sintaxe de variacao (`rotate between scenes`, `alternate palettes`)
  2. Define modificadores por mood (sad/aggressive/etc — ver tabela em `2026-05-07-fluxo-upload-e-inputs-do-produtor.md`)
  3. Gera 5-10 capas de teste com prompt + mood combinations
  4. Valida visualmente (precisa parecer capa real de underground type beat, nao IA-slop)
  5. Salva 3 melhores no storage como exemplo pro onboarding
- **Criterio de pronto:** 6-7 estilos com prompt validado + 3 capas exemplo cada. Documentado em `docs/referencias/estilos-visuais.md` (criar) com nome + slug + descricao + casos de uso.
- **Dependencia:** T4.7 (precisa do fal_service rodando)
- **Estimativa:** 1-2 semanas de trabalho de curadoria visual. **Bloqueante pra fechar Fase 4**.
- **Nota:** NAO tentar gerar prompts mestres via Claude sem validacao visual humana. Capa IA-slop arruina diferencial.

#### `[ ]` T4.7 — Service: fal_service.py (integracao fal.ai gpt-image-2)

- **Arquivos:** `api/app/services/fal_service.py`
- **O que fazer:**
  - SDK `fal-client` Python
  - Funcao `generate_cover(prompt: str, output_path: str) -> {url, cost_usd}` que chama `fal-ai/gpt-image-2`
  - Aspecto 1:1 (capa quadrada YouTube). Resolucao alta (1536x1536+).
  - Retorno inclui custo registrado ($0.05/imagem).
  - Erro graceful: timeout, rate limit, conteudo bloqueado.
- **Criterio de pronto:** Funcao com prompt teste retorna URL valida. Imagem baixada bate aspecto e resolucao.
- **Dependencia:** T0.4 (referencia fal.ai a criar)

#### `[ ]` T4.8 — Worker cover.py: gera capa via IA

- **Arquivos:** `api/app/workers/cover.py`
- **O que fazer:** Endpoint `/internal/beats/{id}/generate_cover`. State machine:
  - Checa `beats.cover_source`. Se `manual`, marca `cover_status='ready'` e retorna (idempotente).
  - Carrega beat + user data. Determina estilo: `beats.visual_style` (override por upload) ou `users.default_visual_style`.
  - Carrega prompt mestre do estilo + modificador do mood.
  - Monta prompt final (com variacao de cena, paleta, etc).
  - Chama `fal_service.generate_cover()`.
  - Salva imagem em `covers/{user_id}/{beat_id}/cover.jpg` (Supabase Storage).
  - Atualiza `beats.cover_url` e `cover_status='ready'`.
  - Chama `usage_tracker.track(user_id, 'cover_generation', cost_usd=0.05)`.
- **Criterio de pronto:** Beat com mood=sad + estilo=ghost_mode → capa gerada salva em storage. `api_usage` registra custo. Idempotente: re-execucao nao gera nova capa se ja existe.
- **Dependencia:** T4.6, T4.7, T2.6

#### `[ ]` T4.9 — Worker generate.py dispara cover.py em paralelo

- **Arquivos:** `api/app/workers/generate.py` (atualiza T4.2)
- **O que fazer:** Apos generate.py criar 3 posts e marcar `status=ready_for_review`, **se `cover_source='ai'`**, dispara QStash → `cover.py`. Em paralelo, nao bloqueante. UI mostra placeholder "Gerando capa..." enquanto isso.
- **Criterio de pronto:** Apos generate, se cover_source=ai, job aparece no QStash apontando pra cover.py. Se cover_source=manual, nao dispara.
- **Dependencia:** T4.2, T4.8

#### `[ ]` T4.10 — UI: preview da capa + botao "regerar"

- **Arquivos:** `web/components/CapaPreview.tsx`, atualiza `web/app/(app)/beats/[id]/page.tsx`
- **O que fazer:** Na tela de review, mostra capa gerada (ou placeholder loading se ainda processando). Botao "Regenerar capa" (icone refresh) chama `POST /api/beats/{id}/regenerate-cover`. Endpoint dispara cover.py de novo (cost: $0.05 + 1 da quota futura). Atualiza preview ao vivo via Supabase Realtime.
- **Criterio de pronto:** Tela de review mostra capa quando pronta. Click em regenerar gera nova capa em ~10s. usage_tracker registra cada regeneracao.
- **Dependencia:** T4.8, T4.3

#### `[ ]` T4.11 — Test: pipeline com capa IA ponta-a-ponta

- **Arquivos:** `api/tests/integration/test_cover_pipeline.py` (marker `@slow`)
- **O que fazer:** Cria user fake, sobe beat sem capa custom, mood=dark, estilo=midnight_drive. Valida que: capa foi gerada, salva no storage, `api_usage` tem row, `beats.cover_status='ready'`.
- **Criterio de pronto:** Test `@slow` passa.
- **Dependencia:** T4.8

---

### Fase 5 — YouTube OAuth + postagem (Gustavo executa)

> **Por que:** o passo final do MVP. Sem isso o beatmaker nao tem entrega real. Esta fase libera o piloto com Gustavo.

#### `[ ]` T5.1 — OAuth YouTube: rotas auth + callback

- **Arquivos:** `api/app/routes/youtube.py`, `web/app/(app)/youtube/connect/page.tsx`, `web/app/api/youtube/callback/route.ts`
- **O que fazer:**
  - `GET /api/youtube/auth` — gera URL OAuth e redireciona
  - `GET /api/youtube/callback` — recebe code, troca por tokens, salva em `youtube_accounts` (refresh_token via `pgp_sym_encrypt`)
  - Pagina `/youtube/connect` com botao "Conectar canal"
- **Criterio de pronto:** Beatmaker clica conectar → autoriza no Google → volta logado com canal. Row em `youtube_accounts` salva.
- **Dependencia:** T0.5, T1.4

#### `[ ]` T5.2 — Service: youtube_service.upload_video

- **Arquivo:** `api/app/services/youtube_service.py`
- **O que fazer:** Funcao `upload_video(user_id, mp4_path, title, description, tags, scheduled_at) -> youtube_video_id`. Refresh token automatico se expirado. Define `publishAt`. Tenta thumbnail custom (catch 403).
- **Criterio de pronto:** Funcao com mock retorna video_id. Com integration test real (`@slow`) publica em conta de teste.
- **Dependencia:** T5.1

#### `[ ]` T5.3 — Service: ffmpeg_service.audio_para_video

- **Arquivo:** `api/app/services/ffmpeg_service.py`
- **O que fazer:** Funcao gera mp4 com `ffmpeg -loop 1 -i capa.jpg -i beat.mp3 -c:v libx264 -preset fast -crf 23 -r 30 -pix_fmt yuv420p -c:a aac -shortest output.mp4`
- **Criterio de pronto:** Beat de 3min vira mp4 ~50MB com capa estatica + audio
- **Dependencia:** —

#### `[ ]` T5.4 — Worker publish.py: gera mp4 + upload 3x

- **Arquivos:** `api/app/workers/publish.py`
- **O que fazer:** Endpoint `/internal/beats/{id}/publish`. Para cada post da variacao A/B/C:
  - Chama T5.3 pra gerar mp4 (cacheia, mesmo mp4 pra 3 uploads)
  - Chama T5.2 com titulo/desc/tags/scheduled_at especifico
  - Salva `youtube_video_id` na row
  - Status=published
- **Criterio de pronto:** Apos confirmar agendamento, 3 videos aparecem agendados no YouTube Studio com horarios diferentes
- **Dependencia:** T5.2, T5.3, T4.4

#### `[ ]` T5.5 — Solicitar quota YouTube no Google Cloud Console

- **O que fazer:** Quota default de 10k/dia limita a 6 uploads/dia/projeto. Solicitar 100k/dia via formulario Google Cloud (aprovacao auto pra usos legitimos).
- **Criterio de pronto:** Quota expandida visivel no console
- **Dependencia:** T5.1 (precisa do OAuth funcionando como evidencia)

#### `[ ]` T5.6 — Test E2E: postar 1 beat real em conta de teste

- **Arquivo:** `api/tests/integration/test_full_pipeline.py` (marker `@slow`)
- **O que fazer:** Cria user fake, conecta canal de teste (preconfigurado), upload beat, valida 3 videos no YouTube Studio
- **Criterio de pronto:** Pipeline ponta-a-ponta passa
- **Dependencia:** T5.4

---

### Fase 6 — Polimento dashboard + handoff (Gustavo executa)

> **Por que:** beta privado precisa estar minimamente apresentavel. Empty/error/loading states + convites.

#### `[ ]` T6.1 — Dashboard lista beats com status + thumb + canal

- **Arquivos:** `web/app/(app)/dashboard/page.tsx`, `web/components/BeatCard.tsx`
- **O que fazer:** Server component lista beats do user (RLS faz isolamento). Cada card: thumb da capa, titulo (variacao A), status, canal, data
- **Criterio de pronto:** 3 beats criados → 3 cards corretos. Outro user nao ve.
- **Dependencia:** T4.2

#### `[ ]` T6.2 — Pagina /beats/[id] mostra 3 links YouTube + agenda

- **Arquivos:** `web/app/(app)/beats/[id]/page.tsx`
- **O que fazer:** Apos publicar, pagina mostra 3 cards com link YouTube clickavel, data agendada, status (agendado/publicado)
- **Criterio de pronto:** Clica no link → abre video no YouTube
- **Dependencia:** T5.4

#### `[ ]` T6.3 — Empty state + error state + loading state em todas as paginas

- **Arquivos:** todas as paginas web + componentes shadcn `Skeleton`, `Alert`
- **O que fazer:** Cada pagina com fetch tem 3 estados visualmente distintos
- **Criterio de pronto:** Throttle de rede no devtools mostra loading. Forcar erro 500 mostra alert. User sem beats ve empty illustration.
- **Dependencia:** T6.2

#### `[ ]` T6.4 — README.md guia de setup local em 10 passos

- **Arquivo:** `README.md`
- **O que fazer:** Reescrever README atual com 10 passos numerados que beatmaker tecnico consegue seguir sem ajuda. Incluir troubleshooting de ffmpeg e Supabase local.
- **Criterio de pronto:** Pessoa nova clona, segue, tem app rodando local em <30 min
- **Dependencia:** T6.3

#### `[ ]` T6.5 — Convidar Gustavo no Supabase + Vercel + Railway + GitHub

- **O que fazer:** Add Gustavo como collaborator nos 4 servicos. Compartilhar `.env` real via 1Password Family ou similar (NUNCA por chat).
- **Criterio de pronto:** Gustavo confirma acesso aos 4 dashboards
- **Dependencia:** T6.4

---

## Historico de chats

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
- **2026-05-11** — T3.1+T3.3 concluidas. Decisao: librosa substituiu Gemini para analise de audio (gratuito, deterministico, preciso). Detecta BPM e tom (Krumhansl-Kessler). Genero, artistas similares e mood removidos. Worker analyze.py baixa MP3 do Storage, analisa, salva bpm+music_key, avanca status converted→analyzed, dispara generate. T3.2 (tags Gemini) postergado para apos T2.9 (artista disponivel). 3 testes existentes continuam passando.
