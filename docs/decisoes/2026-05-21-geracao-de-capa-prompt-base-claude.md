# Geracao de capa por IA: prompt base mestre + brief + Claude runtime

**Data:** 2026-05-21
**Status:** aceita (substitui `2026-05-07-geracao-de-capa-mvp.md`)
**Tags:** decisao, produto, mvp, ia, capa, fal-ai, claude, prompt-engineering, ux

## Contexto

A ADR de 2026-05-07 estabeleceu capa IA via fal.ai gpt-image-2 com biblioteca de 6-7 estilos visuais fixos (Ghost Mode, Midnight Drive, Burn It Down, etc.) escolhidos no onboarding + modificadores de mood. 10 tasks foram pausadas em 2026-05-14 com Gustavo declarando: *"Ainda estou estudando como fazer isso sem frustrar o cliente."*

Entre 2026-05-07 e 2026-05-21, Gustavo realizou testes pessoais com Claude + fal.ai e descobriu:

1. **Existe UM prompt base mestre** com estrutura fixa (analog film + sujeito obscuro + setting + lighting + palette + energy + shot on...) que funciona como molde vazio.

2. **Brief de 1-2 linhas do produtor + nome do artista de referencia faz o Claude gerar prompt final radicalmente especifico.** Validado em 3 iteracoes: "Drake + sexy + mulher + vermelho" → capa boudoir-noir radio-ready; "lil baby + trap + hood USA" → capa Atlanta documentary; "Drake + agressivo + nao love song" → capa OVO cold Toronto.

3. **Custo real validado:** fal.ai gpt-image-2 quality=low gera capa boa em ~30s a **$0.0083/imagem** (vs $0.05 estimado em maio). Soma com Claude (~$0.005/prompt) = ~$0.013/capa.

4. **OpenAI direto NAO compensa** trocar: latencia 30-60s tipica (pior), preco equivalente, menos features.

5. **Comportamento real de produtor type beat:** segundo observacao de Gustavo, produtor permanece no mesmo "tipo" (mesmo artista de referencia, mesma estetica visual) por MESES (caso real: 5+ meses sem mudar). Coerencia visual do canal e parte da identidade comercial.

6. **Capa nasce ANTES da loja, nao depois.** Produtor tipicamente sobe beat na BeatStars/Airbit antes do YouTube. Se BeatPost gera capa separada, quebra coerencia entre loja e YouTube. Solucao: BeatPost vira o lugar onde a capa NASCE, depois e usada nos dois (loja + YouTube). Pra casos retroativos, drag-and-drop manual (ja implementado em T6.19) resolve.

## Decisao

### 1. Modelo de geracao

```
PROMPT BASE MESTRE (1 unico, secreto, hardcoded)
   +
BRIEF DO PRODUTOR (5 campos estruturados + nota livre opcional)
   ↓
CLAUDE (Sonnet 4.6) — gera prompt final especifico
   ↓
fal.ai gpt-image-2 quality=low — gera imagem
   ↓
Salva em Supabase Storage + linha em cover_library
```

### 2. Brief estruturado (5 campos, MVP inicial)

1. **Artista de referencia** — **TEXTO LIVRE digitado pelo produtor** (correcao em 2026-05-21 pos-implementacao). Inicialmente eu havia mantido FK pra `artistas_referencia` no schema, mas Gustavo lembrou que sao milhares de artistas (todo dia nasce um novo) — curadoria manual e inviavel. A tabela `artistas_referencia` continua existindo mas e OPCIONAL pra autocomplete futuro. T2.7 (curadoria 80-100 artistas) vira backlog como "banco de aprendizado dos artistas mais usados".
2. **Sujeito** — cards: 🧑 jovem | 👩 mulher | 👥 grupo | 🚫 sem pessoa | 🎵 so objeto
3. **Ambiente/Setting** — cards: 🏙️ rua/hood | 🏨 interior luxo | 🌃 noturno | 🌅 natureza | ⚡ neon | 🏛️ minimalista
4. **Iluminacao/Paleta** — cards: 🌞 sol duro | 🌆 golden hour | 🔴 vermelho | 💙 azul/neon | 🖤 noturno | 🎞️ vintage
5. **Energia/Mood** — cards: 😈 agressivo | 💔 melancolico | 🔥 sexy | 👑 hood famous | 🌌 atmosferico | 🎉 festa

+ **Nota livre (opcional):** campo texto pra detalhes que nao cabem nos cards.

**Evolucao planejada:** apos engenharia do prompt amadurecer (~3-4 sprints de uso real), reduzir para 3 campos (Artista + Energia + Nota Livre). Outros 3 viram inferencia do Claude.

