# Beatloadr

> SaaS web de automacao de upload de type beats no YouTube. Concorrente direto mais alinhado com a proposta do BeatPost identificado ate hoje.
> Site: https://beatloadr.com — analisado em 2026-05-19.

## O que e

App web (sem instalacao) que automatiza upload em lote de beats pro
YouTube com analise automatica de BPM/key, metadados via templates,
render de video em fila e agendamento em calendario mensal.

**Proposta:** "Automate your YouTube beat uploads."

## Stack tecnico (deduzido — pagina nao revela)

| Camada | Implementacao provavel |
|---|---|
| Frontend | Web app (sem indicacao de mobile) |
| YouTube | Google OAuth + YouTube Data API v3 (mesma stack do BeatPost) |
| Audio | Detector de BPM e key (provavel librosa ou similar) + waveform |
| Metadados | **Templates com variaveis e logica** (ex: `{bpm} BPM {key} Type Beat - {name}`). **Sem IA generativa.** |
| Video | Render com aspect ratios multiplos, fila assincrona |
| Audio prep | Normalizacao opcional |
| Pagamento | Stripe + PayPal |

## Planos e precos

| Plano | Mensal | Uploads/mes | Status |
|---|---|---|---|
| Free | €0 | **0** (so testa fluxo) | Ativo |
| Starter | €9,99 | 30 | Ativo, "mais popular" |
| Pro | €19,99 | 60 | "em breve" |

- Cobranca em euro, mercado europeu
- "Choose a plan based on upload frequency — no hidden fees"
- Free tier e essencialmente uma vitrine — nao serve pra usar de verdade

## Diferenciais deles vs BeatPost

| Eixo | Vantagem deles |
|---|---|
| **Bulk** | Sobe 30 beats em uma sessao + agenda mes inteiro de uma vez |
| **Calendario visual** | Grid mensal com chips por dia, contadores Scheduled/Upcoming |
| **Billing pronto** | Stripe+PayPal funcionando, preco publico, plano popular definido |
| **Mercado** | UE com preco em euro; alcance fora do PT-BR |
| **Custo marginal** | Templates de texto ~$0 por beat extra; permite preco baixo sustentavel |
| **Formatos** | MP3, WAV, FLAC, M4A, AAC, OGG — BeatPost hoje so MP3 |

## Diferenciais nossos vs Beatloadr

| Eixo | Vantagem BeatPost |
|---|---|
| **IA generativa** | Gemini + Claude geram 3 pacotes A/B/C de titulo/desc/tags reais com trending tags via grounded search. Eles usam template fixo. |
| **Capa por IA** | fal.ai gpt-image-2 ($0,05/imagem) gera capa por estilo+mood. Eles **nao oferecem geracao de capa.** |
| **Analytics proprio** | Pagina /analytics + sub-paginas (visao geral, beats, fontes) ja em producao. O "Pro com analytics" deles e "em breve". |
| **Trending tags** | Gemini grounded search puxa tags em alta. Templates fixos perdem isso. |
| **Mercado PT-BR** | Interface em portugues, comunidade BR, parceiros Rary/Pedro pra lancamento. |
| **Conquistas/gamificacao** | 28 achievements ja entregues; produto ja flerta com retencao alem da utilidade. |

## Onde estamos expostos

1. **Bulk upload nao existe.** Produtor de alto volume (30+ beats/mes) e
   exatamente o ICP que o Beatloadr capturou primeiro. BeatPost ainda
   forca fluxo 1-a-1.
2. **Calendario visual de agendamento** nao existe. A infra (`scheduled_at`)
   esta pronta, mas a vitrine UX ainda nao. Analise de escopo:
   `docs/sessoes/2026-05-19-calendario-agendamento-design.md`.
3. **Preco ancora.** €9,99/mes vai ser referencia mental dos prospects.
   Como custo marginal do BeatPost e maior (Claude + Gemini + fal.ai por
   beat), precificar similar aperta margem.
4. **Eles ja cobram, nos nao.** Aprenderam coisas de billing/disposicao
   a pagar que BeatPost ainda nao aprendeu.

## Onde eles estao expostos

1. **Templates fixos envelhecem.** Quando 1000 produtores publicam com o
   mesmo template `{bpm} BPM {key} Type Beat`, o YouTube comeca a
   tratar como spam. Diferenciacao por IA generativa fica imune a isso.
2. **Sem capa nem analytics integrados** — o produtor ainda precisa de
   ferramenta separada pra cada um.
3. **Sem prova social** no site (sem depoimento, sem numero de usuarios).
   Pode estar tao no comeco quanto BeatPost.
4. **Sem extensao pra TikTok/Shorts** nem mercado regional. Sao
   generalistas eurocentricos.

## Riscos competitivos

- **Medio:** se eles adicionarem IA generativa nos templates, encurta a
  vantagem tecnica. Mas isso obriga eles a subir preco (custo de API).
- **Alto se demorarmos:** cada mes que passa eles capturam mais ICP
  europeu/global. Em PT-BR ainda nao tem rastro deles.

## Oportunidades a copiar (com filtro)

- **Calendario mensal visual** — UI de vitrine. Vale fazer LITE
  (view-only) sem priorizar agora (ver sessao 2026-05-19).
- **Tier free = 0 uploads** — modelo honesto de "testa a UI". Considerar
  na hora de definir billing.
- **Precificacao por frequencia de upload** — eixo de cobranca, nao por
  feature.

## Referencias

- Pagina home: https://beatloadr.com
- Pagina pricing: https://beatloadr.com/pricing
- Pagina features: https://beatloadr.com/features
- Sessao de design do calendario: `../../sessoes/2026-05-19-calendario-agendamento-design.md`
