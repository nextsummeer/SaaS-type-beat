# 2026-05-19 — YouTube "Processamento cancelado" + fix codec audio

**Tags:** youtube-upload, ffmpeg, codec, bug-prod, rary-teste

## Contexto

Rary (socio de lancamento/conteudo) tentou testar a plataforma pela primeira vez em producao. Subiu 1 beat via fluxo completo (upload → analyze → generate → review → publish). O upload pro YouTube retornou 200 OK e gravou `youtube_video_id=AJF3MRJGRFo` no post, mas no YouTube Studio dele apareceu:

> "Processamento cancelado. Nao foi possivel processar o video."

Beat ficou listado mas inacessivel. Rary deletou e tentou de novo, mesmo resultado esperado se o codigo nao mudar.

## Investigacao

### O fluxo real (logs Railway 13:11-13:12)

```
13:11:51  POST /publish        → comecou
13:12:02  Thumbnail rejeitada  → 403 "user doesn't have permissions" (canal nao verificado)
13:12:03  Publish retornou 200 → video_id=AJF3MRJGRFo subiu OK
13:15:45  DELETE beat          → Rary apagou pra tentar de novo
13:16:59  Novo beat            → criou ee96c64f, parou em ready_for_review
```

Conclusao: o ffmpeg gerou o MP4 sem erro, o upload pro YouTube retornou 200 com video_id, mas o YouTube **recusou processar o arquivo apos o upload** — e isso nao volta pro nosso lado (nao tem webhook). O `status` do post ficou `published` mesmo o video tendo falhado, porque o codigo nao sabe.

### Diagnostico do MP4

[ffmpeg_service.py:100-112](api/app/services/ffmpeg_service.py#L100-L112) tinha 3 parametros agressivos por causa do fix de OOM no Railway free ([commit 34ff11f](https://github.com/nextsummeer/SaaS-type-beat/commit/34ff11f)):

| Param | Funcao | Risco YouTube |
|---|---|---|
| `-c:a copy` | MP3 cru em container MP4 | **Alta** — combinacao listada como "suportada" mas instavel |
| `-r 1` | 1 fps | Media — framerate extremo |
| `-g 1` | Todo frame eh keyframe | Baixa — valido tecnicamente |

Causa mais provavel: **MP3 em container MP4**. YouTube espera AAC.

### Thumbnail rejeitada (separado)

Erro 403 do thumbnail acontece porque canal do Rary nao tem telefone verificado em [youtube.com/verify](https://youtube.com/verify). Sem verificacao, API recusa setar capa custom — mas o video em si sobe. [youtube_service.py:400-413](api/app/services/youtube_service.py#L400-L413) ja trata isso em try/except, so loga warning. **Nao precisa fix de codigo**, so avisar o Rary pra verificar telefone se quiser capa custom de volta.

## Decisao

**Trocar `-c:a copy` por `-c:a aac -b:a 320k`** no [ffmpeg_service.py:109](api/app/services/ffmpeg_service.py#L109).

**Trade-off honesto:** re-encoda o MP3 do produtor uma vez (lossy → lossy). AAC 320k eh considerado transparente pro ouvido humano em musica, especialmente em type beat (graves + hi-hats). Custo de RAM ~30MB, cabe folgado no Railway. Sobre o `-r 1` e `-g 1`, mantemos como esta — mudar volta risco de OOM e o codec eh quase certo o culpado real.

**Opcoes consideradas e descartadas:**
- **Mexer so no framerate (zero perda de audio):** risco de voltar OOM, e pode nao resolver. Descartado.
- **Mexer em codec + framerate:** dois vetores ao mesmo tempo dificulta diagnosticar se voltar a falhar. Descartado.

## Sobre loudness do audio (pergunta paralela do Gustavo)

Gustavo perguntou se o som baixo no YouTube era a gente. **Nao.** O convert worker [convert.py:29](api/app/workers/convert.py#L29) nao toca no audio (comentario explicito). O som baixo eh **normalizacao automatica do YouTube para -14 LUFS**, vale pra todo upload de todo produtor. Impossivel evitar do nosso lado. Workaround so existe no DAW do produtor (masterizar mais alto pra compensar a derrubada).

## Outros achados nos logs (nao bloqueiam)

- `QSTASH_TOKEN ausente` — esperado, modo fallback direto sem fila ainda.
- `Erro Spotify 403 para 'Slayr'` — Spotify rejeitou top tracks de um artista. Falhou de boa, pipeline seguiu. **Vale investigar depois** se for recorrente.
- Warnings librosa `n_fft too large` — irrelevantes, sinal curto.

## Acao

- [x] Fix codec aplicado em `ffmpeg_service.py`
- [x] Comentario do docstring atualizado pra refletir o motivo
- [x] Suite de testes rapidos passa (39/39 verde)
- [ ] Deploy Railway
- [ ] Rary verifica telefone em youtube.com/verify (capa custom)
- [ ] Rary republica o beat `ee96c64f` pra validar
