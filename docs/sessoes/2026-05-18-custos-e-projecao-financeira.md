# Sessao 2026-05-18 — Custos da operacao, usage_tracker e projecao financeira

**Status:** ativo, importante
**Trigger:** Gustavo perguntou "quanto gasta a cada upload automatico e etc"
**Tasks tocadas:** T3.4 (concluida)
**Artefatos gerados:** 1 modulo novo + 3 services plugados + 2 docs + 1 HTML standalone

## O que aconteceu

### 1. Auditoria de custos antes de codar

Gustavo perguntou panorama de custos. Ao investigar descobriu-se que a tabela `api_usage` ja existia no schema, mas **so o modulo de Analytics (Fase 2) estava registrando uso**. Pipeline principal (analyze → generate → publish) NAO chamava `api_usage` em nenhuma das APIs pagas.

T3.4 (escrita originalmente pra Gemini audio) estava obsoleta porque a analise de audio mudou pra `librosa` local (gratis). Escopo real da task hoje: plugar `usage_tracker` em Gemini search trending + Claude metadata + YouTube upload.

### 2. T3.4 executada

**Criado:** `api/app/services/usage_tracker.py` com:
- Funcao `track(user_id, feature, tokens_in, tokens_out, duration_ms, beat_id, metadata)`
- Tabela `PRICING` hardcoded com precos de:
  - `claude_sonnet_4_6`: $3/$15 por 1M tokens (input/output)
  - `gemini_2_5_flash`: $0.30/$2.50 por 1M tokens
  - `youtube_upload`: $0 monetario (mas registra `quota_units` no metadata)
  - `fal_gpt_image_2`: $0.05/imagem (FUTURO, capa IA pausada)
- Falha silenciosa: `try/except` no INSERT — nunca derruba pipeline

**Plugado em:**
- `gemini_service.search_trending_tags(artista_nome, user_id, beat_id)` — tokens via `response.usage_metadata`
- `anthropic_service.generate_metadata(..., user_id, beat_id)` — tokens via `response.usage`
- `youtube_service.upload_video(..., beat_id)` — registra `quota_units` 1600 + 50 (thumbnail) no metadata

**Workers atualizados:** `generate.py` e `publish.py` passam `user_id` + `beat_id` pros services.

**Teste em producao:** upload "Lil Baby x Future" gerou 2 rows em `api_usage`:
- `claude_sonnet_4_6` · `$0.014397` · 1374 input + 685 output tokens · 8.8s
- `youtube_upload` · `$0` · quota_units=1650 · 2.4s
- `gemini_2_5_flash`: **NAO registrou** — deu timeout no Google Search grounding (log Railway confirmou). Comportamento esperado e ja conhecido (memoria `project_pipeline_fixes.md`). Fallback funcionou: Claude gerou metadados sem trending tags.

**22 testes existentes continuam passando.** Commit `f57c04b` + push.

### 3. Apresentacao de custos pra Gustavo

Gustavo nao estava entendendo "rows no Supabase" como "saber dos custos". Real ele queria: quanto gastou cada upload em valor total. Apresentado:

- **Upload medido (sem capa IA):** $0.014 (so Claude). Gemini falhou, YouTube e Spotify free.
- **Custos invisiveis tracked:** quota YouTube 1650 units, ~12MB Storage egress, ~50s CPU Railway, 3 msgs QStash. Aceitos como "nao instrumentado por chamada" — so totalizado mensal.

Criado `docs/referencias/custos-da-operacao.md` com:
- Auditoria completa de TODAS as plataformas e APIs em uso (16 etapas do pipeline)
- Precos exatos por chamada (Claude, Gemini com grounding, YouTube, Spotify, Supabase, QStash, fal.ai)
- 3 queries SQL prontas pra consultar custo POR upload (corrigidas em iteracao com Gustavo: titulo vem de `posts` nao `beats`, e `json_object_agg` precisa de `FILTER WHERE NOT NULL` pra evitar erro 22004 em beats antigos sem tracking)

### 4. Projecao financeira definitiva (HTML)

