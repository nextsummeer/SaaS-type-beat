# 2026-05-21 — Capa IA do zero até produção

**Tags:** capa-ia, fal.ai, claude, brief-presets, skeleton-refresh-safe, editorial-mono, ux-fixes, sessao-longa

## Resumo executivo

Sessão única que entregou o **bloco completo de geração de capa por IA** — do schema do banco até a UI em produção. Começou com Gustavo dizendo "vamos repensar tudo" (sobre a ADR de 2026-05-07 que estava pausada) e terminou com o feature funcionando na Vercel + Railway, faltando apenas o prompt base mestre (engenharia de prompt, que será o foco da próxima sessão).

**17 commits, ~3500 inserções, 8 migrations Supabase aplicadas em produção.**

## 1. Mudanças de paradigma durante a sessão

### Descoberta-chave que originou tudo

Gustavo testou pessoalmente com Claude + fal.ai:
- 1 prompt base mestre fixo (estrutura: analog film + sujeito obscuro + setting + lighting + palette + energy + shot on)
- Brief de 1-2 linhas pro Claude ("estética do Drake, mulher, vermelho, sexy")
- Claude **preenche o molde** com detalhes específicos → resultado radio-ready

Validou em 3 iterações:
- Drake/sexy → capa boudoir-noir
- Lil Baby/hood → capa Atlanta documentary
- Drake/agressivo → capa OVO cold Toronto

Isso destruiu a premissa da ADR antiga (clusters fixos de 6-7 estilos) — porque é **infinito**: qualquer artista, qualquer combinação.

### Evoluções conceituais que rolaram durante a implementação

| Evolução | De | Para | Por quê |
|---|---|---|---|
| Modelo de artistas | FK pra `artistas_referencia` curada manualmente | **Texto livre** digitado | "São milhares de artistas, todo dia nasce um novo" (Gustavo). Curadoria é inviável. T2.7 vira backlog. |
| Brief padrão | `default_brief` único em user_profiles | **Multi-presets** nomeados (`brief_presets` tabela nova) | Header com botão "editar" estava muito escondido. Multi-preset com nomes (ex: "Drake noite", "Lil Baby hood") é mais flexível. Limites por tier (free 1 / int 5 / premium ∞). |
| Primeira capa | Consome 1 crédito sempre | **Grátis pra primeira de cada user** (`has_generated_first_cover` flag) | Padrão SaaS sério (Canva, Loomly). Free tier com 3 créditos não pode gastar 1/3 só pra testar. |
| Tier para dono | Não tinha | **`internal`** com 999999 créditos + ∞ presets | Gustavo precisa testar sem barrar. SQL filtra pelo user_id dele. |
| Skeleton "Gerando" | State local da página (sumia em refresh) | **Vem do DB** via `cover_library.status='pending'` | Refresh-safe. Worker insere pending PRIMEIRO, depois UPDATE ready/failed. Frontend renderiza por status. |
| Otimismo local | Não tinha | `optimisticPending` count local | Skeleton aparece IMEDIATAMENTE entre click e primeiro INSERT real via Realtime. Fantasma some quando real chega. |
| BriefSelector | Dropdown floating com z-index 100 | **Botão** que abre o ManageBriefsModal direto | Bug de stacking context com SectionLabel abaixo, mesmo com isolation. Modal centralizado evita o problema por design. |

## 2. Bugs descobertos e corrigidos durante o teste

