# Recorte do MVP — O que esta FORA

**Criado:** 2026-04-25
**Status:** ativo
**Tags:** contexto, escopo, mvp

## Filosofia

MVP nao e produto. MVP e **menor experimento que valida hipotese**. Tudo que nao for essencial pra responder "beatmaker paga R$50/mes pra automatizar postagem com A/B/C?" fica fora.

## Fora do MVP — V2

### Multi-canal YouTube
**Por que fora:** Beatmaker iniciante tem 1-2 canais. Multi-canal complica OAuth (N tokens), UI (dropdown de canal por publicacao), e limite de quota.

**Quando volta:** Quando >40% dos pagantes pedirem ou quando entrarem beatmakers com 5+ canais ativos.

### Geracao de capa por IA (padrao por artista)
**Por que fora:** Custo $0.20/capa, latencia, risco de copyright, beatmaker tem opiniao forte sobre visual. Capa manual reduz variaveis no MVP.

**Quando volta:** V2 com toggle "Usar capa IA" e disclaimer de copyright.

### Metricas YouTube Analytics
**Por que fora:** Precisa OAuth scope adicional (analytics.readonly), estrutura de cache, dashboard de visualizacao. Sem dados reais (precisa do video ja com 7+ dias), nao tem o que mostrar pros primeiros 10 users.

**Quando volta:** V2 quando primeiros pagantes tiverem 10+ videos publicados.

### Banco proprio de tags trending
**Por que fora:** Curadoria continua exige horas/semana que nao temos. Gemini grounded search resolve com qualidade aceitavel.

**Quando volta:** V3 se Gemini grounded falhar em qualidade (sinal: usuarios reclamarem que tags geradas nao estao no YouTube).

### Thumbnail por padrao de artista
**Por que fora:** Mesmas razoes da capa IA + risco de copyright especifico (gerar "Weeknd thumbnail" pode pisar em direito autoral).

**Quando volta:** V2 com curadoria de "estilos" genericos (dark, melodic, hard) sem referenciar artista.

## Fora do MVP — V3

### Multi-tenant workspace (time)
**Por que fora:** Gerente de beatmakers, label com varios produtores. Caso ainda nao validado.

### Importacao de catalogo existente
**Por que fora:** Beatmaker que ja tem 100 beats no canal querer trazer pra dashboard. Caso de uso secundario.

### Cross-posting (TikTok / Instagram)
**Por que fora:** Cada plataforma tem rules, OAuth, formato distintos. Aumenta superficie 3x sem evidencia de demanda.

### Mobile app
**Por que fora:** Beatmaker faz beat no DAW desktop. Upload ja roda no browser. App mobile nao agrega ate ter 100+ users.

## Fora do MVP — Permanente (nunca neste projeto)

### Sociaisr alem de YouTube
TikTok e Instagram tem dinamica diferente, audiencia diferente, formato diferente. Se virar produto core, e outro produto. Manter foco.

### Marketplace de beats (concorrer com BeatStars)
Saindo do escopo. Eles tem 10M users, network effects.

### Producao de beats (geracao musical IA)
Negocio diferente, parceria diferente.

### CRM de beatmaker (gestao de leads, contratos)
Nao e o problema do ICP definido.

## Como decidir se algo entra ou sai

Pergunta: **"Sem isso o beatmaker piloto nao consegue validar a hipotese?"**

- Sim → entra
- Nao → fora (V2/V3)
- Talvez → fora ate alguem pedir explicitamente
