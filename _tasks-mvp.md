# _tasks — BeatPost MVP @gustavo ate 30 dias

**Criado:** 2026-04-25
**Outcome:** Beatmaker convidado faz login, conecta canal YouTube, sobe um beat (qualquer formato) + capa, recebe 3 variacoes A/B/C de titulo+descricao+tags geradas pela IA, edita o que quiser, confirma agendamento, e ve 3 videos publicados/agendados no YouTube Studio dele. Tudo multitenant via Supabase RLS desde dia 1. Cobranca na unha pelos primeiros 10 pagantes.

**Iniciado:** 2026-04-25
**Status:** em-execucao
**Proximo passo:** T0.5 — criar Supabase project + aplicar 3 migrations (depende de login Henrique)
**Tags:** beatpost, gustavo, mvp, saas, multitenant, supabase, nextjs, fastapi, gemini, youtube

## Contexto

Gustavo (cunhado, irmao da Marcella, comecando programacao) ja tem um fluxo n8n que automatiza postagem de type beats no YouTube. Vamos formalizar em SaaS web seguindo a stack default do Henrique (Python + Next.js) com Supabase pra acelerar auth+db+storage.

Sessao fundadora: `MEU-CEREBRO/sessoes/2026-04-25-1500-brainstorm-gustavo-startup-beatmakers.md`
Plano original: `~/.claude/plans/bom-na-verdade-vamos-sorted-lamport.md`

3 alertas que vem da sessao fundadora e atravessam todas as fases:

1. **Gustavo ainda nao usou a propria ferramenta** (sec 11.1) — MVP precisa ser dogfoodavel ate Fase 5. Ele e o primeiro beta tester.
2. **Diferencial real e A/B/C** (sec 11.10) — nao e automacao generica de postagem. Quem nao bate isso vira commodity.
3. **Beatmaker underground tem resistencia emocional ao marketing**, nao falta de ferramenta (sec 11.2). Nao prometer milagre. MVP entrega operacao automatizada, nao entrega coragem.

## Recorte (o que esta FORA)

- Multi-canal YouTube (V2)
- Billing Stripe (apos 10o pagante)
- Metricas YouTube Analytics (V2)
- Banco proprio de tags trending (V3 — se Gemini grounded falhar)
- Geracao de capa por IA (V2)
- Thumbnail por padrao de artista (V2)
- Multi-tenant workspace / time (V3)
- TikTok / Instagram (nunca neste projeto)
- Mobile app (nunca neste projeto)

## Decisoes fechadas

| Tema | Decisao | ADR |
|---|---|---|
| **Stack** | Next.js 15 + FastAPI + Supabase + QStash + Gemini + Claude + ffmpeg + YouTube Data API v3 | `2026-04-25-stack.md` |
| **3 postagens** | A/B/C no mesmo canal (mesmo MP3, titulos/tags/agenda diferentes) | `2026-04-25-3-variacoes-abc.md` |
| **Multi-canal** | Fora do MVP. 1 canal por user. V2 expande. | `2026-04-25-3-variacoes-abc.md` |
| **Multitenancy** | Supabase RLS desde dia 1 em TODAS as tabelas com `user_id` | `2026-04-25-multitenancy-rls.md` |
| **Capa** | Manual (user faz upload). Geracao IA fica pra V2. | `2026-04-25-capa-manual.md` |
| **Vibe + tags** | Gemini 2.0 Audio + Google Search grounding. Sem Cyanite, sem banco proprio. | `2026-04-25-gemini-vs-cyanite.md` |
| **Nome do beat** | IA sugere 3 (formato `[Artista] Type Beat - [Mood]`), user escolhe ou edita | `2026-04-25-3-variacoes-abc.md` |
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

#### `[ ]` T0.5 — Criar Supabase project + aplicar migrations

- **Arquivos:**
  - `supabase/migrations/001_initial_schema.sql` (tabelas)
  - `supabase/migrations/002_rls_policies.sql` (policies)
  - `supabase/migrations/003_storage_buckets.sql` (buckets + policies)
  - `supabase/config.toml`