| Bug reportado | Causa | Fix |
|---|---|---|
| Modal "Confirmar Geração" travava em "Enviando..." por 30s | `await triggerGenerate` antes de fechar modal | UX assíncrona — `setConfirmLote(null)` antes do `void triggerGenerate()` |
| Wizard voltava pro Step 1 ao clicar "Salvar + gerar" | `useEffect` do wizard com `[open, initialBrief]` resetava state quando parent atualizava | `wasOpenRef` ref — reset SÓ na transição `false → true` |
| Botão "Gerar com brief diferente" não funcionava | TODO `console.log` | Wizard ganhou modo `'pontual'` com 1 CTA único + aviso amarelo "não altera padrão". DEPOIS removido inteiro (Gustavo aprovou: tudo passa por preset agora). |
| Capa saiu de Carti quando esperava Drake | Provavelmente UX — user editou wizard pontual sem clicar CTA | Header do wizard pontual ficou em amarelo + banner explícito (depois removido com brief presets) |
| Capa "cinza vazio" sem indicação | `PendingCard` com label muito sutil (lavanda sobre shimmer cinza) | Badge com bg preto + blur + border roxo + texto branco visível |
| Refresh durante geração perdia o skeleton | State local volátil | Migration 016 — `cover_library.status` (pending/ready/failed). Worker insere pending → Realtime → frontend pega do DB |
| CoverPicker no upload mostrava biblioteca vazia | Filtro `image_url && status==='ready'` excluía capas legacy sem status preenchido | Relax pra `!!image_url && status !== 'pending' && status !== 'failed'` |
| Descartar capa não fazia nada | Click → `console.log` TODO | `ConfirmDialog` + endpoint backend |
| Descartar dava `permission denied` | Frontend chamava `supabase.delete()` direto, mas tabela só tem GRANT pra service_role | Endpoint `DELETE /covers/{id}` via backend (igual padrão de `/beats/{id}`) + cleanup do storage |
| Baixar capa abria nova aba | `<a download>` é ignorado pra URLs cross-origin (Supabase storage) | `fetch` → `blob` → `URL.createObjectURL` → `<a download>` local |
| Dropdown de briefs sobreposto por "CAPAS GERADAS" abaixo | Stacking context da section seguinte sobrepunha o dropdown (`mix-blend-mode` do app-shell::after) | Trocar o dropdown floating por modal centralizado (ManageBriefsModal) — elimina o problema por design |
| window.confirm() do browser não combinava com design | `confirm()` nativo | `ConfirmDialog` estilo BeatPost (já existia, foi reestilizado pra Editorial Mono) |
| Drag de texto pra fora do modal fechava | `onClick` no backdrop disparava em `mouseup` (que ocorria no backdrop) mesmo com `mousedown` dentro | `mouseDownOnBackdropRef` — só fecha se ambos eventos foram no backdrop |
| Não dava pra deselecionar capa no CoverPicker | Sempre chamava `onPickLibrary(cover.id)`, nunca `null` | Toggle: se já selecionada, passa `null` |
| Tier internal não mostrava ∞ | Logic só tratava `free/int/premium` | `isUnlimitedTier()` helper + render condicional sem barra de progresso |

## 3. Arquitetura final entregue

### Banco (8 migrations: 011-018)

```
cover_library
  - id, user_id, image_url (nullable), storage_path (nullable)
  - brief_used jsonb, prompt_final, cost_usd, source
  - status text check (pending|ready|failed) ← refresh-safe
  - image_hash ← dedup pra upload manual da MESMA capa AI
  - used_in_beats_count
  - RLS: read_own, insert_own, delete_own

brief_presets (nova)
  - id, user_id, name, brief jsonb
  - is_active boolean (unique index "1 ativo por user")
  - RLS: 4 policies

user_profiles novas colunas
  - tier check (free|intermediate|premium|internal)
  - credits_used_this_month, credits_reset_at (ciclo 30 dias)
  - has_generated_first_cover (onboarding free)
  - default_brief (legacy — mantido por compat)
```

### Backend (services + routes)

```
api/app/services/
  fal_service.py             → fal.ai gpt-image-2 quality=low ($0.0083, ~30s)
  cover_prompt_builder.py    → Claude monta prompt final (PLACEHOLDER do Lil Baby)
  credits_service.py         → PLAN_LIMITS + consume + get_remaining + reset 30d
  presets_service.py         → PRESET_LIMITS + can_create_more

api/app/workers/
  cover.py                   → INSERT pending → Claude → fal.ai → UPDATE ready/failed
                                + cobra crédito SÓ apos sucesso
                                + onboarding free pra primeira capa

api/app/routes/
  covers.py
    GET    /covers                      → lista biblioteca
    GET    /covers/credits              → estado dos créditos
    POST   /covers/generate             → dispara worker
    DELETE /covers/{id}                 → backend cleanup storage + row

  briefs.py (novo)
    GET    /covers/briefs               → lista presets + tier + limit
    POST   /covers/briefs               → cria (valida limite + ativa se primeiro)
    PATCH  /covers/briefs/{id}          → renomeia / atualiza conteúdo
    DELETE /covers/briefs/{id}          → deleta + ativa próximo se era ativo
    POST   /covers/briefs/{id}/activate → torna ativo

  beats.py (atualizado)
    POST /beats agora aceita cover_id (FK biblioteca) OU cover_path (manual)
    valida ownership + incrementa used_in_beats_count
```

