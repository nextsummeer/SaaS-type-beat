# Gemini Audio + grounded search (vs Cyanite, vs banco proprio)

**Data:** 2026-04-25
**Status:** aceita
**Tags:** decisao, ia, audio, seo

## Contexto

Sistema precisa, dado um MP3, retornar:
1. **Vibe musical:** BPM, tom, genero, mood, artistas similares
2. **Tags trending no YouTube:** termos que beatmakers usam pra rankear

Sao dois problemas distintos. Avaliamos solucoes pra cada.

## Opcoes Consideradas

### 1. Gemini 2.0 Flash Audio + Gemini com `google_search` tool (grounded)
- **Pros:** 1 vendor pros 2 problemas. Gemini Audio extrai BPM/key/vibe/artistas com qualidade boa pra MVP. Grounded search retorna tags com base em pesquisa real do Google. Custo baixo (~$0.10-0.30 por beat completo). Free tier generoso.
- **Contras:** BPM/key nao tem precisao laboratorial. Pode errar artistas em casos de niche. Grounded search depende de Google indexar termos type beat (geralmente funciona).

### 2. Cyanite.ai (API comercial de music analysis)
- **Pros:** ~99% acuracia em BPM/key/genero/mood. Output formal e estruturado.
- **Contras:** Pay-per-use $0.10-0.30/analise. Nao resolve tags trending (apenas analise musical). Precisa cadastrar billing. Lock-in com vendor.

### 3. Banco proprio em Supabase (curado manualmente)
- **Pros:** Defensavel a longo prazo. Sem dependencia de API externa pra tags. Custo zero por chamada.
- **Contras:** Vidas humanas alimentando. Atualizacao continua. Cold start enorme. MVP nao tem 10 horas/semana pra curar.

### 4. Scraping (TubeBuddy/VidIQ approach)
- **Pros:** Tags reais do YouTube.
- **Contras:** Fragil. ToS questionavel. Manutencao continua.

## Decisao

**Veredito: Opcao 1 — Gemini Audio + Gemini grounded search.**

Confirmado via AskUserQuestion 2026-04-25 15:30. Cobre os 2 problemas com 1 vendor, custo baixo, 0 infra adicional. Vibe pode nao ser laboratorial mas e suficiente pra gerar copy direcionado. Tags via grounded search funcionam quando Google indexa o nicho — e type beat esta saturado de paginas indexadas.

### Implementacao

- **`gemini_service.analyze_audio(mp3_path)`** retorna `{bpm, key, vibe, artistas_similares: [str]}`
  - Usa Gemini File API se MP3 > 20MB (3+ min em 320kbps)
  - Prompt: "Voce ouviu um beat. Identifique: BPM (numero), tonalidade (ex: C# minor), vibe em 3-5 palavras, e 3-5 artistas que provavelmente comprariam ou usariam esse beat. Responda em JSON."
- **`gemini_service.search_trending_tags(artistas)`** retorna `{tags: [str]}`
  - Usa Gemini com tool `google_search` ativada
  - Prompt: "Pesquise no Google quais sao as tags YouTube mais usadas em videos de '{artista} type beat' nas ultimas semanas. Retorne 15+ tags ordenadas por uso. Responda em JSON."

### Plano B se Gemini falhar

Se em uso real a qualidade desapontar (V2 trigger):
- BPM/key: integrar Cyanite como fallback pago
- Tags: comecar banco proprio com job semanal alimentado por Gemini grounded — converte de "real-time" pra "indexado"

Manter abstracao em `gemini_service.py` para troca seja simples (interface igual).

## Consequencias

- Custo previsivel: ~$0.15 por beat completo (audio + search). 60 beats/usuario = $9/usuario/mes. Pricing $25/mes deixa $16 de margem.
- Free tier Gemini cobre primeiros usuarios sem custo
- Telemetria via `usage_tracker` em CADA chamada (T3.4) — sem isso nao saberemos se margem real bate
- Risco de Gemini grounded retornar "tags allucinadas" — validar no T3.5 que tags retornadas tem >X% que aparecem no YouTube real (V2 check)
