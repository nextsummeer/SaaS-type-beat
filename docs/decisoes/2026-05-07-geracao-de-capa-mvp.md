# Geracao de capa por IA no MVP (estilo do perfil + mood do beat)

**Data:** 2026-05-07
**Status:** aceita (substitui parcialmente `2026-04-25-capa-manual.md`)
**Tags:** decisao, produto, mvp, ia, capa, fal-ai, ux, retencao

## Contexto

A decisao de 2026-04-25 (`capa-manual.md`) deixou geracao de capa por IA pra V2, alegando custo ($0.20/capa via GPT Image 2), risco de copyright (gerar "estilo Weeknd") e tempo extra de validacao.

Em 2026-05-07, dois fatos novos invalidaram parcialmente essa decisao:

1. **Custo caiu drasticamente.** Gustavo validou em producao geracao de imagens via fal.ai (gpt-image-2) por **$0.05 por imagem** — 4x mais barato que o numero antigo.

2. **Capa gerada por IA e visto pelo Gustavo como diferencial competitivo critico**, nao opcional. Concorrentes (BeatStars, BeatValet) nao oferecem isso. Producer underground tem skill musical mas nao de design — entregar capa de qualidade resolve uma dor real.

Mas a discussao da sessao revelou armadilhas serias na primeira proposta de "gerar capa baseada no nome do artista":

- **Likeness de artista real e problema legal.** IA generativa nao pode (e bloqueia) gerar rosto reconhecivel de Drake.
- **Mapeamento artista→estilo visual e trabalho infinito de manutencao.** Type beat tem rotatividade brutal de artistas referencia.
- **UM prompt fixo gera UM estilo visual.** Nao serve pra cobrir drill agressivo + trap melodico + afrobeat solar + boom bap vintage.

Gustavo ja gerou 4 capas reais com um prompt fixo (estetica analog film, figura solitaria noturna, face apagada por flash) e validou que **o resultado esta no nivel de capas reais de underground type beat**.

## Opcoes Consideradas

### A. Capa manual continua (decisao antiga, V2 reabre)
- **Pros:** Zero custo. Zero risco. MVP fecha rapido.
- **Contras:** Perde diferenciacao competitiva. Producer underground sem skill de design entrega capa amadora ou nenhuma.

### B. Geracao IA baseada no artista de referencia
- **Pros:** Capa "casa" com o artista (Drake → vibe Drake).
- **Contras:** Likeness e proibido. Mapeamento artista→estilo e eterno. Prompt unico nao cobre diversidade. Producer com canal coerente teria capas variando demais (cada artista = visual diferente).

### C. Geracao IA baseada em estilo visual do produtor (perfil) + mood do beat (upload)
- **Pros:** Coerencia visual do CANAL do producer (identidade). Independe do artista (estilo nao envelhece). Sem likeness. Cobertura ampla via biblioteca de prompts. Mood ja capturado no upload.
- **Contras:** Curadoria inicial de 6-7 prompts mestres exige trabalho visual real (1-2 semanas de iteracao). Producers que mudam de vibe entre beats sao penalizados (mas podem trocar estilo por upload).

### D. Geracao IA + sempre permitir upload manual
- **Mesmos pros/contras de C, com:** producer mantem total controle quando tem capa propria pronta.

## Decisao

**Veredito: Opcao D — Capa IA por estilo do perfil + mood do beat, com botao "usar minha propria capa" sempre disponivel em todos os tiers.**

Razao:
1. Coerencia visual do canal e o que separa producer amador de profissional.
2. Estilo independe de artista — nao envelhece com a rotatividade do mercado.
3. Capa custom em todos os tiers respeita producers que tem capa propria perfeita.
4. Mood ja sera capturado no upload (decisao irma `2026-05-07-fluxo-upload-e-inputs-do-produtor.md`) — reaproveita o input.

Consequencia: a regra 6 do `CLAUDE.md` ("Capa manual no MVP") deve ser atualizada.

## Implementacao

### Provider e custo