### Frontend (Editorial Mono mantido)

```
web/app/(app)/capas/page.tsx     → orquestra tudo (briefs, geração, realtime)
web/components/
  CapasHeader.tsx                → BriefSelector + créditos + botões gerar
  BriefSelector.tsx              → botão que abre ManageBriefsModal (NÃO dropdown)
  ManageBriefsModal.tsx          → CRUD completo de presets
  CapasWizard.tsx                → 3-step (artista / 24 cards / nome+confirmação)
  CapasGrid.tsx                  → grid responsivo + GhostPendingCard
  CapaCard.tsx                   → renders por status (pending/ready/failed)
  CoverPicker.tsx                → no /upload, tabs biblioteca+manual
  ConfirmGenerateModal.tsx       → confirma antes de gerar (consumo + onboarding free banner)
  ConfirmDialog.tsx              → BeatPost-style (substituiu window.confirm)
```

## 4. Status final das tasks T4.x

| Task | Status |
|---|---|
| T4.6 — Curadoria prompt base mestre | **PENDENTE (próxima sessão)** — placeholder atual é o prompt do Lil Baby |
| T4.7 — fal_service.py | ✅ done |
| T4.8 — cover_prompt_builder.py | ✅ done (com placeholder) |
| T4.9 — Worker cover.py | ✅ done (com status pending/ready/failed) |
| T4.10 — UI aba /capas | ✅ done |
| T4.11 — Teste E2E pytest | ⏳ backlog (não bloqueante) |
| T4.12 — Migration cover_library | ✅ done |
| T4.13 — Wizard configuração | ✅ done |
| T4.14 — Sistema créditos | ✅ done |
| T4.15 — generate.py não dispara cover.py | ✅ done (removida da arquitetura) |
| T4.16 — Endpoints /covers/* | ✅ done |
| T4.17 — Realtime quando capa pronta | ✅ done |
| T4.18 — Display créditos + modal | ✅ done |
| T2.6 — Migration inputs produtor | ✅ done |
| T2.11 — CoverPicker no upload | ✅ done |
| T2.12 — Endpoint POST /beats atualizado | ✅ done |

## 5. Decisões registradas em memória

- `feedback_modo_trabalho_guiado.md` — **atualizada**: dentro de bloco aprovado, pode executar tasks em batelada (mais eficiente). Decisões macro continuam passo a passo.
- `feedback_evitar_sql_prematuro.md` — **nova**: só formatar SQL pra colar quando TODAS as decisões do feature estiverem fechadas
- `feedback_usar_frontend_design_skill.md` — **nova**: invocar Skill(frontend-design) proativamente em UI
- `project_capa_ia_arquitetura.md` — **nova**: arquitetura final (prompt base + Claude runtime, NÃO clusters)
- `project_jornada_cliente_e_capa_ia.md` — **atualizada com nota** de superseded parcial

## 6. Próximos passos

### Próxima sessão (Gustavo)
**Foco: engenharia de prompt do prompt base mestre (T4.6)**

- Iterar visualmente o prompt base
- Testar com 5+ briefs diferentes (Drake, Lil Baby, Carti, Burna Boy, NLE Choppa, etc.)
- Validar consistência de qualidade da imagem
- Quando aprovado, substituir a constante `PROMPT_BASE_TEMPLATE` em `api/app/services/cover_prompt_builder.py`
- Documentar versão final em `docs/referencias/prompt-base-capa.md` (criar)

### Backlog
- T4.11 (teste E2E pytest) — quando virar dor real
- Realtime habilitar pra `cover_library` no Supabase Database → Replication, se ainda não estiver
- Reconectar canal YouTube do Gustavo (token expirou — já resolvido durante a sessão)
- Decidir sobre billing real (Stripe vs Pix) — fora do escopo desta sessão

## 7. Referências

- ADR ativa: `docs/decisoes/2026-05-21-geracao-de-capa-prompt-base-claude.md`
- Memória: `project_capa_ia_arquitetura.md`
- Commits: 36bb3af → 437d17d (17 no total)