- **O que fazer:** Criar projeto na regiao `sa-east-1`, aplicar migrations, salvar IDs no `CLAUDE.md`, criar buckets `audios` e `covers` privados
- **Criterio de pronto:** `select * from beats` retorna vazio (RLS em vigor); upload via signed URL funciona end-to-end
- **Dependencia:** T0.3 (precisa do schema definido em arquitetura)

#### `[ ]` T0.6 — `git init` + commit inicial + criar repo GitHub + push

- **O que fazer:** `git init`, primeiro commit `chore: scaffolding inicial BeatPost`, `gh repo create HENRIQUE4345/beatpost --private --source=. --push`
- **Criterio de pronto:** `gh repo view HENRIQUE4345/beatpost` mostra repo. Push de `master` ou `main` ok.
- **Dependencia:** T0.5 (pra commitar com migrations dentro)

#### `[ ]` T0.7 — Configurar Vercel (web/) + Railway (api/)

- **O que fazer:**
  - Vercel: importar repo, root directory = `web/`, framework Next.js, env vars do `.env.local`
  - Railway: importar repo, root = `api/`, buildpack Python, ffmpeg via apt buildpack, env vars
  - Sem deploy real ainda — so webhooks ligados, build vazio passa
- **Criterio de pronto:** Vercel mostra build hello-world. Railway mostra `/health` retornando 200.
- **Dependencia:** T0.6

---

### Fase 1 — Auth + dashboard vazio (Gustavo executa)

> **Por que:** sem auth, qualquer feature seguinte vira inseguranca multitenancy. Comeca pelo basico — login, route guard, layout.

#### `[ ]` T1.1 — Setup inicial Next.js + Tailwind + shadcn/ui

- **Arquivo:** `web/`
- **O que fazer:** `pnpm create next-app web --typescript --tailwind --app`. Instalar shadcn/ui (`npx shadcn@latest init`). Configurar paths, alias `@/`.
- **Criterio de pronto:** `pnpm dev` em `web/` mostra pagina inicial Tailwind funcionando
- **Dependencia:** T0.7

#### `[ ]` T1.2 — Login Supabase Auth (email + Google)

- **Arquivo:** `web/app/(auth)/login/page.tsx` + `web/lib/supabase/{client,server}.ts`
- **O que fazer:** Componente `<LoginForm />` com Supabase Auth UI (`@supabase/auth-ui-react`). Provider Google habilitado no Supabase dashboard. Callback em `/auth/callback`.
- **Criterio de pronto:** Login com email/Google redireciona pra `/dashboard`
- **Dependencia:** T1.1

#### `[ ]` T1.3 — Middleware Next.js — redirect se nao autenticado

- **Arquivo:** `web/middleware.ts`
- **O que fazer:** Middleware checa cookie Supabase, redireciona pra `/login` se rota for `(app)/*` e nao tiver sessao
- **Criterio de pronto:** Acessar `/dashboard` sem login → redireciona pra `/login`. Com login → carrega.
- **Dependencia:** T1.2

#### `[ ]` T1.4 — Dashboard vazio + sidebar (Upload, Beats, YouTube, Sair)

- **Arquivos:** `web/app/(app)/layout.tsx`, `web/app/(app)/dashboard/page.tsx`, `web/components/Sidebar.tsx`
- **O que fazer:** Layout com sidebar fixa esquerda 240px + conteudo. 4 itens. Logout chama `supabase.auth.signOut()`.
- **Criterio de pronto:** Logado, ve sidebar. Clicar Sair desloga e volta pra `/login`.
- **Dependencia:** T1.3

#### `[ ]` T1.5 — API: `/health` endpoint + integracao web→api

- **Arquivos:** `api/app/main.py`, `api/app/routes/health.py`, `web/lib/api.ts`
- **O que fazer:** FastAPI app com CORS configurado. Rota `GET /health` retorna `{ok: true, version}`. Web chama no boot do dashboard.
- **Criterio de pronto:** Dashboard mostra "API: OK" no canto. CORS nao bloqueia.
- **Dependencia:** T1.1

#### `[ ]` T1.6 — Test E2E: login → dashboard → logout

