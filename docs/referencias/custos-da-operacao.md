# Custos da operacao — BeatPost

Auditoria completa de TODOS os servicos pagos e free-tier usados no projeto.
Data da auditoria: 2026-05-18. Revisar trimestralmente — precos mudam.

## 1. Plataformas de infra (custos FIXOS, independem de upload)

| Servico | Plano hoje | Custo mensal | Limite atual | Quando vira problema |
|---|---|---|---|---|
| **Vercel** (`saa-s-type-beat.vercel.app`) | Hobby | **$0** | 100GB egress, build 6h/mes | Uso comercial exige Pro **$20/mes** |
| **Railway** (`saas-type-beat-production`) | Hobby | **~$5** + uso CPU/RAM | 8GB RAM, $5 credito mensal | Workers pesados (ffmpeg+librosa) consomem rapido |
| **Supabase** | Free | **$0** | 500MB DB, 1GB Storage, 2GB egress, 50k MAU | Storage estoura primeiro — MP3+MP4 ~20MB por beat |
| **Upstash QStash** | Free | **$0** | 500 msgs/dia, 1000 retries/mes | 3 msgs por upload → teto ~166 uploads/dia |
| **Google Cloud (YouTube Data API)** | Free | **$0** | **10.000 units/dia** | 1 upload = 1.650 units → **teto ~6 uploads/dia no projeto inteiro** |
| **Google Cloud (YouTube Analytics API)** | Free | **$0** | Cota separada, alta | Improvavel estourar |
| **Anthropic API** | Pay-as-you-go | varia | sem limite | Volume × $/token (ver secao 3) |
| **Google AI (Gemini API)** | Free tier + pay-as-you-go | varia | 1500 grounding/dia free | Search grounding extra (ver secao 3) |
| **Spotify Web API** | Client Credentials | **$0** | 180 req/min por app | Improvavel estourar com 1 chamada/upload |
| **GitHub** | Free | **$0** | repo publico/privado, Actions free | — |
| **Dominio (futuro)** | — | **$0** | usando `.vercel.app` e `.railway.app` | Quando comprar dominio proprio: ~$15/ano |

**Baseline fixo hoje: ~$5/mes** (so Railway). Tudo o resto esta em free tier.

## 2. Servicos externos por upload (ordem do pipeline)

| Etapa do pipeline | Servico | API/lib | Custo monetario direto | Custo de cota/recurso |
|---|---|---|---|---|
| 1. Upload do MP3 pro Storage | Supabase Storage | `@supabase/storage` | $0 | egress (conta no 2GB/mes free) |
| 2. Dispara fila de processamento | Upstash QStash | `requests.post` | $0 | 1 msg (conta no 500/dia free) |
| 3. Conversao MP3 320kbps + loudnorm | **ffmpeg LOCAL** | `imageio-ffmpeg` | $0 | CPU Railway |
| 4. Dispara `analyze` | QStash | — | $0 | 1 msg |
| 5. Download do MP3 do Storage | Supabase Storage | signed URL | $0 | egress |
| 6. Deteccao de tom (music_key) | **librosa LOCAL** | `librosa` | $0 | CPU Railway |
| 7. Dispara `generate` | QStash | — | $0 | 1 msg |
| 8. Busca top tracks do artista | **Spotify Web API** | `requests.get` /search + /top-tracks | $0 | 2 chamadas (180 req/min limit) |
| 9. Busca tags trending | **Gemini 2.5 Flash + Google Search grounding** | `google-genai` | **~$0.001** tokens + **grounding** (ver secao 3) | 1 grounding request |
| 10. Gera titulo/descricao/tags | **Claude Sonnet 4.6** | `anthropic` | **~$0.014 medido** | — |
| 11. Inserts em `posts` | Supabase Postgres | — | $0 | conta no DB 500MB |
| 12. Download MP3 + capa | Supabase Storage | signed URL | $0 | egress (~12MB) |
| 13. Gera MP4 (audio + capa) | **ffmpeg LOCAL** | `imageio-ffmpeg` | $0 | CPU Railway |
| 14. Upload do MP4 no YouTube | **YouTube Data API v3** | `videos.insert` | $0 | **1.600 units de quota** |
| 15. Set thumbnail custom | YouTube Data API v3 | `thumbnails.set` | $0 | **50 units de quota** |
| 16. Updates de status | Supabase Postgres | — | $0 | — |

## 3. Precos exatos por chamada (cole isso na cabeca)

### Anthropic Claude Sonnet 4.6 (`claude-sonnet-4-6`)

- **Input tokens:** $3 por **1 milhao** de tokens (≈ $0.000003 por token)
- **Output tokens:** $15 por **1 milhao** de tokens (≈ $0.000015 por token)
- **Custo medido em producao:** $0.0144 por upload (1374 input + 685 output tokens)
- **Pricing oficial:** https://www.anthropic.com/pricing

### Google Gemini 2.5 Flash (`gemini-2.5-flash`)

- **Input tokens:** $0.30 por **1 milhao** (texto)
- **Output tokens:** $2.50 por **1 milhao**
- **Google Search grounding (CRITICO):**
  - **Free:** 1.500 requests/dia
  - **Depois:** **$35 por 1.000 requests** (≈ $0.035 por chamada)
  - Cada upload chama 1x → 1.500 uploads/dia em free
- **Pricing oficial:** https://ai.google.dev/pricing

### YouTube Data API v3 (upload do video)