### 3. Estilo padrao salvo por produtor

Modelo hibrido:

- **Primeira vez na aba `/capas`:** wizard preenche os 5 campos → gera 4 capas teste → produtor aprova → BeatPost salva como `default_brief` no perfil dele
- **Uso diario:** botoes "Gerar 1 capa (1 credito)" / "Gerar 3 variacoes (3 creditos)" usam o brief padrao direto
- **Mudanca de fase:** botao "Editar estilo padrao" no header da aba reabre o wizard
- **Brief pontual diferente:** botao "Gerar com brief diferente" abre form pra override sem mudar o padrao

Por que hibrido: produtor permanece meses no mesmo tipo (observacao de Gustavo). Forcar brief em cada geracao seria atrito desnecessario pro caso de 90%.

### 4. Aba dedicada `/capas` com biblioteca

Nova rota no app (sidebar) com:
- Header: estilo padrao atual + botao "editar"
- Botao primario: "Gerar capa" (com opcoes de lote)
- Botao secundario: "Gerar com brief diferente"
- Grid: biblioteca de capas geradas + capas manuais subidas
- Cada capa tem: thumb, data, badge "AI" ou "manual", botoes "usar em beat" / "descartar"

No upload de beat, picker mostra biblioteca do produtor + opcao "subir nova manual" + atalho "gerar nova agora" (que abre modal sobreposto).

### 5. Sistema de creditos (sem billing)

Tiers (limite mensal de geracoes):

| Tier | Capas/mes | Custo BeatPost | Posicionamento |
|------|-----------|----------------|----------------|
| Free | 3 | $0.04 | Teste real, gancho |
| Intermediario | 15 | $0.20 | Produtor casual |
| Premium | 40 | $0.52 | Produtor profissional |

**Primeira capa do wizard e GRATIS** (nao consome credito do tier). Flag `has_generated_first_cover` em user_profiles (default false). Worker pula `consume()` na primeira execucao por user. Padrao de SaaS sério (Canva, Loomly). Resolve dilema do tier free com 3 creditos nao poder gastar 1/3 so pra ver resultado do setup.

Toda geracao registra em `api_usage` com `feature='cover_generation'` e `cost_usd=0.013` (Claude + fal.ai juntos).

Display de custo **explicito** antes de gerar: *"Isso vai consumir X creditos do seu plano (Y restantes)"*.

### 6. UX assincrona

Latencia real: ~30-40s por capa (Claude ~3s + fal.ai ~30s). Acima do limite confortavel sincrono (~10s).

Producer clica "gerar" → backend dispara job QStash → UI mostra skeleton + estado "Gerando..." → producer pode sair pra outra aba ou pagina → badge no menu + notificacao quando fica pronto → volta na aba `/capas` e ve novas capas no grid.

### 7. Prompt base = receita secreta

O prompt base mestre e a peca critica do produto. Se vazar, alguem replica o produto.

**Local de armazenamento (MVP):** hardcoded em `api/app/services/cover_prompt_builder.py` em constante. Git e privado (apos T0.6 ser privatizado), acesso restrito a Henrique + Rary.

**Migracao futura (quando virar dor de iteracao):** tabela `system_prompts` no Supabase com RLS apenas service_role + versionamento (rows v1, v2, v3...). Permite editar sem deploy + A/B testar prompts.

### 8. Capa manual continua disponivel em todos os tiers

Decisao da ADR `2026-04-25-capa-manual.md` continua valida como fallback. Producer com capa pronta da loja arrasta-e-solta no upload (drag-drop ja implementado em T6.19). Producer com capa especifica fora do brief pode subir manualmente. Nao consome creditos.

### 9. Customer journey final

```
PRIMEIRA VEZ
─────────────────────────────────────────
[Produtor entra em /capas]
   ↓
[Wizard de 5 campos]
   ↓
[Click "Gerar 4 capas teste"] → consome 4 creditos
   ↓
[~30s skeleton]
   ↓
[Grid com 4 capas + "Curtiu? Esse vai ser seu estilo padrao"]
   ↓
[Confirma → salva default_brief]


USO RECORRENTE
─────────────────────────────────────────
[Produtor entra em /capas]
   ↓
[Ve biblioteca + header com estilo atual]
   ↓
[Click "+ Gerar 1 capa" (1 credito)] OU [+3 variacoes (3 creditos)]
   ↓
[~30s skeleton — produtor pode sair]
   ↓
[Notificacao "Capa pronta"]
   ↓
[Volta na aba, ve nova capa, salva ou descarta]


NO UPLOAD DE BEAT
─────────────────────────────────────────
[Produtor sobe beat em /upload]
   ↓
[Picker de capa: biblioteca + manual + atalho "gerar agora"]
   ↓
[Click numa capa da biblioteca]
   ↓
[Beat publicado com essa capa]
```

