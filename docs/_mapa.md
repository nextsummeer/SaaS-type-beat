# Mapa de Documentacao — BeatPost

> Indice navegavel. Consultar SEMPRE antes de buscar ou criar docs.
> Atualizar ao criar/modificar/arquivar qualquer doc.

## Contexto
- `contexto/visao-mvp.md` — Resumo Nivel 2, escopo, beta privado [ativo]
- `contexto/publico-alvo.md` — ICP beatmaker underground, dores, comportamento [ativo]
- `contexto/recorte-mvp.md` — O que esta FORA (multi-canal, billing, metricas) [ativo]
- `contexto/time.md` — Composicao do time: Henrique, Gustavo, Rary [ativo]
- `contexto/concorrentes/_index.md` — Panorama de concorrentes e ferramentas similares [ativo]
- `contexto/concorrentes/beatvalet.md` — Concorrente direto, SaaS desktop FL Studio + BeatStars + YouTube [ativo]
- `contexto/concorrentes/beatloadr.md` — Concorrente direto, SaaS web YouTube-only com bulk + calendario, mercado UE [ativo, importante]
- `contexto/concorrentes/beatstars-upload-github.md` — Script open source de uso pessoal, nao concorrente [ativo]

## Decisoes
- `decisoes/_template-decisao.md` — Template para novas decisoes (ADR)
- `decisoes/2026-04-25-stack.md` — Next.js + FastAPI + Supabase + QStash [ativo]
- `decisoes/2026-04-25-multitenancy-rls.md` — RLS Supabase desde dia 1 [ativo]
- `decisoes/2026-04-25-3-variacoes-abc.md` — A/B/C no mesmo canal vs multi-canal [ativo]
- `decisoes/2026-04-25-capa-manual.md` — Capa upload pelo user no MVP [parcialmente superseded em 2026-05-07, mantem como fallback]
- `decisoes/2026-04-25-gemini-vs-cyanite.md` — Gemini Audio vence Cyanite no MVP [ativo]
- `decisoes/2026-04-25-cobranca-na-unha.md` — Pix manual ate 10 pagantes [ativo]
- `decisoes/2026-05-07-fluxo-upload-e-inputs-do-produtor.md` — Artista informado + mood + lista controlada + Spotify API [ativo]
- `decisoes/2026-05-07-geracao-de-capa-mvp.md` — Capa IA por estilo+mood (clusters fixos), fal.ai $0.05/imagem [SUPERSEDED em 2026-05-21]
- `decisoes/2026-05-12-bpm-manual-e-link-loja.md` — BPM informado pelo produtor + link da loja opcional no upload (T2.13) [ativo]
- `decisoes/2026-05-21-geracao-de-capa-prompt-base-claude.md` — Capa IA reformulada: prompt base mestre + brief estruturado + Claude runtime, aba dedicada `/capas` com biblioteca, sistema de creditos por tier, fal.ai quality=low $0.013/capa [ativo, complementado em 2026-05-21 sessao 3]
- `decisoes/2026-05-21-prompt-dna-capa-v2.md` — Prompt DNA v2: principio Captured Not Composed + DNA universal + anti-aesthetics + 7 blocos + brief v2 (6+2 campos com genero como ancora) + sistema de variacao por 7 eixos + prompt caching Claude [SUPERSEDED em 2026-05-22 pelo v3 -- capas saíram visualmente ruins, abordagem reescrita]
- `decisoes/2026-05-22-prompt-dna-capa-v3.md` — Prompt DNA v3: camera video-still fixa em 2 variantes (padrao + underground agressivo) + estrutura 12 elementos + sub-locations por artista (5 validados, expansivel) + drop campo cenario + anti-repeticao via query DB + palavras/references banidas vs permitidas + anti-bias inline [ativo, importante]

## Arquitetura
- `arquitetura/pipeline-upload-postagem.md` — Fluxo ponta-a-ponta + state machine [ativo]
- `arquitetura/schema-supabase.md` — SQL completo + RLS policies (3 migrations) [ativo]
- `arquitetura/fluxo-oauth-youtube.md` — OAuth + refresh token + multi-canal V2 [ativo]
- `arquitetura/workers-qstash.md` — Como QStash dispara endpoints + idempotencia [ativo]
- `arquitetura/integracao-beatstars-futura.md` — 3 caminhos tecnicos pra cobrir BeatStars na nuvem (V1.5+) [planejamento]
- `arquitetura/analytics-pipeline.md` — YouTube Analytics + cache 24h + deteccao deletado/privado + endpoints + componentes (Fase 2 do produto) [ativo]