- **Custo monetario:** $0 (sempre)
- **Quota:** 10.000 units/dia, **upload custa 1.650 units** (1.600 insert + 50 thumbnail)
- **GARGALO REAL:** teto de ~6 uploads/dia no projeto inteiro ate conseguir aumento via Google Cloud Console (formulario de quota increase, leva 1-7 dias)
- **Quota oficial:** https://developers.google.com/youtube/v3/getting-started#quota

### Spotify Web API (Client Credentials)

- **Custo:** $0, free para sempre
- **Rate limit:** 180 requests/min por app, soft limit
- **2 chamadas por upload** (search + top-tracks)

### Supabase (DB + Storage + Auth)

| Recurso | Free tier | Pro ($25/mes) |
|---|---|---|
| Postgres DB | 500 MB | 8 GB |
| Storage | 1 GB | 100 GB |
| Egress (download) | 2 GB/mes | 250 GB/mes |
| Auth MAU | 50.000 | 100.000 |
| Realtime concurrent | 200 | 500 |

**Storage estoura primeiro:** MP3 (~10MB) + MP4 gerado (~10MB) + capa (~500KB) = **~20MB por beat**. 50 beats = 1GB → free tier estourado.

### Upstash QStash

- **Free:** 500 mensagens/dia, 1.000 retries/mes
- **Pago:** $1 por 100k requests adicionais (muito barato)
- 3-4 mensagens por upload → free tier suporta ~125 uploads/dia

### fal.ai gpt-image-2 (FUTURO, capa IA pausada)

- **Custo:** **$0.05 por imagem** gerada
- **Quando ativar:** registrar em `api_usage` com `feature='fal_gpt_image_2'` (PRICING ja tem entrada)

## 4. Custo total POR UPLOAD (estimado em volume real)

**No free tier hoje** (sem capa IA, primeiros 1500 uploads/dia):

| Item | Custo |
|---|---|
| Claude Sonnet 4.6 (medido) | $0.0144 |
| Gemini 2.5 Flash tokens (estimado) | $0.0010 |
| Gemini grounding (free dentro do dia) | $0.0000 |
| YouTube upload | $0.0000 |
| Spotify | $0.0000 |
| Supabase Storage + DB + egress | desprezivel (rateado mensal) |
| **TOTAL POR UPLOAD** | **~$0.015 (~R$ 0,08)** |

**Quando estourar 1.500 grounding/dia:** +$0.035 por upload → **~$0.05/upload**.
**Quando ligar capa IA:** +$0.05 → **~$0.10/upload**.

## 5. Como consultar custos no banco (queries SQL prontas)

Cola no **SQL Editor** do Supabase Dashboard:

```sql
-- Custo total POR UPLOAD (agrupado por beat)
-- titulo vem de posts (variacao='A'), nao de beats — beats nao tem titulo
-- filter (where ... is not null) evita erro 22004 em beats antigos sem tracking
select
  b.id as beat_id,
  b.artista_nome,
  p.titulo,
  b.created_at,
  coalesce(sum(u.cost_usd), 0) as custo_total_usd,
  count(u.id) as chamadas_pagas,
  json_object_agg(u.feature, u.cost_usd) filter (where u.feature is not null) as detalhamento
from beats b
left join posts p on p.beat_id = b.id and p.variacao = 'A'
left join api_usage u on u.beat_id = b.id
group by b.id, b.artista_nome, p.titulo, b.created_at
order by b.created_at desc;

-- Resumo do mes atual (gasto total + media por upload)
select
  count(distinct beat_id) as uploads_no_mes,
  sum(cost_usd) as custo_total_usd,
  round(sum(cost_usd)::numeric / nullif(count(distinct beat_id), 0), 6) as custo_medio_por_upload,
  round(sum(cost_usd)::numeric * 5.0, 2) as custo_total_brl_aprox
from api_usage
where created_at >= date_trunc('month', now())
  and beat_id is not null;

-- Quota YouTube consumida hoje (cuidado com o teto de 10k)
select
  sum((metadata->>'quota_units')::int) as quota_units_hoje,
  count(*) as uploads_hoje,
  10000 - sum((metadata->>'quota_units')::int) as quota_restante
from api_usage
where feature = 'youtube_upload'
  and created_at >= current_date;
```

## 6. O que NAO esta sendo tracked (gaps conhecidos)

- **Supabase Storage egress** — sem medicao por chamada, so totalizado mensal no dashboard
- **Railway CPU/RAM** — sem medicao por upload, so totalizado mensal no dashboard
- **QStash mensagens** — sem medicao por chamada, painel Upstash mostra
- **Falhas de API** (ex: Gemini timeout) — `track()` so e chamado em sucesso. Pra medir taxa de erro, adicionar tracking no `except`
- **Vercel bandwidth** — sem medicao por user, painel Vercel mostra

Esses gaps sao aceitaveis no MVP — quando importar, criar tasks dedicadas.

## Referencias externas

- Anthropic pricing: https://www.anthropic.com/pricing
- Google AI (Gemini) pricing: https://ai.google.dev/pricing
- YouTube Data API quota: https://developers.google.com/youtube/v3/getting-started#quota
- Supabase pricing: https://supabase.com/pricing
- Upstash QStash pricing: https://upstash.com/pricing/qstash
- Vercel pricing: https://vercel.com/pricing
- Railway pricing: https://railway.com/pricing
- fal.ai pricing: https://fal.ai/pricing