- **Arquivos:** `web/e2e/auth.spec.ts`
- **O que fazer:** Playwright cria user fake via Supabase admin, faz login, verifica dashboard, desloga
- **Criterio de pronto:** `pnpm test:e2e` passa
- **Dependencia:** T1.4

---

### Fase 2 — Upload + conversao MP3 (Gustavo executa)

> **Por que:** primeiro fluxo real ponta-a-ponta. Web faz upload, backend converte, status atualiza ao vivo.

#### `[ ]` T2.1 — UI de upload com progress bar

- **Arquivos:** `web/app/(app)/upload/page.tsx`, `web/components/UploadForm.tsx`
- **O que fazer:** Form com 2 inputs (audio, capa). Upload direto pro Supabase Storage via signed URL (nao passa pelo backend). Progress bar real.
- **Criterio de pronto:** Upload de WAV de 10MB mostra progress de 0 a 100%, salva no bucket `audios/{user_id}/{beat_id}/original.wav`
- **Dependencia:** T0.5, T1.4

#### `[ ]` T2.2 — Endpoint POST /beats que cria row + dispara QStash

- **Arquivos:** `api/app/routes/beats.py`, `api/app/services/supabase_service.py`, `api/app/services/qstash_service.py`
- **O que fazer:** Recebe `{audio_path, cover_path}`, valida ownership (RLS via JWT do user), insere row em `beats` com status=uploaded, publica job QStash → `POST /api/beats/{id}/process`
- **Criterio de pronto:** Dado upload do T2.1, row em `beats` aparece com status=uploaded e job aparece no QStash dashboard
- **Dependencia:** T2.1

#### `[ ]` T2.3 — Worker convert.py: ffmpeg → MP3 320kbps + loudnorm

- **Arquivos:** `api/app/workers/convert.py`, `api/app/services/ffmpeg_service.py`
- **O que fazer:** Endpoint `/internal/beats/{id}/convert` (signed por QStash). Baixa audio do Supabase Storage, roda `ffmpeg -i input -af loudnorm=I=-23:TP=-1.5:LRA=11 -b:a 320k -acodec libmp3lame output.mp3`, sobe pra `audios/{user_id}/{beat_id}/converted.mp3`, atualiza status=converted, dispara QStash → analyze. **Idempotente:** se status ja for >= converted, retorna 200 sem fazer nada.
- **Criterio de pronto:** Upload de WAV/FLAC/M4A vira MP3 320kbps no bucket. Status na DB avanca corretamente.
- **Dependencia:** T2.2

#### `[ ]` T2.4 — Pagina /beats/[id] com status em tempo real

- **Arquivos:** `web/app/(app)/beats/[id]/page.tsx`
- **O que fazer:** Subscribe via Supabase Realtime na row do beat. Mostra step list (Upload → Conversao → Analise → Geracao → Pronto pra revisar) com check/loader.
- **Criterio de pronto:** Apos upload, abre `/beats/[id]` e ve "Conversao" com loader → check em ~30s
- **Dependencia:** T2.3

#### `[ ]` T2.5 — Test: upload de wav, flac, m4a, mp3 → todos viram mp3 320

- **Arquivo:** `api/tests/workers/test_convert.py`
- **O que fazer:** Pytest com 4 fixtures de audio (wav, flac, m4a, mp3). Cada um vira mp3 320kbps validavel via `ffprobe`.
- **Criterio de pronto:** `pytest -m slow tests/workers/test_convert.py` passa pros 4 formatos
- **Dependencia:** T2.3

---

### Fase 3 — Analise IA Gemini Audio + grounded search (Gustavo executa)

> **Por que:** sem analise, nao tem como gerar copy direcionado. Gemini classifica vibe, busca tags trending.

#### `[ ]` T3.1 — Service: gemini_service.analyze_audio

- **Arquivo:** `api/app/services/gemini_service.py`
- **O que fazer:** Funcao `analyze_audio(mp3_path) -> {bpm, key, vibe, artistas_similares[]}`. Usa Gemini File API se >20MB (ja documentado em referencias). Prompt estruturado pedindo JSON.
- **Criterio de pronto:** Beat trap real → retorna BPM dentro de tolerancia +-5%, 3+ artistas similares plausiveis
- **Dependencia:** T0.4 (referencia gemini-audio.md)

