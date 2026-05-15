# 2026-05-14 — Pesquisa VidIQ + auditoria MVP + fix cache analytics

**Tags:** analise-de-nicho, vidiq, outlierkit, auditoria-mvp, fix-cache, fase3-produto

## Contexto

Sessao iniciada apos fechamento da Fase 2 Analytics + Conquistas (sessao anterior). Gustavo quer comecar a desenhar a feature "Analise de Nicho" (Fase 3 do produto, estilo VidIQ). Antes de codar, pesquisa profunda + decisoes estrategicas + auditoria do MVP base pra confirmar o que ainda falta.

Durante a sessao, tambem encontrado e corrigido bug critico no cache do analytics.

## 1. Pesquisa profunda VidIQ

Delegado a subagent (~24 buscas + 10 fetches). Relatorio executivo de 7 pontos:

1. **VidIQ NAO tem acesso privilegiado** ao YouTube. "Certified Partner" e selo de TOS, nao parceria de dados. Usa mesmas APIs publicas que nos teriamos.
2. **Moat real:** clickstream de 20M+ usuarios com extensao Chrome (base de 640M keywords).
3. **"Search Volume" e ESTIMATIVA**, admitido pela propria documentacao deles. Pra cauda longa type beat, dados sao ruidosos ou zero.
4. **VPH (views/hora)** e a metrica mais facil de replicar: polling `videos.list?part=statistics` a cada 5-15min, 1 unit/call.
5. **Concorrente direto pro nicho: OutlierKit** ($9-29/mes). Eles posicionam VidIQ como generalista vs OutlierKit como especialista type beat.
6. **VidIQ Score 0-100 e cargo culting.** Reddit consistentemente reclama de incorrelacao com performance real.
7. **Vantagem competitiva BeatPost:** workflow integrado de upload + cruzamento Spotify/Apple (artistas em ascensao) + clickstream interno proprio.

**Custos estimados:** 100 users ~$150/mes, 1000 users ~$400-700/mes, 10000 users ~$2500-4000/mes. Gargalo e quota Google Cloud (10k units/dia/projeto), nao dinheiro.

## 2. Decisoes de produto

| Tema | Decisao |
|---|---|
| **Quando entrar** | **Fase 3 do produto**, apos MVP base fechar. NAO incluir no MVP base |
| **Usabilidade** | **Caminho A + C**: pagina dedicada `/analise-de-nicho` + widget dashboard "Ideias da semana". Painel integrado no upload (B) fica pra Fase 3.5 |
| **Fonte de dados** | **Caminho hibrido**: YouTube Data API + YouTube autocomplete + Spotify Web API + Google Trends. Apple Music API ($99/ano) so quando feature provar valor |
| **Modelo de cobranca** | Creditos por tier (Free 20, Tier1 200, Tier2 1000, Tier3 5000) — billing fica pos-MVP |
| **Tempo estimado** | LITE (A+C magro): 2-3 semanas. MEDIO (A+C + VPH + competition): 3-4 semanas |

**Princpio:** OutlierKit nao assusta porque sao especialistas e BeatPost tem **integracao com upload** que eles nao tem. Estrategia: ser MELHOR pro nicho type beat, nao "generalista ok-ish".

## 3. Auditoria do MVP base

Subagent Explore verificou cada task pendente do `_tasks-mvp.md` contra o codigo real:

**DONE (ledger desatualizado, marcadas [x]):**
- T2.8 — `spotify_service.py` completo
- T3.2 — `gemini_service.search_trending_tags()` completo
- T6.1 — Dashboard/Beats lista beats com cards (entregue como bonus da Fase 2)
- T6.2 — `/beats/[id]/review` mostra link YouTube + agenda
- T6.3 — Empty/error/loading states em `/beats`, `/beats/[id]`, analytics

**PARCIAIS** (T2.11 capa toggle, T2.12 endpoint sem mood/cover_source, T3.4 usage_tracker fragmentado, T4.6 estilos so em doc, T6.4 README curto).

**NAO FEITO:** T2.6, T2.7, T2.9, T2.10, T3.5, T4.7-T4.11, T5.5, T5.6, T6.5.

## 4. Decisao sobre capa IA

Gustavo: "Ainda estou estudando como fazer isso sem frustrar o cliente."

Escolheu **Caminho B** (manter capa IA no MVP, decisao real na semana que vem). 10 tasks pausadas: T2.6 (mood/cover_source/visual_style), T2.10, T2.11, T4.6, T4.7, T4.8, T4.9, T4.10, T4.11, partes da T2.12.

**Proximas executaveis (nao dependem de capa IA):**
- T3.4 — usage_tracker centralizado (~2-3 dias)
- T6.4 — README setup 10 passos (~4h)

**Marcadas como skipped/obsoletas:**
- T6.5 — Gustavo ja opera as 4 plataformas como dono (handoff Henrique→Gustavo ja aconteceu)
- T3.5 — Teste @slow nao bloqueante pro MVP, adiar pra pre-beta

## 5. Bug encontrado e corrigido: cache stale do analytics

**Sintoma:** `/analytics` (visao geral) mostrava 0 views/inscritos/retencao, enquanto `/analytics/beats` mostrava 114 views reais (69+45+0+0).

**Diagnostico:** durante o desenvolvimento da Fase 2 (14/mai), houve momento que `endDate=hoje` fazia API retornar 0. Fix aplicado terminando em "ontem", mas **cache `overview:7d` populado com 0 ja estava salvo com TTL 24h e nao foi invalidado**. `/my-beats` foi implementado depois do fix, cache populou correto.

**Fix imediato (Gustavo executou):** `DELETE FROM analytics_cache` no Supabase Studio. Numeros reais aparecem.

**Fix permanente (commitado em fe25f13):**
- Constante `CACHE_TTL_EMPTY_MINUTES = 30`
- Helper `_payload_is_empty(payload)` detecta `rows` vazio/ausente
- `_cache_set` agora usa TTL adaptativo: 24h se tem dados, 30min se vazio
- 2 testes novos cobrindo TTL adaptativo (10/10 passando)

## 6. Artefatos da sessao

- **Commit fe25f13** — fix do cache analytics
- **Commit de0713e** — auditoria + planejamento no `_tasks-mvp.md`
- **Memoria atualizada:** `project_roadmap_futuro.md` com decisoes refinadas de analise de nicho
- **Doc atualizado:** este arquivo
- **Mapa atualizado:** `docs/_mapa.md`

## Proximo passo

Comecar T3.4 (usage_tracker centralizado) ou T6.4 (README 10 passos). Aguardando Gustavo decidir sobre capa IA na proxima semana antes de retomar T2.6 e bloco T4.x.
