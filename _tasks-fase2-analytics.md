# _tasks — Fase 2 do produto · Analytics YouTube (adiantada do MVP) @gustavo

**Criado:** 2026-05-13
**Atualizado:** 2026-05-13
**Outcome:** Produtor entra em `/analytics`, autoriza o scope adicional do YouTube Analytics, e ve metricas reais do canal (views, inscritos, retencao), top 5 beats da semana, grafico de views por dia e tracos de trafego por fonte. Sem IA / sem insights / sem comparacoes externas nesta primeira entrega — so a base funcionando com dados reais cacheados por 24h.

**Iniciado:** 2026-05-14
**Status:** em-execucao (pausada — limite semanal Gustavo esgotado, reset em ~4 dias a partir de 2026-05-14)
**Proximo passo:** Quando voltar, rodar no Supabase SQL Editor:
  `DELETE FROM analytics_cache WHERE cache_key LIKE 'overview:7d%';`
Depois testar /configuracoes → "Testar 7d". Se vier com numeros (~171 views,
batendo com YT Studio), T7.3 fica oficialmente fechada e partimos pra T7.4.
Se vier zerado de novo, investigar Brand Account (channel==MINE vs channel_id
especifico).

Contexto da pausa (2026-05-14):
- T7.1, T7.2, T7.3 deployadas e funcionais
- Teste 30d retornou 8 views, 90d retornou 124 views (API funcionando)
- Teste 7d retornou 0 mas YT Studio mostra 171 views
- Diagnostico: cache stale — primeira chamada do 7d cacheou snapshot
  zerado antes do YT Analytics propagar dados (delay natural 24-48h)
- Cache TTL = 24h, entao DELETE manual desbloqueia teste
- Botão debug em /configuracoes ainda presente (vai sair em T7.11)
**Tags:** beatpost, fase2-produto, analytics, youtube-analytics-api, backend-primeiro

## Contexto

Gustavo decidiu adiantar a Fase 2 do produto (Analytics) ainda dentro do ciclo do MVP, pra diferenciar de concorrentes que ja existem (TubeBuddy, VidIQ, ferramentas genericas de upload automatico). Sessao de planejamento aconteceu em 2026-05-13 dentro de chat sobre redesign visual.

**Por que agora:**
- Quota da YouTube Analytics API e baixissima (1 unit por request, 10k/dia default) — nao bloqueia
- Sem usuarios ainda → ninguem precisa reautorizar OAuth com pena
- Gustavo ja tem 4 beats publicados pelo proprio BeatPost (dogfood acontecendo, da pra testar end-to-end)
- A/B/C foi removido do MVP em 2026-05-11 — sem o diferencial original, o MVP corre risco de virar commodity. Analytics + IA (no futuro) e o novo diferencial.

**Por que sem IA agora:**
Sem usuarios = so Gustavo testando = tokens Anthropic queimando sem retorno. IA entra depois (T8+), quando tiver base validada e usuarios reais.

## Recorte (o que esta FORA desta fase)

- **Insights IA da semana** — entra em iteracao futura (T8.x)
- **Comparacao com nicho externo** — descartado por ser desmotivador pra canal iniciante
- **Recomendacao de proximo beat** — depende da integracao Spotify (T2.x do MVP)
- **Alerta de beat em alta** — entra depois, precisa historico
- **Heatmap de horario ideal** — entra depois
- **Comparacao de moods** — mood nao e analise de audio (e input pra capa); descartado
- **Suite de relatorios exportaveis (CSV/PDF)** — V2

## Decisoes ja fechadas