#### `[ ]` T3.2 — Service: gemini_service.search_trending_tags (grounded)

- **Arquivo:** `api/app/services/gemini_service.py`
- **O que fazer:** Funcao `search_trending_tags(artistas[]) -> {tags[]}` usando Gemini com tool `google_search`. Prompt pede top tags de YouTube pra cada artista.
- **Criterio de pronto:** Pra `["Drake", "The Weeknd"]` retorna 15+ tags com pelo menos 5 contendo "type beat"
- **Dependencia:** T3.1

#### `[ ]` T3.3 — Worker analyze.py orquestra + atualiza beats

- **Arquivos:** `api/app/workers/analyze.py`
- **O que fazer:** Endpoint `/internal/beats/{id}/analyze`. Carrega MP3 convertido, chama T3.1 + T3.2, salva campos no row, status=analyzed, dispara QStash → generate.
- **Criterio de pronto:** Beat ja convertido → row tem bpm, key, vibe, artistas_similares, tags_sugeridas preenchidos. Status=analyzed.
- **Dependencia:** T3.1, T3.2

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

#### `[ ]` T4.1 — Service: anthropic_service.generate_3_variants

- **Arquivo:** `api/app/services/anthropic_service.py`
- **O que fazer:** Funcao recebe `(beat_metadata)` e retorna 3 pacotes `{titulo, descricao, tags[]}`. Prompt forca angulos distintos:
  - **A:** angulo `[Artista 1] Type Beat - [Mood]`
  - **B:** angulo `[BPM] BPM [Genero] Type Beat - [Tom]`
  - **C:** angulo `[Artista 2] x [Artista 3] Type Beat - [Vibe]`
- **Criterio de pronto:** 3 titulos disjuntos (>50% palavras diferentes), tags com >50% disjuncao entre as 3 variacoes
- **Dependencia:** T0.4 (referencia Claude)

#### `[ ]` T4.2 — Worker generate.py cria 3 rows em posts

- **Arquivos:** `api/app/workers/generate.py`
- **O que fazer:** Endpoint `/internal/beats/{id}/generate`. Chama T4.1, insere 3 rows em `posts` (variacao A/B/C, status=draft), atualiza beat status=ready_for_review.
- **Criterio de pronto:** Apos analyze, 3 posts criadas com titulos distintos. Status=ready_for_review.
- **Dependencia:** T4.1, T3.3

#### `[ ]` T4.3 — UI: 3 cards lado a lado em /beats/[id]

- **Arquivos:** `web/app/(app)/beats/[id]/page.tsx`, `web/components/VariacaoCard.tsx`
- **O que fazer:** Quando status=ready_for_review, mostra 3 cards com titulo+desc+tags editaveis (Textarea + chips de tag). Cada card tem botao "Salvar".
- **Criterio de pronto:** Editar titulo no card A salva no DB. Recarrega pagina, edicao persistiu.
- **Dependencia:** T4.2

#### `[ ]` T4.4 — UI: confirmacao de agendamento (default hoje 18h, +3d, +7d)

- **Arquivos:** `web/components/AgendamentoForm.tsx`
- **O que fazer:** Apos editar 3 variacoes, beatmaker clica "Agendar publicacao". Modal mostra 3 date pickers default (hoje 18h, +3d 18h, +7d 18h), editaveis. Confirma → chama `PATCH /posts/{id}` em cada com `scheduled_at`.
- **Criterio de pronto:** Apos confirmar, 3 posts tem `scheduled_at` no DB e `status=scheduled`
- **Dependencia:** T4.3

#### `[ ]` T4.5 — Test: 3 variacoes diferentes pro mesmo beat

- **Arquivo:** `api/tests/services/test_anthropic.py` (marker `@slow`)
- **O que fazer:** Gera 3 variacoes pra um beat, valida disjuncao titulos + tags
- **Criterio de pronto:** `pytest -m slow` passa
- **Dependencia:** T4.1

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
