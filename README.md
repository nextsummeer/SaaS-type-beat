# [NOME]

Producer Hub SaaS para produtores de type beats que publicam no YouTube. Automatiza upload, geracao de video, SEO e publicacao — e evolui para analytics, curadoria de conteudo e comunidade.

> **Status:** Fase 1 em execucao (MVP de automacao). Beta fechado previsto para setembro de 2026.

## Quickstart

### Pre-requisitos

- Node 20+ e pnpm
- Python 3.11+
- ffmpeg instalado no sistema (`ffmpeg -version` deve responder)
- Conta Supabase, Anthropic, Google AI Studio, Upstash QStash, Google Cloud (YouTube API)

### Setup

```bash
# 1. Clonar
git clone https://github.com/nextsummeer/SaaS-type-beat.git
cd SaaS-type-beat

# 2. Variaveis de ambiente
cp .env.example api/.env          # preencher chaves do backend
cp .env.example web/.env.local    # preencher chaves do frontend (NEXT_PUBLIC_*)

# 3. Backend (FastAPI)
cd api
python -m venv .venv
source .venv/Scripts/activate     # ou .venv/bin/activate em Linux/Mac
pip install -e ".[dev]"
uvicorn app.main:app --reload

# 4. Frontend (Next.js) — em outro terminal
cd ../web
pnpm install
pnpm dev

# 5. Supabase migrations
cd ../supabase
supabase link --project-ref [PROJECT_ID]
supabase db push
```

Web: http://localhost:3000
API: http://localhost:8000

## Estrutura

```
beatpost/
├── web/             # Next.js 15 + TypeScript + Tailwind + shadcn/ui
├── api/             # FastAPI + Python 3.11
├── supabase/        # Migrations + config
├── docs/            # Contexto + decisoes + arquitetura + referencias
├── _tasks-mvp.md    # Ledger das fases (executar via /pique:executar)
└── CLAUDE.md        # Indice pra IA
```

## Workflow

1. Abre `_tasks-mvp.md`, identifica proxima task pendente
2. Roda `/pique:executar` no Claude Code (entra em plan mode automaticamente)
3. Revisa plano, aprova, executa
4. Atualiza ledger, commita, push

Detalhes em [.claude/rules/workflow.md](.claude/rules/workflow.md).

## Stack

| Camada | Tech |
|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind + shadcn/ui |
| Backend | Python 3.11 + FastAPI + Pydantic v2 |
| DB + Auth + Storage | Supabase (Postgres + RLS) |
| Worker async | Upstash QStash |
| Audio analysis | Gemini 2.0 Flash |
| Tag research | Gemini grounded search |
| Geracao copy | Claude Sonnet 4.6 |
| Conversao | ffmpeg-python |
| YouTube | google-api-python-client |
| Deploy web | Vercel |
| Deploy api | Railway |

Detalhes em [docs/decisoes/2026-04-25-stack.md](docs/decisoes/2026-04-25-stack.md).

## Documentacao

- [CLAUDE.md](CLAUDE.md) — regras + IDs + arquitetura resumida
- [docs/_mapa.md](docs/_mapa.md) — indice navegavel
- [_tasks-mvp.md](_tasks-mvp.md) — fases 1-6 detalhadas

## Licenca

Privado. Henrique + Gustavo.
