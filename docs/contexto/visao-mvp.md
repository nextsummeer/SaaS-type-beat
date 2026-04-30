# Visao do Produto — [NOME]

**Criado:** 2026-04-25
**Atualizado:** 2026-04-29
**Status:** ativo
**Tags:** contexto, visao, producer-hub

## O que e

[NOME] e um Producer Hub SaaS B2C voltado para produtores de type beats que publicam no YouTube. O objetivo e ser a infraestrutura de crescimento para a proxima geracao de produtores de type beat — acessivel a qualquer produtor do mundo, por assinatura.

Nao e uma ferramenta de upload. E a plataforma completa onde o produtor:
- Automatiza o trabalho repetitivo (upload, video, SEO, publicacao)
- Entende seus dados (analytics do YouTube)
- Aprende com curadoria de qualidade (tutoriais por estilo)
- Se conecta com outros produtores e artistas (comunidade e marketplace)

## O problema que resolve

Produtores perdem 2-3 horas por upload em tarefas repetitivas:
- Criar o video manualmente (imagem + audio)
- Escrever titulo, descricao e tags otimizadas para SEO
- Fazer o upload no YouTube com todas as configuracoes

## Fases do Produto

### Fase 1 — MVP (foco atual)
- Upload de MP3 com geracao automatica de titulo, descricao e tags por IA
- 3 variacoes A/B/C por beat (diferencial defensavel)
- Geracao automatica de MP4 via ffmpeg (no servidor, 100% cloud)
- Upload automatico no YouTube via OAuth por usuario
- Tudo processado na nuvem — sem nada local, sem n8n

### Fase 2 — Analytics e crescimento
- Painel de analytics do YouTube integrado
- Apontamento de oportunidades por IA
- Gamificacao: rank, badges, metas

### Fase 3 — Conteudo e aprendizado
- Biblioteca de tutoriais curados
- Drum Kits e Sample Packs mensais para assinantes

### Fase 4 — Comunidade e marketplace
- Competicoes mensais de beat
- Marketplace produtor-artista

## Publico-alvo

Produtor de type beat com canal YouTube ativo, que ja entende o fluxo (postar pra atrair MC/artista que compre licenca), mas perde horas em tarefas repetitivas de marketing e nao consegue manter constancia.

Detalhes em `docs/contexto/publico-alvo.md`.

## Modelo de negocio

Assinatura mensal com planos por definir. Billing nao entra no MVP — foco total em validar o produto com beta fechado primeiro.

## Meta

Beta fechado ate setembro de 2026.

## Stack Tecnica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 15 + TypeScript + Tailwind + shadcn/ui (Vercel) |
| **Backend** | Python 3.11 + FastAPI + Pydantic v2 (Railway) |
| **Banco** | Supabase (Postgres + RLS) |
| **Auth** | Supabase Auth (email + Google) |
| **Storage** | Supabase Storage (private buckets) |
| **Worker async** | Upstash QStash |
| **Audio analysis** | Gemini 2.0 Flash |
| **Tag research** | Gemini grounded search |
| **Geracao copy** | Anthropic Claude Sonnet 4.6 |
| **Conversao audio** | ffmpeg (libmp3lame + loudnorm) |
| **YouTube** | YouTube Data API v3 + OAuth 2.0 |

100% cloud-native. Nada roda localmente.

## Links

- Repo: github.com/nextsummeer/SaaS-type-beat
- Roadmap: `../../_tasks-mvp.md`
