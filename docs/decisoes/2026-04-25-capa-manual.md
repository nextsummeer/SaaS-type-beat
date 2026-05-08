# Capa upload manual no MVP (vs geracao por IA)

**Data:** 2026-04-25
**Status:** parcialmente superseded em 2026-05-07
**Tags:** decisao, produto, mvp, escopo, ia, superseded-parcial

> ⚠️ **Atualizacao 2026-05-07:** Esta decisao foi parcialmente revisada. Capa manual continua disponivel em todos os tiers como fallback obrigatorio, mas geracao por IA tambem entra no MVP (via estilo do perfil + mood do beat, nao por nome de artista). Custo caiu pra $0.05/imagem via fal.ai gpt-image-2. Ver: `docs/decisoes/2026-05-07-geracao-de-capa-mvp.md`.

## Contexto

Sessao fundadora elencou geracao automatica de thumbnail por padrao de artista (sec 11.3) como diferencial — Weeknd type beat = mulher + luz vermelha; Netspend = estetica trash. GPT Image 2 entregaria isso. Custo ~$0.20/capa.

Mas tambem foi anotado: cada variavel a mais aumenta superficie de erro e tempo de validacao. Capa e elemento muito visual, beatmaker tem opiniao forte sobre isso, e qualquer geracao que nao agrade vira friccao.

## Opcoes Consideradas

### 1. Capa manual (user faz upload de jpg/png)
- **Pros:** Zero custo de IA. Zero variavel pra debugar. User tem controle total. MVP fecha mais rapido.
- **Contras:** User precisa ter capa pronta. Tira automacao de uma das pecas mais tempo-intensivas.

### 2. Capa gerada por IA com base em padrao de artista
- **Pros:** Diferencial real. Mostra que a ferramenta entende o nicho.
- **Contras:** Custo $0.20/beat. Latencia. Risco de gerar imagem que beatmaker nao gosta. Disputa de direito autoral (gerar "estilo Weeknd" pode pisar em copyright). Trava MVP em mais 1-2 semanas.

### 3. Capa por template + variaveis (sem IA)
- **Pros:** Custo zero, rapido.
- **Contras:** Visual pobre, vira "ferramenta amadora" — perde diferenciacao.

## Decisao

**Veredito: Opcao 1 — Capa manual.**

MVP entrega operacao automatizada (conversao + analise + 3 copies + agendamento + upload). Capa fica pro user. V2 reabre essa decisao.

### Implementacao

- UI: input file `<input type="file" accept="image/jpeg,image/png" />` no form de upload
- Backend: valida formato (jpg/png), tamanho (max 5MB), dimensoes (>=1280x720 recomendado, valida com aviso nao-bloqueante)
- Storage: `covers/{user_id}/{beat_id}/cover.jpg`
- A mesma capa e usada nas 3 variacoes A/B/C (consistencia visual da marca do beatmaker)

## Consequencias

- V2 prioritario: gerar capa por padrao de artista quando beatmaker autorizar (toggle "usar capa IA"). Necessita resolver questao de copyright primeiro (avisar user que e referencia, nao reproducao)
- Onboarding deve ter um "exemplo de capa boa" — capa 1280x720, sem texto pequeno, sem logos de artistas reais
- Documentar que YouTube exige conta verificada pra subir thumbnail custom; se falhar, video fica com auto-frame da timeline
