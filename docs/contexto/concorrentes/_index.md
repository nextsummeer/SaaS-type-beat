# Concorrentes — Panorama

> Indice de concorrentes e ferramentas similares no espaco de automacao para produtores de type beat.
> Atualizar sempre que descobrir nova ferramenta ou mudanca relevante de concorrente existente.

## Mapa rapido

| Ferramenta | Tipo | Plataformas cobertas | Mercado | Risco competitivo |
|---|---|---|---|---|
| [Beatloadr](beatloadr.md) | SaaS web | YouTube (bulk + calendario) | UE / global (ingles, euro) | **Alto** |
| [BeatValet](beatvalet.md) | SaaS desktop (Win/Mac) | FL Studio + BeatStars + YouTube | Global / EUA (ingles) | **Alto** |
| [beatstars-upload (GitHub)](beatstars-upload-github.md) | Script Python open source | BeatStars + YouTube (parcial) | Devs / hobbyistas | Baixo |

## Conclusao estrategica (atualizada 2026-05-19)

- **Dois concorrentes diretos com proposta sobreposta**, atacando angulos diferentes:
  - **Beatloadr** = mesmo recorte do BeatPost (YouTube-only, web) com **bulk + calendario** maduros. Sem IA generativa nem capa.
  - **BeatValet** = recorte mais largo (FL Studio + BeatStars + YouTube) em desktop nativo. Cobre canal de venda que BeatPost nao cobre.
- **Diferenciais do BeatPost vs ambos**: IA generativa real (Gemini + Claude, 3 pacotes A/B/C), capa por IA (fal.ai), analytics proprio ja em producao, gamificacao (conquistas), mercado PT-BR.
- **Onde estamos expostos:**
  - **vs Beatloadr**: sem bulk upload, sem calendario visual, sem billing. Eles cobram ha mais tempo e tem preco-ancora baixo (€9,99 / 30 uploads).
  - **vs BeatValet**: nao cobrimos BeatStars no MVP — plano de mitigacao na V1.5 ([detalhes](../../arquitetura/integracao-beatstars-futura.md)).
- **Tese:** ser o **melhor pro nicho PT-BR de type beats com IA real**. Generalistas em ingles (Beatloadr/BeatValet) nao competem em qualidade de saida nem em comunidade local.

## Como manter este indice

- Cada concorrente tem seu proprio doc nesta pasta (kebab-case, sem acentos).
- Doc de concorrente: o que faz, como funciona tecnicamente, precos, diferenciais, riscos, oportunidades.
- Atualizar `docs/_mapa.md` ao adicionar/remover concorrente.