| Tema | Decisao | Motivo |
|---|---|---|
| **Backend primeiro** | Implementar A→B→C→D na ordem | Permite testar com dados reais (Gustavo tem 4 beats publicados); frontend nasce com dados reais sem refactor mock→real |
| **Sem IA na v1** | So metricas brutas + agregacoes | Economiza tokens Anthropic enquanto so Gustavo testa |
| **Cache 24h** | Tabela `analytics_cache` no Supabase | Dados YT Analytics tem delay 24-48h mesmo; 1 chamada por usuario por dia |
| **Comparacoes internas, nao externas** | "Vs sua media" ao inves de "vs nicho" | Canal iniciante sempre vai estar abaixo de canais estabelecidos — comparacao externa desmotiva |
| **Graficos em SVG puro** | Sem adicionar Recharts/Tremor/Chart.js | Os 2 graficos sao simples (linha + barras horizontais); evita peso de bundle |
| **Sidebar link** | Adicionar so quando T7.7 estiver pronta | Nao deixar link quebrado apontando pra placeholder |
| **Sem mood em padroes** | Mood e input pra capa, nao analise de audio | Gemini nao detecta mood; produtor escolhe nos cards visuais |

## Tasks

Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluida · `[-]` bloqueada · `[!]` skipped

---

### Bloco A — OAuth + Service backend

#### `[x]` T7.1 — Adicionar scope `yt-analytics.readonly` ao OAuth flow

- **Arquivos:**
  - `api/app/routes/oauth.py` (ou onde estiver o fluxo atual do YouTube OAuth)
  - `api/app/services/youtube_auth.py`
  - `web/app/(app)/configuracoes/page.tsx` (banner "conectar Analytics" se ja tem upload conectado mas falta analytics)
- **O que fazer:**
  - Adicionar `https://www.googleapis.com/auth/yt-analytics.readonly` na lista de scopes ja pedidos (junto com `youtube.upload` e `youtube.readonly`)
  - Persistir scope concedido na tabela `youtube_channels` (coluna `granted_scopes` text[])
  - Criar fluxo de reautorizacao: se usuario ja conectou canal mas falta o scope analytics, mostrar banner em /configuracoes e /analytics com botao "Autorizar acesso ao Analytics"
  - Garantir que refresh_token continua sendo encriptado com pgcrypto (regra obrigatoria do projeto)
- **Criterio de pronto:**
  - Novo usuario conecta canal → ja vem com os 3 scopes
  - Usuario antigo (so com upload) ve banner pedindo reautorizacao
  - Coluna `granted_scopes` reflete o que foi concedido
  - Teste manual: tentar chamar Analytics API sem o scope retorna erro especifico que UI captura
- **Dependencia:** —

#### `[x]` T7.2 — Service `youtube_analytics.py` + cache 24h

- **Arquivos:**
  - `api/app/services/youtube_analytics.py` (novo)
  - `supabase/migrations/0XX_analytics_cache.sql` (tabela `analytics_cache`)
  - `api/tests/services/test_youtube_analytics.py`