- **Provider:** fal.ai (gpt-image-2).
- **Custo:** $0.05/imagem (validado em producao por Gustavo).
- **SDK:** `fal-client` Python no backend (`api/app/services/fal_service.py`).
- **Sem A/B/C de capas no MVP.** Geracao unica por upload. Produtor pode regerar manualmente se nao gostou (consome 1 do limite mensal do plano).
- **Sem texto sobreposto.** Capa = so a foto gerada. Producer underground nao usa texto em capa.
- **Sem validacao de qualidade** automatizada no MVP. Confiar no output. Producer regera se sair ruim.

### Biblioteca de estilos visuais (6-7 no MVP)

Cada estilo e um **prompt mestre** com slots variaveis (cena, paleta, sujeito, iluminacao). Curadoria manual feita pelo Gustavo na Fase 1.

Sugestao inicial (nomes provisorios, finalizar na curadoria):

| Slug interno | Nome no UI | Descricao | Publico-alvo |
|--------------|------------|-----------|--------------|
| `ghost_mode` | 👁️ Ghost Mode | Underground melancolico, figura solitaria noturna, face apagada por flash, analog grain | Nettspend, Lucy Bedroque, Bladee, Yung Lean |
| `midnight_drive` | 🌃 Midnight Drive | Atmosferico noturno, neon, carros em rodovia, melancolia urbana | Drake melodico, Don Toliver, The Weeknd |
| `burn_it_down` | 🔥 Burn It Down | Drill agressivo, fumaca, vermelho, mascaras, energia hostil | Pop Smoke, Fivio Foreign, Central Cee |
| `nightmare_mode` | 💊 Nightmare Mode | Rage / hyperpop agressivo, distorcao digital, glitch, alien | Carti WLR, Destroy Lonely, Ken Carson |
| `golden_hour` | 🌅 Golden Hour | Solar, cores quentes, vibracao positiva, vibe afro/amapiano | Tems, Burna Boy, Rema, Ayra Starr |
| `vhs_tape` | 📼 VHS Tape | Vintage hip-hop boom bap, anos 90, NY, P&B duro | J. Cole, Joey Bada$$, Westside Gunn |
| `trap_dreams` | 🌌 Trap Dreams | Trap psicodelico, cores saturadas, fantasia, fluido | Travis Scott, Future luxo, Don Toliver luxo |

**Cada prompt mestre deve:**
- Ter sintaxe explicita de variacao (`rotate between scenes`, `alternate between palettes`) pra nao gerar capas identicas em uploads consecutivos.
- Combinar com modificador do mood (ver tabela em `2026-05-07-fluxo-upload-e-inputs-do-produtor.md`).
- Nao mencionar nome de artista real (evita likeness).
- Especificar "no text in image" pra evitar texto torto.

### Selecao de estilo

#### Setup inicial (uma vez no onboarding)

Galeria visual com cards de cada estilo, cada card mostrando 3 capas reais geradas naquele estilo. Producer escolhe a vibe que e ele.

Formato exato do onboarding fica em aberto — Gustavo vai pensar em uma versao mais criativa/divertida que possa funcionar como gancho de retencao (ex: quiz visual, mood board, etc.). Decisao final do formato fica pra task de design da Fase 1.

#### Por upload (override opcional)

Dropdown discreto no upload: "Estilo: [Ghost Mode ▾]". Default = estilo do perfil. Producer troca pra um beat especifico se quiser.

#### Capa manual

Botao **"Usar minha propria capa"** sempre visivel no upload. Disponivel em **todos os tiers**, nao e premium. Aceita JPG/PNG, max 5MB, sugestao 1280x720+.

### Limite por plano

Billing nao entra no MVP (regra 8 do CLAUDE.md). Mas:
- Toda geracao de capa **registra em `api_usage`** com `feature='cover_generation'` e `cost_usd=0.05`.
- Quando billing entrar (V1.5+), aplicar limite de geracao por tier.
- Producer com capa custom nao consome limite.

### Pipeline integrado

