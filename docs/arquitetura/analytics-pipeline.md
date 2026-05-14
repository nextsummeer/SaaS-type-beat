# Analytics pipeline — YouTube Analytics integrado

**Criado:** 2026-05-14
**Status:** ativo
**Tags:** arquitetura, analytics, youtube, cache

## Visao geral

A pagina `/analytics` mostra metricas reais do canal do produtor no
YouTube, sem armazenar dados historicos no nosso banco. A cada visita,
o backend busca da YouTube Analytics API e cacheia o payload por 24h
em `analytics_cache` — alinhado com o delay natural de 24-48h da
propria API do YouTube.

Detecção de estado dos videos (publico / privado / unlisted /
deletado) acontece em paralelo via YouTube Data API, e a unica info
persistida e o `youtube_deleted_at` em `posts`.

```
[USUARIO]
   │ abre /analytics
   ▼
[NEXT.JS WEB]
   │ session.access_token (Supabase JWT)
   │ Promise.all dispara em paralelo:
   │   - GET /analytics/overview?period=7d
   │   - GET /analytics/views-timeline?period=7d&metric=views
   │   - GET /analytics/views-timeline?period=7d&metric=subscribersGained
   ▼
[FASTAPI]
   │ valida JWT → user_id
   ▼
[SERVICE youtube_analytics.py]
   │
   │ _get_or_fetch(user_id, cache_key, fetcher):
   │   ├─ cache hit? (expires_at > now) → retorna payload do banco
   │   └─ cache miss:
   │       1. get_access_token(user_id)
   │           ├─ get_youtube_refresh_token (SQL function pgp_sym_decrypt)
   │           └─ exchange refresh_token por access_token novo
   │       2. _get_channel_id(user_id) ← youtube_accounts.channel_id
   │       3. fetcher(access_token, channel_id):
   │           ├─ GET youtubeanalytics.googleapis.com/v2/reports
   │           │  ids=channel==<channel_id>
   │           │  startDate/endDate (terminam em ONTEM, nao hoje)
   │           │  metrics + dimensions
   │           └─ retorna JSON cru
   │       4. _cache_set: INSERT analytics_cache (TTL 24h)
   │       5. _log_api_usage: INSERT api_usage (regra do projeto)
   ▼
[YOUTUBE ANALYTICS API]
   │ 1 unit por request (quota separada de 10k/dia)
   │ Para canal Brand: channel==<channel_id> especifico
   │ Para canal default: tambem funciona (channel_id == MINE resolve)
   ▼
[RESPOSTA JSON]
   │ { columnHeaders: [...], rows: [...] }
   │ Endpoint parseia → JSON amigavel pra UI
```

## Endpoints REST

Todos sob `/analytics`, autenticados via Supabase JWT, aceitam
`period=7d|30d|90d` (default 7d).

- `GET /overview` — KPIs do canal agregados:
  views, subscribersGained, averageViewPercentage + delta % vs periodo
  anterior. Suporta `?debug=true` que adiciona `_debug.raw_atual/anterior`
  com o JSON literal da YT API (usado durante desenvolvimento).
- `GET /views-timeline?metric=views|subscribersGained` — serie
  temporal dia a dia em todos os periodos.
- `GET /traffic-sources` — quebra por fonte (Pesquisa YT, Sugeridos,
  Externo, etc) com label amigavel + % calculado.
- `GET /top-beats?limit=5` — top vidoes globais do canal (qualquer
  origem, inclui antigos).
- `GET /my-beats` — **so beats publicados pelo BeatPost**. Cruza
  `posts.youtube_video_id` com YT Analytics filtrando por video_ids
  especificos. Tambem chama `list_videos_status` em paralelo pra
  detectar deletados e marcar `youtube_deleted_at`.

## Schema

```sql
-- migration 008: cache de respostas YT Analytics
create table analytics_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  cache_key text not null,    -- ex: 'overview:7d:anterior'
  payload jsonb not null,
  fetched_at timestamptz default now(),
  expires_at timestamptz not null,
  primary key (user_id, cache_key)
);

-- migration 009: deteccao de delecao no YouTube
alter table posts add column youtube_deleted_at timestamptz;
```

Cache keys:
- `overview:7d` / `overview:7d:anterior` (atual vs periodo anterior)
- `top-beats:7d:5` (inclui limit no key)
- `traffic-sources:7d`
- `views-timeline:7d:views` / `views-timeline:7d:subscribersGained`
- `my-beats:7d:<sorted_csv_de_video_ids>` (hash dos beats do user)

## Decisoes-chave

| Tema | Decisao | Motivo |
|---|---|---|
| Cache TTL | 24h fixo | YT Analytics ja tem delay natural 24-48h, nao adianta cache mais agressivo |
| Granularidade | `day` sempre (mesmo 90d) | API retorna rows vazio com `month` + intervalo fracionado |
| Datas | `end = ontem` (nao hoje) | YT nao consolida dia atual, retornava 0 pra tudo |
| Canal | `channel==<channel_id>` | Brand Accounts: `channel==MINE` pega canal default vazio |
| IA | **fora desta fase** | Sem usuarios ainda, IA queimaria tokens sem retorno |
| Comparacoes | sempre internas (voce vs voce) | Comparar com nicho externo desmotiva canal iniciante |
| Mood em analytics | nao usado | Mood e input pra capa, nao analise de audio (decisao 2026-05-07) |

## Componentes frontend

- `AnalyticsPeriodSelector` — toggle 7d/30d/90d (segmented control)
- `AnalyticsDelayBanner` — aviso azul fixo sobre delay 24-48h
- `AnalyticsScopeNote` — nota explicativa de escopo (`channel` ou
  `beatpost`) com link cruzado pra sub-pagina complementar
- `AnalyticsViewsTimeline` — grafico SVG com gradient + crosshair +
  tooltip dentro do viewBox + toggle de metrica (views/inscritos)

## Quota e custo

- YouTube Analytics API: **1 unit por request**, quota 10k/dia
- YouTube Data API v3 (videos.list pra detectar deletados): **1 unit
  por chamada de ate 50 IDs**

Por usuario ativo/dia (cache hit em todas chamadas exceto a primeira
do dia):
- ~6-8 units (overview x2 + 2 timelines + top + traffic + my-beats)
- + 1 unit pra videos.list

→ ~10 units/usuario/dia. **Comporta ~1000 usuarios ativos
diarios sem precisar aumentar quota.**

## Pontos de atencao pro futuro

- **Quando IA entrar (T8+)**: cachear o `insight_da_semana` 7d em vez
  de 24h, gera 1x por semana por usuario, evita queimar tokens.
- **Limpar cache expirado**: hoje sem cron. Tabela cresce ~1KB/user/dia.
  Adicionar `delete from analytics_cache where expires_at < now()` em
  worker periodico quando tiver volume.
- **Token revogado pelo user**: hoje `get_access_token` lanca
  RuntimeError → endpoint retorna 502. Frontend mostra erro generico.
  Ideal seria detectar e mostrar banner "reconecte seu canal".
