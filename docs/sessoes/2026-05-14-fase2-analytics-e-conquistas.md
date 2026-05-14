# Sessão 2026-05-14 — Fase 2 Analytics completa + Sistema de Conquistas

**Data:** 2026-05-14
**Duração:** sessão longa (~12h de iteração)
**Status:** todas as entregas em produção
**Ledgers relacionados:** `_tasks-fase2-analytics.md`, `_tasks-conquistas.md`

---

## Contexto

Após fechar T6.x (redesign visual pós-login) em 2026-05-13, Gustavo decidiu adiantar a Fase 2 do produto (Analytics YouTube). Durante a sessão, descobriu várias features adicionais que não estavam no plano original e adicionou ao roadmap. Tudo entregue numa única maratona.

## Entregas principais

### 1. Fase 2 — Analytics YouTube ✅
Painel completo de métricas do YouTube com sub-páginas e gráficos interativos.

**Backend** (`api/app/services/youtube_analytics.py` + `routes/analytics.py`):
- Service com cache 24h em tabela `analytics_cache`
- 5 endpoints REST: `/overview`, `/top-beats`, `/my-beats`, `/traffic-sources`, `/views-timeline`
- Helper `list_videos_status` (videos.list) pra detectar deletado/privado/unlisted
- 21 tests passando

**Frontend:** página `/analytics` dividida em 3 sub-páginas (Visão geral, Meus beats, De onde vêm). Sidebar suporta sub-items. Timeline com tooltip flutuante + toggle Views/Inscritos com prefetch paralelo.

**Bugs corrigidos durante a sessão** (em sequência):
1. Cache stale do 7d retornando 0 → resolvido com DELETE manual
2. Hipótese Brand Account descartada (channel_id confere com Studio)
3. Intervalo incluindo "hoje" → API retornava 0 pra tudo → fix: terminar em ontem
4. Granularidade `month` em 90d retornava vazio → fix: usar `day` sempre
5. Agregado do canal vs beats do BeatPost → solução: notas de escopo explicativas

**Bonus que entrou junto:**
- Detecção de vídeo deletado/privado/unlisted (campo `youtube_deleted_at` em posts)
- Filtro "Removidos" na página /beats com cover dessaturada
- Dashboard real (T6.1-T6.4 do MVP) com contadores reais de beats + views totais

Doc de arquitetura criado: `docs/arquitetura/analytics-pipeline.md`.

### 2. Conquistas / Gamificação ✅
Sistema completo de gamificação pra combater churn precoce de beatmakers iniciantes.

**Schema:** migration 010 cria `user_achievements (user_id, achievement_key)` com RLS.

**Backend** (`achievements_service.py` + `routes/achievements.py`):
- Catálogo de **28 conquistas** em 5 categorias (Constância, Catálogo, Audiência, Hits, Secretas)
- Sistema de **6 ranks** baseado em # de conquistas: Aprendiz → Bronze → Prata → Ouro → Platina → Lenda
- `evaluate(user_id)` avalia tudo lazy + persiste recém-desbloqueadas
- Dados puxados APENAS dos beats publicados pelo BeatPost (não do canal todo) — premia uso da plataforma, não passado do canal

**Frontend:**
- Página `/conquistas` na sidebar
- `<AchievementRankCard>` no topo com **SiriOrb 2D animada** (CSS conic-gradients, ~400kb a menos que Spline)
- `<RanksGallery>` mostra os 6 ranks lado a lado com estado (passou/atual/futuro)
- `<AchievementBadge>` esferas SVG nos cards individuais
- Tooltip estilo holographic bubble

**Iterações visuais durante a sessão:**
1. SVG simples → CSS gradient iridescente → Spline 3D → SiriOrb 2D (escolha final)
2. Verde fixo na marca "desbloqueada" (era variável por tier, ficava poluído)

## Decisões importantes documentadas

- **Cache 24h** alinha com delay natural 24-48h do YT Analytics — não adianta ser mais agressivo
- **`end = ontem`** (não hoje) nas datas — YT não consolida dia atual
- **`channel==<channel_id>`** explícito (não MINE) — necessário pra contas Brand
- **Dados só do BeatPost** nas conquistas — produtor com canal grande pré-existente não desbloqueia tudo automaticamente
- **Prêmios físicos** (drum kits etc) ficam pra T10 quando Gustavo tiver os arquivos prontos

## Memórias atualizadas

- `project_oauth_consent_cache_gotcha.md` — adicionar scope novo exige revogar acesso e tentar em aba anônima
- `project_analytics_adiantada.md` — Fase 2 adiantada do roadmap
- `project_roadmap_futuro.md` — conquistas marcadas como ENTREGUE, T10 (prêmios) como próximo, restando #2 (análise de nicho VidIQ-like) e #3 (conteúdo educacional)

## Próximas prioridades discutidas

Roadmap futuro do Gustavo (não imediato):
1. ✅ Conquistas — entregue
2. 🔜 **Análise de Nicho estilo VidIQ** — keyword research pro produtor saber se vale fazer beat de "X type beat"
3. 🔜 **Conteúdo Educacional** — aba `/aprenda` com dicas pra produtores iniciantes não desistirem cedo

Pendências do MVP base: T2.6-T2.12 (inputs upload — mood cards, Spotify), T4.6 (capa IA), T5.6 (E2E teste).

Próxima sessão: análise de nicho + conteúdo educacional.

## Commits da sessão (resumo)

Da Fase 2 Analytics até aqui: **~25 commits** entre `b1660b8` (T7.1 OAuth scope) e `288082d` (fix outline inputs). Sem detalhar individualmente — cada um documenta o que mudou.