```
UPLOAD (audio + opt. capa custom + artista + mood + estilo override)
   │
   ▼
WORKER convert.py (ja existe)
   │
   ▼
WORKER analyze.py (ja existe — completa metadados de audio)
   │
   ▼
WORKER generate.py (gera 3 packs A/B/C de copy — Claude)
   │  + se capa custom NAO foi enviada:
   │    dispara WORKER cover.py em paralelo
   ▼
WORKER cover.py (NOVO)
   │  - escolhe estilo (perfil ou override)
   │  - monta prompt: estilo_master + mood_modifier + variacao
   │  - chama fal.ai gpt-image-2 ($0.05)
   │  - salva em covers/{user_id}/{beat_id}/cover.jpg
   │  - registra api_usage
   │  - status: cover_ready
   ▼
USUARIO revisa copy + capa
   │  - aprova capa OU clica "regerar" (consome 1 da quota)
   │  - aprova copy OU edita
   ▼
WORKER publish.py (gera mp4 + sobe pro YouTube)
```

## Consequencias

### Decisao antiga revisada

`docs/decisoes/2026-04-25-capa-manual.md` continua valido como **fallback obrigatorio** (botao manual sempre disponivel), mas nao e mais o unico caminho. Nao reescrever — adicionar nota de superseded parcial e linkar pra esta nova ADR.

### CLAUDE.md

Regra 6 muda de:
> **Capa manual no MVP** — beatmaker faz upload da capa. Geracao IA fica pra V2.

Pra:
> **Capa pode ser gerada por IA ou enviada manualmente.** Geracao usa estilo do perfil + mood do beat (sem nome de artista). fal.ai gpt-image-2 a $0.05/imagem. Upload manual disponivel em todos os tiers. Geracao registra em `api_usage`.

### `_tasks-mvp.md` — recorte e tasks novas

**Sai do recorte:**
- "Geracao de capa por IA (V2)" — agora entra no MVP

**Continua no recorte:**
- "Thumbnail por padrao de artista (V2)" — capa NAO usa nome de artista, usa estilo+mood, entao essa linha continua fora do MVP

**Tasks novas (Fase 1, exatos numeros definidos quando atualizar o ledger):**

1. Definir biblioteca de 6-7 estilos visuais (curadoria de prompts mestres + 3 capas exemplo cada)
2. Service `fal_service.py` com integracao fal.ai gpt-image-2
3. Worker `cover.py` (novo) com state machine e idempotencia
4. UI — galeria de selecao de estilo no onboarding
5. UI — dropdown de override de estilo no upload
6. UI — preview da capa gerada na tela de review com botao "regerar"
7. UI — botao "usar minha propria capa" no upload (alterna form)
8. Migration: adicionar `default_visual_style` em `users` (ou tabela `user_settings`)
9. Migration: adicionar `cover_source` ('ai' | 'manual') e `visual_style` em `beats`
10. usage_tracker: registrar custo de geracao de capa
11. Test E2E: upload sem capa custom → capa IA gerada → review → publicacao com capa

### Riscos / pontos a monitorar

- **Curadoria visual e trabalho real.** 6-7 prompts mestres validados visualmente sao 1-2 semanas de iteracao do Gustavo. Bloqueante pra fechar Fase 1. Nao tentar fazer com Claude gerando prompt sem validar visualmente.
- **fal.ai rate limit.** Validar quota ofertada no plano atual. Se bater limite com beta de 50 producers, migrar pra plano superior.
- **Custo agregado.** $0.05 × N geracoes/mes pode escalar. usage_tracker ja prepara o terreno pra billing aplicar limite.
- **Mapeamento artista→estilo NAO existe.** Producer escolhe estilo independente do artista. Aceitar essa separacao — e justamente o que torna a solucao escalavel.
- **Coerencia visual do canal.** Decisao de "estilo no perfil" maximiza coerencia. Producer que muda muito vai ter canal visual variado — aceitavel mas vale monitorar.
- **Producer pode nao gostar do output.** Confiar e deixar regerar (1 quota). Se virar reclamacao recorrente, considerar validacao automatica via CLIP score na V2.

## Referencias

- Sessao do brainstorm: `docs/sessoes/2026-05-07-brainstorm-jornada-cliente.md`
- Decisao irma: `docs/decisoes/2026-05-07-fluxo-upload-e-inputs-do-produtor.md`
- ADR antiga (parcialmente superseded): `docs/decisoes/2026-04-25-capa-manual.md`
- fal.ai docs: https://fal.ai/docs
- gpt-image-2 model: https://fal.ai/models/fal-ai/gpt-image-2