- **O que fazer:**
  - Wrapper Python pro endpoint `reports.query` da YouTube Analytics API
  - 4 metodos: `get_overview(channel_id, period)`, `get_top_beats(channel_id, period, limit)`, `get_traffic_sources(channel_id, period)`, `get_views_timeline(channel_id, period)`
  - Tabela `analytics_cache (user_id uuid, cache_key text, payload jsonb, fetched_at timestamptz, expires_at timestamptz, PRIMARY KEY (user_id, cache_key))` com RLS por user_id
  - Logica: se `expires_at > now()`, retorna cache. Senao, chama API, salva, retorna.
  - Registrar em `api_usage` cada chamada paga (regra obrigatoria #5 do projeto)
- **Criterio de pronto:**
  - Testes mockados passando (`pytest tests/services/test_youtube_analytics.py -v`)
  - Cache hit nao chama API (verificavel por log)
  - Cache miss salva no banco e proxima chamada vira hit
  - api_usage registra row com `service='youtube_analytics_api'` e `units=1`
- **Dependencia:** T7.1

---

### Bloco B — Endpoints REST

#### `[x]` T7.3 — `GET /api/analytics/overview?period=7d`

- **Arquivos:**
  - `api/app/routes/analytics.py` (novo)
  - `api/tests/routes/test_analytics.py`
- **O que fazer:**
  - Endpoint autenticado (Supabase JWT)
  - Parametro `period`: `7d` | `30d` | `90d` (default `7d`)
  - Retorna: `{ views: { value, delta_pct, previous_value }, subscribers_gained: {...}, retention: {...} }`
  - Delta % calculado contra periodo anterior de mesmo tamanho
  - Usa cache via service da T7.2
- **Criterio de pronto:**
  - TestClient + auth mock retorna 200 com payload esperado
  - Sem auth retorna 401
  - Cache funciona (2 chamadas seguidas, 2a nao bate na API externa)
- **Dependencia:** T7.2

#### `[ ]` T7.4 — `GET /api/analytics/top-beats?period=7d&limit=5`

- **Arquivos:** `api/app/routes/analytics.py`, `api/tests/routes/test_analytics.py`
- **O que fazer:**
  - Cruza dados YT Analytics (video_id → views, retencao) com `beats` no Supabase (video_id → titulo, cover_path, artista_nome)
  - Retorna: `{ items: [{ beat_id, titulo, cover_url, views, retention, delta_pct }] }`
  - Limit 1-20, default 5
- **Criterio de pronto:**
  - Beats sem video_id (nao publicados) nao aparecem
  - Ordenado por views desc
  - Inclui beats publicados ate hoje
- **Dependencia:** T7.2

#### `[ ]` T7.5 — `GET /api/analytics/traffic-sources?period=7d`

- **Arquivos:** idem
- **O que fazer:**
  - Retorna agregacao por fonte: `{ sources: [{ key: 'YT_SEARCH', label: 'Pesquisa YouTube', views, pct }, ...] }`
  - Categorias: YT_SEARCH, RELATED_VIDEO, EXT_URL, OUTROS
- **Criterio de pronto:** Soma das pct = 100% (margem 1pp pra arredondamento)
- **Dependencia:** T7.2

#### `[ ]` T7.6 — `GET /api/analytics/views-timeline?period=7d`

- **Arquivos:** idem
- **O que fazer:**
  - Retorna serie temporal: `{ points: [{ date: 'YYYY-MM-DD', views: 123 }, ...] }`
  - Granularidade: dia (7d e 30d) ou semana (90d)
- **Criterio de pronto:** Numero de pontos bate com periodo (7 / 30 / 13 semanas)
- **Dependencia:** T7.2

---

### Bloco C — Frontend Next.js

#### `[ ]` T7.7 — Pagina `/analytics` + link na sidebar + seletor de periodo

- **Arquivos:**
  - `web/app/(app)/analytics/page.tsx` (novo)
  - `web/components/Sidebar.tsx` (adicionar item)
  - `web/components/AnalyticsPeriodSelector.tsx` (novo)
- **O que fazer:**
  - Rota `/analytics` (server component se possivel, ou client com loading)
  - Item "Analytics" na sidebar com icone `BarChart3` do lucide
  - Seletor 7d / 30d / 90d no canto superior direito; estado via URL searchParam `?period=7d`
- **Criterio de pronto:**
  - Acessivel pelo menu
  - Trocar periodo atualiza URL e dispara refetch dos blocos
- **Dependencia:** T7.3 (precisa do endpoint pra testar)

#### `[ ]` T7.8 — `<KpiCard>` × 3 (Views, Inscritos, Retencao)

- **Arquivos:** `web/components/analytics/KpiCard.tsx`
- **O que fazer:**
  - Card com: label uppercase mono pequeno + numero grande (font-display) + delta % com setinha + texto comparativo ("vs semana anterior")
  - Verde se delta positivo, vermelho se negativo, neutro se zero
  - Estado de loading: skeleton shimmer
- **Criterio de pronto:**
  - 3 cards renderizam corretamente com dados do endpoint T7.3
  - Skeleton aparece durante fetch
- **Dependencia:** T7.7

#### `[ ]` T7.9 — `<TopBeatsTable>`

- **Arquivos:** `web/components/analytics/TopBeatsTable.tsx`
- **O que fazer:**
  - Lista 5 beats: rank + thumb (44x44) + titulo + views + retencao + delta
  - Click no beat navega pra `/beats/[id]/review` (ou detalhe)
  - Empty state: "Nenhum beat publicado ainda nesse periodo"
- **Criterio de pronto:**
  - Visual consistente com lista atual de beats
  - Cover URL via signed URL Supabase
- **Dependencia:** T7.4

#### `[ ]` T7.10 — `<ViewsTimelineChart>` + `<TrafficSourcesChart>`

- **Arquivos:**
  - `web/components/analytics/ViewsTimelineChart.tsx` (linha SVG pura)
  - `web/components/analytics/TrafficSourcesChart.tsx` (barras horizontais SVG/CSS)
- **O que fazer:**
  - Timeline: SVG `<polyline>` com tooltip no hover (mostra data + views do ponto)
  - Traffic: 4 barras horizontais com label + valor + % + cor diferente cada
  - Sem libs de chart (manter bundle limpo)
- **Criterio de pronto:**
  - Hover no chart mostra valor do ponto
  - Responsivo (SVG `viewBox` + `preserveAspectRatio`)
- **Dependencia:** T7.5, T7.6

---

### Bloco D — Polimento

#### `[ ]` T7.11 — Reautorizacao + loading skeletons + erros

- **Arquivos:**
  - `web/components/analytics/AnalyticsReauthBanner.tsx`
  - Refino dos componentes T7.8-T7.10 com loading/error states
- **O que fazer:**
  - Banner topo se faltar scope analytics: "Precisamos de permissao adicional pra ler seu Analytics" + botao OAuth
  - Loading skeletons em cada bloco durante fetch
  - Estados de erro: "Canal sem dados ainda" (sem beats publicados), "Erro temporario YouTube" (5xx da API), "Token expirou" (reautorizar)
- **Criterio de pronto:**
  - Usuario sem scope analytics ve banner e flow funciona
  - Erros da API nao quebram a pagina
  - Skeletons sao especificos pra cada tipo de bloco (nao um spinner generico)
- **Dependencia:** T7.7-T7.10

---

## Criterio de pronto da Fase

- [ ] Gustavo abre `/analytics` no seu proprio canal e ve os 4 beats publicados refletidos nas metricas
- [ ] Trocar periodo 7d / 30d / 90d funciona sem refresh
- [ ] Cache reduz chamadas a 1 por dia por usuario (verificavel em api_usage)
- [ ] `pytest api/tests/ -m "not slow"` passa
- [ ] `pnpm typecheck && pnpm lint && pnpm build` passa
- [ ] Deploy Vercel + Railway sem erro
- [ ] Documentacao: criar `docs/arquitetura/analytics-pipeline.md` (max 150 linhas) explicando o fluxo OAuth → service → cache → endpoint → UI

## Custo estimado

- **YouTube Analytics API**: 1 unit por request × 4 endpoints × 1 cache miss/dia = 4 units/usuario/dia. Default 10k/dia → suporta 2500 usuarios ativos sem precisar pedir aumento de quota.
- **Anthropic / Gemini**: zero nesta fase (sem IA).
- **Storage Supabase**: tabela `analytics_cache` cresce ~1KB por user por dia. Negligenciavel.

## Historico de chats

- **2026-05-13** — Sessao de planejamento da Fase 2 Analytics (adiantada do plano de produto). Decisao: backend primeiro, sem IA na v1, comparacoes internas (nao com nicho externo), sem mood. Arquivo criado, aguardando OK do Gustavo pra comecar T7.1.