## Referencias
- `referencias/nextjs.md` — Next.js 15 App Router, middleware, Server Components/Actions [ativo]
- `referencias/fastapi.md` — Routes, deps, async, lifespan, config pydantic-settings [ativo]
- `referencias/supabase-auth.md` — Auth UI, Google provider, JWT, helpers Next.js [ativo]
- `referencias/supabase-storage.md` — Buckets, signed URLs, policies, paths [ativo]
- `referencias/gemini-audio.md` — google-genai SDK, audio understanding + grounded search [ativo]
- `referencias/youtube-data-api-v3.md` — Upload, OAuth, quota 10k/dia, thumbnails [ativo]
- `referencias/ffmpeg.md` — Conversao MP3 320 + loudnorm + audio→video [ativo]
- `referencias/upstash-qstash.md` — Publisher + receiver + idempotencia [ativo]
- `referencias/shadcn-ui.md` — CLI install, componentes do MVP, theming [ativo]
- `referencias/custos-da-operacao.md` — Auditoria de plataformas + APIs + precos por chamada + queries SQL pra consultar gasto por upload [ativo]

## Financeiro
- `financeiro/projecao-custos-2026-05-18.html` — Dashboard HTML standalone: projecao com $9.99/$19.99, 20 uploads/mes, mix 70/30, breakeven, custo total/user em escala [ativo]

