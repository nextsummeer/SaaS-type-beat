# Recorte — O que esta FORA da Fase 1 (MVP)

**Criado:** 2026-04-25
**Atualizado:** 2026-04-29
**Status:** ativo
**Tags:** contexto, escopo, mvp

## Filosofia

A Fase 1 valida uma unica hipotese: o produtor consegue publicar beats no YouTube de forma automatizada, com SEO gerado por IA, sem perder 2-3h por upload?

Tudo que nao for essencial pra responder isso fica fora da Fase 1. As fases seguintes (2, 3 e 4) ja estao planejadas — nao sao "talvez", sao proximos passos.

## Fora da Fase 1 — entra na Fase 2

### Analytics do YouTube
**Por que fora:** Precisa OAuth scope adicional, estrutura de cache, dashboard. Sem videos publicados por pelo menos 7 dias, nao tem dados pra mostrar.

### Gamificacao (rank, badges, metas)
**Por que fora:** Depende de base de usuarios ativa para ter sentido competitivo.

### Geracao de capa por IA
**Por que fora:** Custo por chamada, latencia, risco de copyright. Capa manual reduz variaveis no MVP.

**Quando volta:** Fase 2 com toggle "Usar capa IA" e disclaimer.

### Thumbnail por padrao de artista
**Por que fora:** Risco de copyright especifico (gerar "Weeknd thumbnail"). V2 com estilos genericos (dark, melodic, hard).

## Fora da Fase 1 — entra na Fase 3

### Biblioteca de tutoriais curados
**Por que fora:** Requer producao de conteudo editorial, fora do escopo tecnico da Fase 1.

### Drum Kits e Sample Packs para assinantes
**Por que fora:** Requer curadoria, licenciamento e estrutura de entrega de arquivos.

## Fora da Fase 1 — entra na Fase 4

### Competicoes mensais de beat
**Por que fora:** Requer base de usuarios suficiente para ter competicao relevante.

### Marketplace produtor-artista
**Por que fora:** Requer dois lados do marketplace (produtores e artistas), pagamentos, contratos. Escopo separado.

## Fora da Fase 1 — decisao tecnica (V2+)

### Multi-canal YouTube
**Por que fora:** Complica OAuth (N tokens por user), UI e quota. 1 canal por usuario no MVP.

**Quando volta:** Quando >40% dos pagantes pedirem.

### Banco proprio de tags trending
**Por que fora:** Curadoria continua exige horas/semana. Gemini grounded search resolve com qualidade aceitavel.

**Quando volta:** V3 se Gemini grounded falhar (sinal: usuarios reclamarem das tags).

### Multi-tenant workspace (time / label)
**Por que fora:** Caso de uso de label com varios produtores. Ainda nao validado.

### Importacao de catalogo existente
**Por que fora:** Caso de uso secundario — beatmaker com 100 beats no canal. Entra depois de validar fluxo novo.

### Billing / Stripe
**Por que fora:** Planos e precos ainda sendo definidos. Nao entra no MVP.

## Fora do projeto — permanente

### Cross-posting (TikTok / Instagram)
Dinamica, audiencia e formato diferentes. Se virar produto core, e outro produto.

### Producao de beats por IA (geracao musical)
Negocio diferente, parceria diferente.

### CRM de beatmaker (leads, contratos)
Nao e o problema do ICP definido.

### Mobile app
Beatmaker faz beat no DAW desktop. Web responsiva resolve. App mobile nao agrega ate ter 100+ usuarios ativos.

## Como decidir se algo entra ou sai

Pergunta: **"Sem isso o produtor piloto nao consegue validar que a Fase 1 funciona?"**

- Sim → entra
- Nao → fora (define em qual fase futura)
- Talvez → fora ate alguem pedir explicitamente