## Consequencias

### Saidas do recorte

Cluster fixo por artista (proposta intermediaria descartada em favor do prompt base + Claude). Geracao avulsa sem default (descartada por observacao de comportamento real do produtor).

### Entradas no recorte (MVP)

- Aba `/capas` dedicada
- Biblioteca de capas reusavel (tabela `cover_library`)
- Wizard de configuracao de brief padrao
- Sistema de creditos sem billing (so tracking + bloqueio quando estoura)
- Integracao Claude no fluxo de capa (prompt builder)
- Worker `cover.py` que orquestra Claude + fal.ai
- Modelo hibrido default + override

### Saidas do MVP (V1.5+)

- Variacao img2img de capa especifica (selecionar capa existente → gerar 3 parecidas mantendo composicao)
- Extensao de navegador pra importar capa de loja BeatStars/Airbit (avaliado em 2026-05-21, descartado: alto custo de manutencao, risco de TOS, escopo expande produto)
- Migracao prompt base hardcoded → tabela `system_prompts` versionada
- Billing real (limites de creditos atualmente nao bloqueiam, so registram em api_usage)
- Conjunto reduzido de 3 campos no brief (apos engenharia amadurecer)

### CLAUDE.md regra 6

Atualizar de:
> Capa pode ser gerada por IA ou enviada manualmente. Geracao usa estilo visual escolhido pelo produtor (perfil) + mood do beat (upload). Sem nome de artista no prompt (likeness). Provider: fal.ai gpt-image-2 ($0.05/imagem). Upload manual disponivel em todos os tiers. Toda geracao registra em `api_usage`. Detalhes em `docs/decisoes/2026-05-07-geracao-de-capa-mvp.md`.

Pra:
> Capa pode ser gerada por IA (aba dedicada `/capas`) ou enviada manualmente. Geracao usa prompt base mestre + brief estruturado (artista + sujeito + ambiente + luz + energia) → Claude monta prompt final → fal.ai gpt-image-2 quality=low gera ($0.0083/imagem, ~30s). Sem nome de artista real no prompt final pro fal.ai (likeness). Capas ficam em biblioteca reusavel. UX assincrona. Limite de creditos por tier (Free/Intermediario 15/Premium 40). Upload manual disponivel em todos os tiers. Toda geracao registra em `api_usage` (cost_usd=0.013 = Claude+fal.ai). Detalhes em `docs/decisoes/2026-05-21-geracao-de-capa-prompt-base-claude.md`.

### Riscos

- **Prompt base e single point of failure visual.** Se prompt base for mediocre, todas as capas viram mediocres. Mitigacao: validacao visual iterativa por Gustavo antes de lancar, testes A/B na V1.5.
- **Claude pode gerar prompt mal interpretado** em casos edge (artista nicho, brief estranho). Mitigacao: fallback pra prompt generico se Claude retornar prompt < 200 chars ou com palavras proibidas (likeness terms).
- **Custo Claude pode escalar.** Se prompt base for muito grande (4000+ tokens), preco/capa sobe. Mitigacao: monitorar tokens_in via usage_tracker, ajustar prompt base se necessario.
- **Latencia 30s e ruim.** UX assincrona resolve, mas exige boa notificacao. Mitigacao: badge + toast + opcao notificacao desktop (PWA).
- **Tier free generoso demais.** $0.04-0.07/user/mes pode escalar com aquisicao. Mitigacao: comeca conservador (3 capas free), expande se conversao for boa.
- **fal.ai como dependencia.** Se fal.ai cair ou subir preco, MVP afeta. Mitigacao: arquitetura permite trocar provider (fal_service.py isolado), mas exige reavaliacao do tier de qualidade.

## Referencias

- ADR superseded: `docs/decisoes/2026-05-07-geracao-de-capa-mvp.md`
- ADR irma (capa manual): `docs/decisoes/2026-04-25-capa-manual.md`
- ADR de input do produtor: `docs/decisoes/2026-05-07-fluxo-upload-e-inputs-do-produtor.md`
- Sessao da pesquisa (2026-05-21): pendente — criar apos esta ADR
- fal.ai gpt-image-2: https://fal.ai/models/openai/gpt-image-2
- Artificial Analysis benchmark: https://artificialanalysis.ai/image/models/gpt-image-2
- Modelo Claude usado: Sonnet 4.6 (mesmo de generate.py)