## Sessoes
- `sessoes/2026-04-25-1500-brainstorm-mvp.md` — Sessao fundadora (resumo) [ativo]
- `sessoes/2026-05-07-concorrentes-e-stack.md` — Analise BeatValet, decisao de cobrir BeatStars na V1.5 [ativo]
- `sessoes/2026-05-07-brainstorm-jornada-cliente.md` — Inputs do upload (artista, mood) + capa por IA entra no MVP [ativo, importante]
- `sessoes/2026-05-11-setup-contas-e-supabase.md` — T0.5+T0.6: email do projeto, Supabase criado, 3 migrations aplicadas, push GitHub [ativo]
- `sessoes/2026-05-11-t07-vercel-railway-setup.md` — T0.7+T1.1: Next.js web/ + FastAPI api/ + Vercel + Railway no ar. Problemas resolvidos documentados. [ativo, importante]
- `sessoes/2026-05-11-t12-a-t15-auth-dashboard.md` — T1.2→T1.5: Login Supabase Auth, middleware, dashboard+sidebar, API badge. Bugs e decisoes documentados. [ativo, importante]
- `sessoes/2026-05-11-t16-t21-playwright-upload.md` — T1.6+T2.1: Playwright E2E (login→dashboard→logout), T1.7 bloqueada, UI de upload com progress bar direto para Supabase Storage. [ativo, importante]
- `sessoes/2026-05-11-t22-endpoint-beats.md` — T2.2: POST /beats, supabase_service, qstash_service. Fixes: GRANT service_role, Vercel env vars, page.tsx redirect, ESLint Next.js 16. [ativo, importante]
- `sessoes/2026-05-11-t23-a-t33-convert-analyze-librosa.md` — T2.3→T3.3: worker convert (MP3-only), pagina /beats/[id] Realtime, testes convert, analise BPM+tom com librosa (Gemini descartado para audio). [ativo, importante]
- `sessoes/2026-05-12-fase4-generate-review.md` — Fase 4 simplificada: generate.py (Spotify+Gemini+Claude), review UI, perfil do produtor, template descricao padrao. Erro no primeiro teste — investigar. [ativo, importante]
- `sessoes/2026-05-12-debug-pipeline-upload.md` — Debug pipeline upload: GRANT Supabase, fallback QStash, bug ThreadPoolExecutor Gemini, librosa otimizado. Teste final pendente. [ativo, importante]
- `sessoes/2026-05-12-pipeline-funcionando-bpm-manual.md` — Pipeline funcionando ponta-a-ponta (50s)! Fixes: prompt Claude (40-60 IDEOTAGS), bug .maybe_single() postgrest-py, GRANT service_role, _mark_failed com error_message. T2.13 concluida: BPM manual + link da loja no upload. [ativo, importante]
- `sessoes/2026-05-12-t51-youtube-oauth.md` — T5.1 concluida: OAuth YouTube end-to-end + T2.14 (lista de beats) + refinamentos de UX. 6 gotchas resolvidos durante setup. [ativo, importante]
- `sessoes/2026-05-12-t52-t53-t54-publicacao-youtube.md` — T5.2+T5.3+T5.4 concluidas: pipeline ffmpeg+upload+publishAt funcionando em producao. 7 bugs resolvidos (OOM, Shorts auto, timezone, links nao clicaveis). 2 beats publicados ponta-a-ponta. [ativo, importante]
- `sessoes/2026-05-13-t66-a-t613-ux-polimento-auth.md` — T6.6→T6.13: polimento UX pos-uso-real (unificacao configuracoes, sanitize Instagram, card canal verde, multi-artistas colab, DateTimePicker custom, bloqueio publicado, esqueci-senha, redesign auth com video background). Fix critico: button color inherit em globals.css. Investigacao quota YouTube. [ativo, importante]
- `sessoes/2026-05-13-redesign-visual-pos-login.md` — T6.14→T6.18: redesign visual interface pos-login. Inter, tokens CSS, sidebar com grupos/icones, toggle grade/lista na pagina Beats, upload centralizado, config em cards, dashboard com metricas placeholder. Skill frontend-design instalada. Proximo: redesign completo com cores Vaulto via /frontend-design. [ativo, importante]
- `sessoes/2026-05-14-fase2-analytics-e-conquistas.md` — Fase 2 Analytics completa (5 endpoints, 3 sub-paginas, deteccao deletado/privado/unlisted, timeline com toggle metric) + Conquistas (28 achievements, 6 ranks, SiriOrb animada, galeria). Bonus: dashboard real, filtro Removidos na /beats. Roadmap atualizado: Prêmios pra T10, Analise de nicho VidIQ-like e Conteudo Educacional como próximas. [ativo, importante]
- `sessoes/2026-05-14-pesquisa-vidiq-e-fix-cache-analytics.md` — Pesquisa profunda VidIQ (modelo, fontes de dados, metricas, concorrentes). Decisoes: analise de nicho vira Fase 3 do produto, usabilidade A+C, caminho hibrido (YT API + Spotify + autocomplete + Trends), modelo creditos. Auditoria MVP base: T2.8/T3.2/T6.1/T6.2/T6.3 confirmadas done. Capa IA pausada (Gustavo estudando). Bug cache stale do analytics corrigido (TTL adaptativo). [ativo, importante]
- `sessoes/2026-05-18-custos-e-projecao-financeira.md` — T3.4 (usage_tracker centralizado). Auditoria de custos: $0.014 medido por upload, dominado por Claude. Projecao financeira em HTML standalone com tiers $9.99/$19.99. Pontos cegos: Stripe BR vs Pix recorrente, YouTube content policy 2026 (alegacao minha sobre BeatValet desmentida), OAuth ainda em modo Testing — beta bloqueado fora dos 4 test users. Pendencias: aumento quota YouTube + verification OAuth + dominio proprio. [ativo, importante]
- `sessoes/2026-05-19-youtube-processamento-cancelado.md` — Debug do bug "Processamento cancelado" no teste do Rary. Causa: `-c:a copy` (MP3 em container MP4). Fix: trocar pra `-c:a aac -b:a 320k`. Thumbnail rejeitada por canal nao verificado eh problema separado, codigo ja trata. Loudness baixa no YouTube eh normalizacao -14 LUFS automatica, impossivel evitar. [ativo]
- `sessoes/2026-05-19-calendario-agendamento-design.md` — Analise do calendario visual do Beatloadr + 3 variantes de escopo (LITE/MEDIO/COMPLETO) + decisao de adiar implementacao ate destravar OAuth verification, quota YouTube e teste do Rary. Infra (`scheduled_at`) ja pronta — falta so UI. [ativo, importante]
- `sessoes/2026-05-21-capa-ia-completo.md` — **Sessao gigantesca**: capa IA do zero ate producao. 17 commits, ~3500 linhas. Multi-presets de brief, tier internal, skeleton refresh-safe via cover_library.status, fix de 14+ bugs UX. Bloqueador unico restante: prompt base mestre (T4.6). [ativo, importante]
