# _tasks — Conquistas / Gamificação @gustavo

**Criado:** 2026-05-14
**Atualizado:** 2026-05-14
**Outcome:** Produtor abre `/conquistas` na sidebar e vê 14 conquistas (bronze/prata/ouro) em esferas com gradiente. Algumas já desbloqueadas com brilho, outras bloqueadas com cadeado + barra de progresso. Toast aparece quando desbloqueia algo novo. Card "próxima conquista" no dashboard mostra a mais perto de cair.

**Iniciado:** 2026-05-14
**Status:** em-execucao
**Tags:** beatpost, conquistas, gamificacao, retencao, motivacao

## Contexto

Decidido em 2026-05-14, logo após fechar a Fase 2 (Analytics). Faz parte do roadmap futuro (ver `project_roadmap_futuro.md` na memória) que Gustavo deixou anotado: 1) gamificação, 2) keyword research VidIQ, 3) conteúdo educacional. Esta é a primeira.

**Por quê agora:** maior problema dos beatmakers iniciantes é **desistir cedo** porque acham que tá dando pouca view. Gamificação ataca diretamente esse churn nos primeiros 60-90 dias com:
- **Streaks de postagem** (combate o "parei de postar")
- **Marcos pequenos** (100, 1k views) celebrados com peso
- **Tiers progressivos** (bronze → prata → ouro) dão senso de jornada

Inspiração visual: Opal app, Quittr — esferas/globos com gradiente colorido + glow, dark mode, sensação épica.

## Decisões fechadas

| Tema | Decisao | Motivo |
|---|---|---|
| Modelo | Streaks + Achievements + Volume | Combina constância (streak) com marcos acumulados (volume + views) |
| Tiers | Bronze / Prata / Ouro | Visual + senso de progressão. 6 bronze, 4 prata, 4 ouro |
| Streaks | "X beats em Y dias" (não corrido) | Type beat dá trabalho, fazer todo dia é brutal. Flexibilidade mantém motivação |
| Catálogo | No código Python (constante) | v1 não precisa CMS. Quando crescer, migrar pra tabela |
| Detecção | Lazy + dentro do polling do dashboard | Sem cron. Quando user acessa, recalcula. 1 query extra negligível |
| Notificação | Toast + destaque na aba | Surpresa imediata sem ser intrusivo |
| Conquista secreta | 1 placeholder ("Conquista misteriosa") | Gustavo decide critério depois |
| Mood | Não usado (consistente com Analytics) | Mood é input pra capa, não medible |

## Catálogo de Conquistas (14 total)

### 🔥 Streaks de postagem (3)
- `streak_warm` — **Aquecendo**: 5 beats nos últimos 7 dias · Bronze
- `streak_fire` — **Em chamas**: 15 beats nos últimos 30 dias · Prata
- `streak_legend` — **Lenda viva**: 50 beats nos últimos 90 dias · Ouro

### 🎵 Volume de beats (4)
- `volume_first` — **Primeiro tijolo**: 1 beat publicado · Bronze
- `volume_10` — **Empilhando**: 10 beats · Bronze
- `volume_50` — **Catálogo sólido**: 50 beats · Prata
- `volume_100` — **Máquina**: 100 beats · Ouro

### 👁 Views totais do canal (4)
- `views_100` — **Primeira centena**: 100 views totais · Bronze
- `views_1k` — **Mil olhos**: 1k views · Bronze
- `views_10k` — **Dez mil**: 10k views · Prata
- `views_100k` — **Cem mil**: 100k views · Ouro

### 🚀 Hit individual (2)
- `hit_1k` — **Bombou**: 1k views em 1 beat só · Prata
- `hit_10k` — **Mega hit**: 10k views em 1 beat · Ouro

### 🤫 Secreta (1)
- `secret_001` — **Conquista misteriosa**: ??? · Ouro (placeholder, sem critério)

## Tasks

