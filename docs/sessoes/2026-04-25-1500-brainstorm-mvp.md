# Sessao — Brainstorm MVP BeatPost (resumo)

**Criado:** 2026-04-25 15:00
**Status:** ativo
**Tags:** sessao, brainstorm, fundadora, mvp, gustavo

## Contexto

Sessao guiada Henrique-Gustavo no domingo 25/04 em BH. Gustavo trouxe ideia de SaaS pra beatmakers. Henrique conduziu download mental sobre filosofia de criar produto, mercado de type beat, e a propria escolha de Gustavo entre musica/startup/Caminaro.

A sessao completa esta no cerebro central:
`MEU-CEREBRO/sessoes/2026-04-25-1500-brainstorm-gustavo-startup-beatmakers.md`

Este doc e versao resumida focada em decisoes que viraram MVP.

## Conteudo

### Filosofia que ficou

- "Apaixone-se pelo problema, nao pela solucao." (Uri Levine)
- Antes de criar: pesquisar GitHub + mercado + custo de oportunidade
- Antes de gastar muito tempo: falar com 5-10 pessoas que sofrem do problema
- Produto sem proposito nao sustenta. Yabadoo nasceu da dor de TDAH do Henrique. BeatPost precisa de proposito alem de "ganhar dinheiro com beatmaker".

### Diagnostico do mercado type beat

- Type beat e fonte primaria de renda pra beatmakers sem hit mainstream
- Plataformas: BeatStars (10M+), TrackTrain, Ghosts
- Pricing tipico: MP3 $9, WAV $19, Stems $100, Exclusivo $200+
- Top beatmakers ganham $50k/mes
- **Problema central:** constancia. Quem faz musica nao gosta de fazer marketing.
- Beatmaker serio: 15-20 beats/semana
- Multi-canal real: cara mantem 5+ canais com mesmo video, varia thumb/titulo/tag

### Concorrencia

- TuneBeat, VidIQ, Jakill — nenhum end-to-end pra beatmaker de type beat
- Gap real: combinar SEO + thumbnail por padrao de artista + automacao tudo

### Os 10 alertas da analise critica (sec 11)

1. **Bandeira vermelha:** Gustavo criou ferramenta e nao usou
2. **Problema real do beatmaker e RESISTENCIA EMOCIONAL ao marketing**, nao falta de automacao
3. "Camada de inteligencia" como diferencial e generico
4. Nicho beatmaker underground e conhecido por nao pagar
5. Matematica de custo nao foi feita
6. Gustavo nao e perfil obvio de fundador de SaaS
7. **Pergunta dificil:** BeatPost pode ser fuga do problema real (se mostrar como musico)
8. Modelos alternativos ao SaaS classico mais baratos pra validar
9. Gaps na conversa: ICP nao validado, GTM nao definido
10. Insights latentes: multi-canal e o angulo defensavel real

### Decisoes que viraram o MVP

| Tema | Decisao |
|---|---|
| Stack | Next.js + FastAPI + Supabase + QStash (web SaaS classico) |
| Repo | Monorepo |
| Multitenancy | Supabase RLS dia 1 |
| Postagem | A/B/C no mesmo canal (nao multi-canal no MVP) |
| Capa | Manual (sem geracao IA no MVP) |
| Vibe + tags | Gemini 2.0 Audio + grounded search *(refinado em 2026-05-07: mood passa a vir do produtor; Gemini detecta apenas BPM/key/genero/artistas similares + tags trending)* |
| Nome do beat | IA sugere 3, user escolhe |
| Cobranca | Pix na unha ate 10o pagante |

### O que ficou de fora

- Multi-canal YouTube (V2)
- Stripe (pos 10o pagante)
- Geracao de capa por IA (V2)
- Banco proprio de tags (V3 se Gemini falhar)
- Metricas YouTube Analytics (V2)
- TikTok / Instagram (nunca neste projeto)

### Atencao continua

Henrique reforcou que o trabalho mais importante do mes pro Gustavo NAO e este MVP, e:
1. Ele dogfoodar a versao atual (n8n) postando 5 beats reais — pra validar se o problema do beatmaker e mesmo automacao
2. Refletir sobre as 3 frentes (musica/startup/Caminaro) e decidir qual receber 100%
3. Se mostrar como beatmaker (Instagram parado e o problema real)

Construir BeatPost sem fazer (1) pode ser fuga elaborada. Henrique falou isso direto. Gustavo tem ate fechar Fase 5 pra dogfoodar — se chegar la sem ter postado 5 beats no canal dele com a ferramenta, plano e abortar pivotar.

## Relacionado

- `MEU-CEREBRO/sessoes/2026-04-25-1500-brainstorm-gustavo-startup-beatmakers.md` (versao completa)
- `~/.claude/plans/bom-na-verdade-vamos-sorted-lamport.md` (plano original)
- `_tasks-mvp.md` (roadmap)
- Yabadoo do Henrique (referencia de produto com proposito)