Gustavo pediu projecao com:
- Tier Basico: $9.99/mes (sem capa IA)
- Tier Premium: $19.99/mes (com capa IA)
- 20 uploads/mes por user
- Gemini grounding ja PAGO ($0.035/req)
- Mix 70% Basico / 30% Premium
- Cambio $1 = R$ 5
- Stripe 2.9% + $0.30

Criado `docs/financeiro/projecao-custos-2026-05-18.html` — HTML standalone com 10 secoes:

| Secao | Numero-chave |
|---|---|
| Custo por upload | Sem capa $0.0504 · Com capa $0.1004 |
| Custo IA por user (20 uploads) | Basico $1.01/mes · Premium $2.01/mes |
| Taxa Stripe efetiva | $9.99 paga **5.9%** ($0.59) · $19.99 paga **4.4%** ($0.88) |
| Infra fixa (em degraus) | $5 hoje → $25 → $50 → $65 → $125 → $240 |
| **Custo TOTAL por user** | **De $8.23 (1 user) a $2.25 (1.000 users)** |
| Breakeven | **Positivo desde 1 pagante** no cenario base |

Estetica do HTML: Instrument Serif + Geist + Geist Mono, paleta near-black + dourado palido + mint + rose. Botao de download embutido no header. Inspiracao Linear/Stripe Dashboard/Vaulto. Frame de "AI slop" evitado conscientemente.

## Pontos cegos identificados (Gustavo pediu contraponto honesto)

### Stripe US vs Stripe BR vs Pix recorrente

Gustavo perguntou como suportar BR e gringo simultaneamente. 3 caminhos:
- **A (recomendado pra start):** Stripe BR multi-moeda — uma conta CNPJ, Adaptive Pricing detecta pais e mostra preco local. Brasileiro paga BRL sem IOF (3.99% + R$ 0.39), gringo paga USD (4.99% + $ 0.30).
- **B (pos-beta):** Pix recorrente (Asaas/Mercado Pago, 0.99-1.99%) pra BR + Stripe pra gringo. Economiza ~R$ 200/mes a cada 100 brasileiros.
- **C (preguicoso):** so Stripe BR em BRL pra todos. Gringo perde "premium feel" do USD.

**Pre-requisito:** CNPJ (MEI serve). **Sem decisao final** — billing nao entra no MVP (regra 8 do CLAUDE.md). Registrar como ADR-pending quando billing virar task real.

### YouTube banindo contas — alegacao minha desmentida

Gustavo cobrou: "BeatValet nao menciona isso". Auditoria do `concorrentes/beatvalet.md` confirmou — eu (Claude) **inventei** a parte "vi documentado em concorrentes/beatvalet". Confessei. Pesquisa real (3 web searches) trouxe verdade calibrada:

- ❌ **NAO E VERDADE** que YouTube bane por "uploads via API". Automacao e explicitamente permitida (a propria Google fornece a API).
- ✅ **E VERDADE** que policy de **"Inauthentic Content"** atualizada em abril/2026 visa "mass-produced, template-based content with minimal human creative input". Milhares de canais de "AI slop" suspensos em 2026.
- ✅ **E VERDADE** que **spam policy** ("posting same content repeatedly") atinge type beat channels que so postam IA sem variacao.
- ✅ **E VERDADE** que **3 strikes em 90 dias = canal banido permanente**.

**Mitigations registradas (nao executadas):** reintroduzir A/B/C pra variabilidade real, orientar produtor a editar pelo menos titulo, diversificar conteudo do canal (nao so type beat).

### OAuth verification do Google YouTube Data API — status real verificado

Gustavo conferiu Google Cloud Console e descobriu: **projeto BeatPost OAuth esta em modo "Testando"**. 4 emails ja cadastrados como test users (`feat.nextsummer`, `musicnextsummer`, `raryarco`, `type.automation`).

**Implicacao real:** se beta abrir hoje, **NENHUM beta tester fora desses 4 emails consegue logar** — erro `Access blocked: BeatPost has not completed the Google verification process`. Limite 100 test users manuais.