Legenda: `[ ]` pendente · `[x]` concluida · `[~]` em andamento

---

### Bloco A — Backend

#### `[ ]` T9.1 — Migration SQL `user_achievements`
- **Arquivo:** `supabase/migrations/010_user_achievements.sql`
- **O que fazer:** tabela com `(user_id, achievement_key)` PK + `unlocked_at` + RLS + GRANT service_role
- **Critério:** SQL aplica sem erro, `select * from user_achievements` retorna vazio com RLS ativo

#### `[ ]` T9.2 — Service `achievements_service.py` com catálogo + detecção
- **Arquivo:** `api/app/services/achievements_service.py`
- **O que fazer:**
  - Constante `CATALOG` com as 14 conquistas (key, title, description, tier, category, target, formula)
  - Função `evaluate(user_id)` que:
    1. Busca dados necessários (beats publicados, views totais, hit individual, etc)
    2. Pra cada conquista do catálogo, calcula se está desbloqueada + progresso atual
    3. Compara com já-desbloqueadas no banco
    4. Insere as recém-desbloqueadas
    5. Retorna lista completa com flag `newly_unlocked`
- **Critério:** chamada `evaluate(user_id)` retorna lista de 14 itens com status correto

#### `[ ]` T9.3 — Endpoint `GET /achievements`
- **Arquivo:** `api/app/routes/achievements.py`
- **O que fazer:** chama service, retorna JSON estruturado pro front

---

### Bloco B — Frontend

#### `[ ]` T9.4 — Tipos + fetch em `lib/api.ts`
- `AchievementTier`, `AchievementStatus`, `Achievement`, `AchievementsResponse`
- `fetchAchievements(token)`

#### `[ ]` T9.5 — Página `/conquistas`
- **Arquivo:** `web/app/(app)/conquistas/page.tsx`
- Grid de cards estilo Opal (esferas com gradiente + glow)
- Agrupado por categoria
- Conquistas bloqueadas em cinza com cadeado
- Conquistas desbloqueadas com gradient colorido + brilho + data
- Barra de progresso pras que ainda estão por desbloquear

#### `[ ]` T9.6 — Sidebar: novo item "Conquistas"
- Ícone `Trophy` ou `Award` do lucide
- Adicionar antes de "Configurações"

#### `[ ]` T9.7 — Card no Dashboard: "Próxima conquista"
- Mostra a conquista mais perto de desbloquear (menor distância pro target)
- Com barra de progresso e CTA "Faltam X views"

#### `[ ]` T9.8 — Toast de desbloqueio
- Componente `AchievementToast`
- Triggerado quando `newly_unlocked` vem do polling do `<DashboardStats>`
- Mostra a esfera + nome + tier por 6s, então some

---

### Bloco C — Polimento

#### `[ ]` T9.9 — Tests do service
- Mockar Supabase + casos: nada desbloqueado, parcial, tudo desbloqueado

#### `[ ]` T9.10 — Deploy e teste em produção

## Critério de pronto da Fase

- [ ] Página `/conquistas` mostra todas 14 conquistas com estado correto pro Gustavo
- [ ] Conquistas desbloqueadas (provável: Primeiro tijolo, Empilhando, Primeira centena) aparecem com brilho
- [ ] Toast dispara ao desbloqueio
- [ ] Dashboard tem card de "próxima conquista" funcional
- [ ] `pytest` + `pnpm typecheck && pnpm build` passam
- [ ] Deploy Vercel + Railway sem erro

## Historico de chats

- **2026-05-14** — Brainstorming inicial. Definido modelo Streaks+Achievements+Volume, tiers bronze/prata/ouro, streak flexível (X beats em Y dias). Removidos: Foco no Travis, Madrugador, Coruja, Explorador. Conquista secreta = placeholder. Visual referência: Opal app + Quittr (esferas com gradient). Ledger criado, próximo passo: implementar T9.1 migration.
