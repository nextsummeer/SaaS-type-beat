# 3 variacoes A/B/C no mesmo canal (vs multi-canal)

**Data:** 2026-04-25
**Status:** aceita
**Tags:** decisao, produto, mvp, escopo

## Contexto

Sessao fundadora destacou que beatmakers serios criam multiplas postagens do mesmo beat com titulos/tags/thumbs diferentes pra testar qual viraliza (sec 11.10). Esse e o angulo defensavel — ferramentas atuais (TuneBeat, VidIQ) nao automatizam isso bem. A pergunta foi: no MVP isso e **multi-canal** (3 canais YouTube diferentes do mesmo user, 1 video em cada) ou **A/B/C no mesmo canal** (3 videos no mesmo canal, em horarios diferentes)?

## Opcoes Consideradas

### 1. Multi-canal (3 canais YT diferentes do user)
- **Pros:** Replica padrao real de beatmakers que tem 5+ canais. Maximo SEO surface.
- **Contras:** OAuth precisa autorizar N tokens distintos. Cada canal precisa de email Google. Beatmaker iniciante tem 1-2 canais, nao 5. Complexidade vira drag pra adoption inicial.

### 2. A/B/C no mesmo canal (3 videos, horarios diferentes)
- **Pros:** 1 OAuth, 1 canal. Funciona pra beatmaker com 1 canal so. Mantem o angulo de teste de variantes. Mesmo MP3 reutilizado, mesma capa, so muda titulo/desc/tags/scheduled_at.
- **Contras:** YouTube pode considerar spam se 3 videos identicos saem em 3 horas. Mitigacao: agendar com gap (default 0h, +3d, +7d).

### 3. So 1 publicacao + IA gera 3 propostas pra usuario escolher 1
- **Pros:** Mais simples ainda.
- **Contras:** Perde o angulo de teste. Vira commodity (gerador generico de copy).

## Decisao

**Veredito: Opcao 2 — A/B/C no mesmo canal, com gap de dias entre publicacoes.**

Confirmado via AskUserQuestion 2026-04-25 15:30. Multi-canal fica pra V2 quando souber se beatmakers reais tem 2+ canais. Default agendamento: hoje 18h, +3d 18h, +7d 18h (editavel pelo user).

### Como Claude gera 3 angulos distintos

Prompt forca disjuncao explicita:
- **A:** angulo `[Artista 1 detectado] Type Beat - [Mood]`
- **B:** angulo `[BPM] BPM [Genero] Type Beat - [Tom musical]`
- **C:** angulo `[Artista 2] x [Artista 3] Type Beat - [Vibe]`

Criterio de pronto (T4.5):
- Titulos com >50% palavras diferentes entre as 3
- Tags com >50% disjuncao

### Schema

Tabela `posts` tem coluna `variacao text check (variacao in ('A','B','C'))`. 3 rows por beat. Cada row tem seu `youtube_video_id` apos publicar.

## Consequencias

- Risco de spam/duplicate detection do YouTube — gap de 3 dias mitiga, mas precisa monitorar bans
- Beatmaker pode editar qualquer variacao antes de publicar (UI Fase 4)
- Multi-canal V2 reusa estrutura: tabela `youtube_accounts` ja vem com `(user_id, channel_id)`, basta permitir N rows por user e adicionar dropdown na UI
- Metrica futura: comparar engagement por variacao pra aprender o que funciona (V2)
