# Visao MVP — BeatPost

**Criado:** 2026-04-25
**Status:** ativo
**Tags:** contexto, mvp, visao

## O que e

BeatPost e um SaaS web que permite a beatmakers automatizar a postagem de type beats no YouTube. O beatmaker faz upload de um audio (qualquer formato), uma capa (jpg/png), e o sistema:

1. Converte o audio pra MP3 320kbps
2. Analisa BPM, tom, vibe e artistas similares via IA
3. Pesquisa tags trending no YouTube
4. Gera 3 variacoes (A/B/C) de titulo + descricao + tags via Claude
5. Apresenta as 3 pra revisao do beatmaker
6. Apos confirmacao, publica 3 videos no canal YouTube com agendamento escalonado

A entrega final e tempo poupado e mais alcance via teste A/B/C — o beatmaker grava o beat, publica em 1 minuto, sistema aprende qual variacao performa melhor (V2).

## Nivel do MVP

**Nivel 2 — Beta privado.** 5-10 beatmakers convidados pessoalmente. Cobranca na unha (Pix R$50/mes apos 30d trial). Nivel 3 (SaaS publico com Stripe) depende de 10 pagantes consecutivos.

## Publico-alvo

ICP: beatmaker underground brasileiro/latino de **trap, drill, hyperpop, plug**, com canal YouTube ativo (1-10 canais), 0-10k subs, que ja entende:
- O fluxo type beat (postar pra atrair MC/artista que compre licenca)
- BeatStars/TrackTrain como destino do trafego
- A importancia de constancia (mas nao consegue manter)

NAO e pra:
- Produtor mainstream (Mike Dean, Boi-1da) — outro mercado
- Beatmaker iniciante absoluto (sem canal, sem entender o jogo)
- Compradores (MCs/artistas) — sao consumidores do feed dele, nao users dele

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

## Status Atual

**Em scaffolding.** Fase 0 em execucao por Henrique. Apos T0.7, Gustavo assume Fases 1-6.

## Links Uteis

- Repo: github.com/HENRIQUE4345/beatpost (a criar T0.6)
- Sessao fundadora: `MEU-CEREBRO/sessoes/2026-04-25-1500-brainstorm-gustavo-startup-beatmakers.md`
- Plano original: `~/.claude/plans/bom-na-verdade-vamos-sorted-lamport.md`
- Roadmap: `../../_tasks-mvp.md`
