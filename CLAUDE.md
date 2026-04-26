# BeatPost

IMPORTANTE - COMUNIQUE-SE SEMPRE EM PORTUGUES BRASIL.

SaaS web multitenant para beatmakers automatizarem postagem de type beats no YouTube com 3 variacoes A/B/C por beat (titulo, descricao e tags variando, mesma capa, mesmo canal, datas escalonadas).

**Stack:** Next.js 15 + TypeScript (`web/`) | Python 3.11 + FastAPI (`api/`) | Supabase (Auth + Postgres + Storage + RLS) | Upstash QStash (worker async) | Gemini 2.0 Flash + Anthropic Claude + ffmpeg + YouTube Data API v3
**Repo:** github.com/HENRIQUE4345/beatpost (private)
**Owner:** Henrique (arquiteto + entrega Fase 0) → Gustavo (executa Fases 1-6)

## IDs Importantes

- Supabase Project ID: [PREENCHER apos T0.5]
- Supabase URL: https://[PROJECT_ID].supabase.co
- Vercel project: [PREENCHER apos T0.7]
- Railway project: [PREENCHER apos T0.7]
- YouTube OAuth Client ID: [PREENCHER apos cadastrar projeto Google Cloud]
- QStash endpoint: [PREENCHER apos signup Upstash]

## Arquitetura

```
USUARIO faz login (Supabase Auth)
   │
   ▼
CONECTA canal YouTube (OAuth, refresh_token encriptado)
   │
   ▼
UPLOAD audio + capa (Web → Supabase Storage)
   │  cria row em beats (status=uploaded)
   │  dispara QStash → worker pipeline
   ▼
WORKER 1 — convert.py (ffmpeg → MP3 320kbps + loudnorm)
   │
   ▼
WORKER 2 — analyze.py (Gemini Audio + grounded search)
   │  bpm, key, vibe, artistas_similares, tags_trending
   ▼
WORKER 3 — generate.py (Claude → 3 pacotes A/B/C)
   │  3 rows em posts (titulo + desc + tags)
   ▼
USUARIO revisa na UI, edita se quiser, confirma agendamento
   │
   ▼
WORKER 4 — publish.py (ffmpeg gera mp4 + YouTube upload 3x)
   │  publishAt: hoje 18h, +3d, +7d (default editavel)
   ▼
DASHBOARD mostra status + links YouTube
```

## Regras Obrigatorias

1. **RLS sempre ligado** — toda tabela com `user_id` tem `enable row level security` + policy `auth.uid() = user_id`. Storage idem.
2. **refresh_token nunca em texto puro** — usar pgcrypto `pgp_sym_encrypt` com chave em env `SUPABASE_VAULT_KEY`. Nunca logar.
3. **Workers sao idempotentes** — checa `status` da row antes de re-executar. QStash faz retry automatico.
4. **State machine nos workers** — uploaded → converting → converted → analyzing → analyzed → generating → ready_for_review → publishing → published | failed. Worker so avanca se status anterior bate.
5. **usage_tracker chama em CADA chamada paga** — Gemini, Claude, YouTube upload. Sem isso nao sabemos custo por usuario.
6. **Capa manual no MVP** — beatmaker faz upload da capa. Geracao IA fica pra V2.
7. **1 canal YouTube por usuario** no MVP. Multi-canal fica pra V2.
8. **Sem Stripe ate o 10o pagante.** Cobranca na unha (Pix manual).
9. **Nao quebrar testes existentes** antes de commitar.
10. **Sem task no `_tasks-mvp.md` = sem codigo.** Seguir workflow em `.claude/rules/workflow.md`.

## Navegacao

- Plano fundador: [../plano-fundador.md](../plano-fundador.md) (copia do plan que originou o projeto, criada na T0.3)
- Documentacao: `docs/_mapa.md` — **CONSULTAR SEMPRE** antes de buscar ou criar docs
- Tarefas: `_tasks-mvp.md` — Ledger das fases 1-6 (formato Henrique)
- Workflow: `.claude/rules/workflow.md`
- Testes: `.claude/rules/testing.md`

## Filosofia de Memoria

| Camada | Arquivo | Quando carrega | Funcao |
|--------|---------|----------------|--------|
| **Core** | `CLAUDE.md` | Sempre | Indice leve, regras, IDs |
| **Recall** | `docs/_mapa.md` | Quando IA busca docs | Indice navegavel com 1 linha por doc |
| **Archival** | `docs/**/*.md` | Sob demanda | Contexto detalhado |

**Principio:** CLAUDE.md e LEVE. Nao colocar documentacao extensa aqui — apontar pra docs/.
Cada doc em docs/ deve ter no maximo ~150 linhas. Se crescer, dividir.

## Regras para a IA

### Sempre

1. Consultar `docs/_mapa.md` antes de buscar ou criar documentacao.
2. Ao criar doc novo: usar template padrao, atualizar `docs/_mapa.md`.
3. Nomes em kebab-case, sem acentos: `oauth-youtube.md`, nunca `OAuth_YouTube.md`.
4. Um tema por arquivo. Se crescer demais (>150 linhas), dividir.
5. Sem task no `_tasks-mvp.md` = sem codigo. Seguir o workflow.

### Classificacao de documentacao

| Tipo de conteudo | Pasta destino |
|-----------------|---------------|
| O que e o projeto, visao, publico, recorte | `docs/contexto/` |
| Decisoes tecnicas tomadas (imutaveis) | `docs/decisoes/` |
| Como o sistema funciona (pipeline, schema, fluxo) | `docs/arquitetura/` |
| Docs de APIs, frameworks, ferramentas externas | `docs/referencias/` |
| Logs de brainstorm, investigacao, sessoes | `docs/sessoes/` |

## Integracao com Cerebro Central

O cerebro central do Henrique esta em `C:\Users\Henrique Carvalho\Documents\PROGRAMAS\MEU-CEREBRO\`.

- **Este projeto (BEATPOST/)** = decisoes tecnicas, arquitetura, codigo, docs de referencia
- **Cerebro central** = visao de negocio, estrategia, status de vida do projeto

Sessao fundadora: `MEU-CEREBRO/sessoes/2026-04-25-1500-brainstorm-gustavo-startup-beatmakers.md`
Plano fundador: `~/.claude/plans/bom-na-verdade-vamos-sorted-lamport.md`
