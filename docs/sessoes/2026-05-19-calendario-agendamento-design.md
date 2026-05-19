# 2026-05-19 — Design do calendario visual de agendamento

**Tags:** ui-design, agendamento, concorrente-beatloadr, escopo-mvp, pos-mvp

## Contexto

Gustavo descobriu o [Beatloadr](https://beatloadr.com) (achou via parceria
com um youtuber). E o concorrente mais direto do BeatPost ate agora: mesma
proposta de automatizar upload de type beats no YouTube. Compartilhou print
do dashboard deles mostrando um **calendario visual mensal** com beats
agendados em celulas de dia, e quis implementar o equivalente "agora".

Antes de codar, abrimos esta sessao pra (a) analisar o que o calendario
deles faz, (b) mapear o que ja existe no BeatPost, (c) propor variantes de
escopo, (d) decidir quando isso entra no roadmap.

## 1. O que o Beatloadr entrega no calendario

Pelo print compartilhado e pela analise da pagina /features deles:

- Grid mensal padrao (domingo a sabado, 6 linhas)
- Cabecalho com contadores: `Scheduled: 6` e `Upcoming: 4`
- Navegacao mes anterior / mes proximo + botao de retorno ao mes atual
- Cada beat agendado vira um chip dentro da celula do dia (thumbnail 24px
  + titulo truncado tipo "Dark Freestyl...")
- Hover em celula vazia mostra "+" pra adicionar/agendar
- Cores diferentes por beat (parecem aleatorias ou por status)
- Acompanhado de feature "agende o mes inteiro" (bulk scheduling)

**Por que funciona pra eles:** o plano Starter (€9,99) suporta 30 uploads
por mes. O calendario *cheio* e o argumento de venda visual — "olha como
sua consistencia fica organizada".

## 2. Estado atual do BeatPost

Auditoria do codigo (grep + leitura):

- ✅ `posts.scheduled_at timestamptz` ja persiste data/hora de publicacao
- ✅ Status `scheduled` no state machine de beats
- ✅ `DateTimePicker.tsx` ja existe em `/beats/[id]/review` (picker por beat)
- ✅ Worker `publish.py` passa `scheduled_at` como `publishAt` pro YouTube
- ✅ `/beats` ja lista todos os beats com filtros e status colorido
- ❌ Nao existe view de calendario mensal
- ❌ Nao existe agrupamento visual por dia
- ❌ Nao existe drag-and-drop pra reagendar
- ❌ Bulk upload (varios beats de uma vez) nao existe — fluxo e 1 a 1

**Diagnostico:** infra de scheduling esta pronta. Falta SO a UI visual.

## 3. Tensao honesta (ponto cego declarado)

O calendario do Beatloadr brilha porque eles fazem **bulk de 30 beats por
mes**. Hoje no BeatPost o produtor sobe 1 beat por vez, e ate o Rary so
publicou 4 beats no total. **Um calendario com 1-2 chips por mes nao
vende.** O par bulk+calendario e o ativo de venda; calendario sozinho e
metade da feature.

Alem disso, o `_tasks-mvp.md` tem 3 bloqueadores criticos abertos: aumento
de quota YouTube, OAuth verification (4-6 semanas), Rary republicar pra
validar o fix do codec. Calendario nao mexe em nenhum deles.

## 4. Variantes de escopo

### Variante A — LITE view-only (~3-4h)

Pagina `/agenda` (ou `/beats/agenda`). Grid 7x6 do mes atual. Cada beat
com `scheduled_at` no mes vira um chip na celula do dia. Click no chip
navega pra `/beats/[id]/review`. Navegacao prev/next mes. **Sem** drag,
**sem** criar beat clicando em celula vazia.

- Endpoint novo: nenhum (`/api/beats` ja retorna scheduled_at)
- Componente novo: `MonthCalendar.tsx`
- Pro: vitrine de "olha como fica organizado", liga a Fase 2 (analytics)
- Contra: com 4 beats agendados, calendario parece vazio

### Variante B — MEDIO interativo (~1 dia)

Tudo da Variante A + drag-and-drop pra reagendar (atualiza
`posts.scheduled_at` via PATCH) + click em celula vazia abre modal de
upload rapido (pre-preenche data). Filtros por status (scheduled,
publishing, published) com cores diferentes.

- Endpoint novo: `PATCH /api/posts/:id/reschedule`
- Bibliotecas: `@dnd-kit/core` (~10kb gz)
- Pro: ja parece produto de verdade
- Contra: regra do YouTube — `publishAt` so funciona pra video unlisted;
  mudar data em video ja published nao faz nada. Precisa enforcement.

### Variante C — COMPLETO com bulk (~3-4 dias)

Variante B + tela de **bulk schedule**: usuario seleciona N beats
`ready_for_review`, escolhe regra (1 por dia / 2 por semana / dias
especificos), sistema preenche scheduled_at automaticamente. Aqui o
calendario ENFIM brilha porque enche.

- Tabela nova ou regra de allocation em memoria
- Toca em conversao em massa (que ainda nao existe no upload)
- Pro: paridade real com Beatloadr + diferencial (capa IA + 3 pacotes)
- Contra: e meia-feature de **bulk upload** disfarçada. Bulk upload tem
  implicacoes em quota YouTube (5 uploads/dia em videos novos sem 
  trust score), custo de IA (3x Claude + 3x Gemini), UX de revisao em
  massa. Nao e UI — e produto.

## 5. Decisao tomada

**Adiar implementacao.** Criar task formal no `_tasks-mvp.md` (provavel
T6.X "Calendario visual de agendamento") com escopo da **Variante A
(LITE view-only)** como entregavel inicial. Variantes B e C ficam como
upgrades naturais quando bulk upload entrar na agenda (pos-MVP).

**Quando desbloquear a T6.X:**

1. Rary republica beat e fix do codec valida (`_tasks-mvp` proximo passo)
2. Quota YouTube aumentada OU caminho definido pra OAuth verification
3. Bloco capa IA destravado OU formalmente movido pra V2

Razao: as 3 pendencias acima sao caminho critico pro beta. Calendario
nao e. Implementar agora nao adianta beta — atrasa.

## 6. Subproduto desta sessao

- **Beatloadr passa a ser concorrente #1** (mais direto que BeatValet).
- Criar `docs/contexto/concorrentes/beatloadr.md` com ficha estruturada.
- Atualizar `docs/contexto/concorrentes/_index.md` com nova linha + revisao
  da conclusao estrategica.

## Proximos passos

- [x] Criar este doc de sessao
- [ ] Criar ficha do concorrente `concorrentes/beatloadr.md`
- [ ] Atualizar `concorrentes/_index.md` com Beatloadr + nova conclusao
- [ ] Atualizar `_mapa.md` com os 3 docs novos
- [ ] **NAO codar calendario agora** — aguardar destravamento dos bloqueadores
- [ ] Quando destravar: abrir T6.X formal no `_tasks-mvp.md` e seguir o
  workflow normal (plan mode → executar)

## Referencias

- Beatloadr home: https://beatloadr.com
- Beatloadr pricing: https://beatloadr.com/pricing (Free €0, Starter €9,99/30 uploads, Pro €19,99/60 "em breve")
- Beatloadr features: https://beatloadr.com/features (templates fixos com variaveis, sem IA generativa, sem capa)