**Diferenciacao importante (correcao da minha info anterior):**
- Testing + email cadastrado = funciona normal
- Testing + email nao cadastrado = **bloqueado no login**
- In production sem verification = funciona mas mostra tela amarela "App nao verificado"
- In production + verified = funciona limpo

**Plano acordado:**
- **Hoje:** nao mexer. OK pra continuar dev.
- **Beta setembro 2026:** modo Testing + adicionar emails convidados manualmente. Avisar no convite que vai aparecer tela amarela.
- **~Julho 2026:** comecar processo de verification (precisa: dominio proprio + politica privacidade + termos uso + video demo + link documentacao). 4-6 semanas de espera.
- **Pre-V1 publica:** verification aprovada.

Scopes do BeatPost (`youtube.upload`, `youtube.readonly`, `yt-analytics.readonly`) sao todos **"sensitive"** (audit normal e gratuito) — NAO sao **"restricted"** ($15k-75k de security assessment). Caminho barato confirmado.

### Verdades inconvenientes documentadas no HTML (secao 10)

1. 20 uploads/mes e otimista — produtor underground real publica 4-12/mes
2. YouTube quota e o GARGALO REAL — 10k units/dia = 6 uploads/dia no projeto todo. **Submeter formulario de aumento de quota antes do beta**.
3. CAC nao modelado — aquisicao tem custo (tempo + ads + ferramentas)
4. Impostos nao no calculo — MEI ou Simples PJ (5.5%+). Multiplicar margem por ~0.90.
5. Churn e o risco silencioso — SaaS pequeno tem 5-10% churn/mes. Retencao via valor entregue (analytics + comunidade + conteudo educacional)

## Decisoes tomadas / nao tomadas nesta sessao

| Item | Status | Onde voltar |
|---|---|---|
| Precos $9.99 / $19.99 | **Hipotese de trabalho** — nao decisao fechada | Billing task real |
| Stripe BR multi-moeda | **Pre-aprovado** mas nao implementado (billing fora do MVP) | Quando billing virar task |
| Pix recorrente (Asaas) | **Caminho futuro** pos-beta com 50+ pagantes | Tarefa pos-MVP |
| OAuth verification | **Aguardar** ate ~julho 2026 (2 meses antes do beta) | Task nova pre-beta |
| Aumento de quota YouTube | **Critico, HOJE** mas nao executado nesta sessao | Task imediata |
| A/B/C reintroducao | **Discutir** — pode mitigar risco de "template content" | Decisao pos-beta |

## Pendencias que ficaram da sessao

1. **Aumento de quota YouTube Data API** — formulario Google Cloud Console. Nao virou task. Bloqueia o beta.
2. **Verification OAuth** — formulario Google, processo de 4-6 semanas. Tem que comecar ~julho.
3. **Decisao final de tier de preco** — $9.99/$19.99 e hipotese; testar com primeiros beta testers.
4. **Domínio proprio** — `beatpost.com` ou similar. Pre-requisito de verification.
5. **Politica de privacidade + Termos de uso** — LGPD + pre-requisito de verification.
6. **Audit `concorrentes/beatvalet.md`** — atualizar removendo qualquer alegacao sobre BeatValet que nao tenha fonte (eu nao adicionei nada errado ao doc, mas vale revisar com novo olhar).

## Proxima sessao (planejada por Gustavo)

> "Vamos discutir sobre a analise de nicho e conteudo educacional"

Contexto da memoria: analise de nicho ja foi pre-planejada como **Fase 3 do produto** na sessao 2026-05-14 (pesquisa VidIQ). Conteudo educacional tambem ja esta no roadmap. Proxima sessao vai aprofundar arquitetura e fases dessas duas features.

## Referencias geradas nesta sessao

- `api/app/services/usage_tracker.py` — modulo central de tracking
- `docs/referencias/custos-da-operacao.md` — auditoria + queries SQL
- `docs/financeiro/projecao-custos-2026-05-18.html` — dashboard standalone
- Commit `f57c04b` (codigo) + commit posterior (docs + html)
