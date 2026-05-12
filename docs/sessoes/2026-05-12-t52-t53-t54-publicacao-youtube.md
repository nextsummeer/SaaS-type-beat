# T5.2 + T5.3 + T5.4: pipeline de publicacao no YouTube funcionando

**Data:** 2026-05-12 (continuacao apos T5.1 OAuth)
**Status:** ✅ Concluido — beats sao publicados no YouTube com sucesso
**Pessoas:** Gustavo + Claude

## Resultado

Pipeline completo funcionando ponta-a-ponta:

```
upload MP3 + capa → analyze → generate → REVIEW → confirmar agendamento
   → publish.py baixa MP3+capa → ffmpeg gera MP4 → upload YouTube → publishAt
   → vira publico sozinho no horario marcado
```

Beats publicados nesta sessao: **FAVELA DREAM**, **VAMP SEASON**.

## O que foi entregue

### T5.3 — ffmpeg_service.py
- `audio_to_mp4(mp3, cover, output)` gera MP4 1920x1080 com capa quadrada centralizada (pillarbox)
- Pre-processamento via Pillow: capa eh forcada pra altura 1080 (LANCZOS), pillarbox preto nas laterais
- ffmpeg em modo low-memory: `preset ultrafast`, `bf 0`, `g 1`, `profile baseline`
- Binario do ffmpeg vem do `imageio-ffmpeg` (binario embutido no pip) — evita problema de PATH no Railway

### T5.2 — youtube_service.py
- `upload_video(user_id, mp4, title, desc, tags, scheduled_at, privacy_status, cover)`
- Usa `google-api-python-client` + `google-auth`
- Carrega tokens via RPC `get_youtube_refresh_token` (decifra refresh_token)
- Refresh automatico do access_token quando expira, persiste o novo
- `MediaFileUpload(chunksize=-1, resumable=True)` — sobe ate ~50MB de uma vez
- `publishAt` no futuro → vai como `private`, YouTube agenda; passado/ausente → sobe direto
- Trunca titulo (100), descricao (5000), tags (500 chars total)
- Thumbnail custom em try/except (HttpError 403 ignorado pra canal nao verificado)

### T5.4 — workers/publish.py
- Endpoint `POST /internal/beats/{id}/publish`
- Baixa MP3 (`audios`) + capa (`covers`) via signed URL
- Chama `ffmpeg_service.audio_to_mp4` + `youtube_service.upload_video`
- Atualiza `posts.youtube_video_id`, `posts.youtube_url`, `posts.status`, `posts.published_at`
- Atualiza `beats.status = 'published'`
- Idempotente: se `youtube_video_id` ja existe, retorna `{skipped: true}`
- `_mark_failed` salva `error_message` no `beats` e `posts`
- Limpa arquivos tmp no `finally`

### Schema
- Migration 007: `posts.privacy_status` (`public`/`unlisted`, default `public`, CHECK constraint)

### Roteamento
- `qstash_service.dispatch_publish_job(beat_id)`
- PATCH `/posts/{id}` aceita `privacy_status`, dispara `dispatch_publish_job` quando recebe `status='scheduled'`

### UI
- `/beats/[id]/review`: toggle Publico / Nao listado no card de agendamento
- `BeatCard`: `scheduled` + `scheduled_at <= now()` mostra como "Postado" (YouTube nao tem webhook, sem necessidade de cron)
- Aviso amber quando user cola link `beatstars.com/beat/...` longo (sugere `bsta.rs/XXX`)
- Fix do bug timezone do `datetime-local` (input volta no fuso local do navegador, nao UTC)

## Decisoes confirmadas com Gustavo

| Pergunta | Resposta |
|---|---|
| Quando disparar publish? | Imediato no `Confirmar agendamento`; YouTube agenda via `publishAt` |
| Visibilidade publica/nao listada? | User escolhe na review |
| `scheduled_at` no passado? | Sobe direto como publico (modo de teste) |
| Capa 1:1 dentro de 16:9? | Pillarbox preto (capa preenche 100% da altura, barras so nas laterais) |

## Bugs resolvidos durante a sessao

### 1. `FileNotFoundError: 'ffmpeg'`
- `nixpacks.toml` declara `nixPkgs = ["python311", "ffmpeg"]` mas o nix instala em PATH que nao fica disponivel em runtime
- **Fix:** `imageio-ffmpeg` no requirements + `imageio_ffmpeg.get_ffmpeg_exe()` resolve o path

### 2. `rc=-9` (SIGKILL = OOM) na 1a tentativa de MP4 1920x1080
- libx264 com `preset veryfast` mantem varios frames em buffer pra lookahead — >300MB RAM
- Railway plano free = 512MB total
- **Fix:** `preset ultrafast` + `bf 0` (sem B-frames) + `g 1` (GOP=1, todos keyframes) + `profile baseline`
- Resultado: pico de RAM <100MB

### 3. Vidoeo cai em Shorts ao publicar
- YouTube classifica como Shorts qualquer video <=3min com aspect 1:1 ou vertical
- Capa quadrada + beat 2:30 = Shorts automatico
- **Fix:** MP4 em 1920x1080 com pillarbox preto nas laterais

### 4. Capa pequena no meio do video
- `img.thumbnail()` so faz downscale; capas <1080x1080 ficavam pequenas com margem em cima/baixo tambem
- **Fix:** `img.resize()` forca altura 1080 sempre (upscale ou downscale via LANCZOS)

### 5. Bug timezone no input `datetime-local`
- `data.scheduled_at.slice(0, 16)` pegava string UTC e mostrava como local
- Usuario agendava 19:16 BRT, reabria e via 22:16 (UTC)
- **Fix:** `new Date(scheduled_at)` parseia UTC e `toLocalDatetimeInput()` formata no fuso do navegador

### 6. Card nao atualiza pra "Postado" apos `publishAt`
- YouTube nao envia webhook quando o video vira publico
- Banco continua com `status='scheduled'` indefinidamente
- **Fix UI:** `scheduled` + `scheduled_at <= now()` ja mostra "Postado" verde (sem mudar o banco; sem cron)

### 7. Link de venda nao clicavel na descricao do YouTube
- Conta YouTube precisa de **Recursos avancados ativados** ("Links externos nas descricoes dos videos")
- Esse recurso exige: verificacao por video (selfie 6s) OU documento OU 2 meses de historico
- Conta de teste do Gustavo estava `Qualificado` mas nao `Ativado`
- **Fix:** Gustavo vai fazer a verificacao por video (6s do rosto, aprovacao em algumas horas)
- **Fix UI extra:** aviso amber na review quando link eh `beatstars.com/beat/...` longo (truncado na previa, recomenda `bsta.rs/XXX`)

## Commits

```
50e6a2e feat: pipeline de publicacao no YouTube (mp4 + upload + agendamento)
4b7cd0b fix: usar imageio-ffmpeg embutido em vez do binario do sistema
a9beb3b fix: converter scheduled_at de UTC pro fuso local no input datetime-local
0c31246 fix: renderizar MP4 em 1920x1080 (pillarbox) pra evitar virar Shorts
632fb1f fix: pre-processar capa com Pillow pra evitar OOM no ffmpeg
28ebf9d debug: aumenta stderr_tail do ffmpeg + log do comando completo
34ff11f fix: forcar libx264 em low-memory mode (Railway 512MB OOM)
be7fa92 fix: capa preenche altura 1080 + badge 'Postado' apos publishAt
143f54e feat: avisa quando link de venda eh beatstars.com longo (deve ser bsta.rs)
```

## Pendencias dessa fase

- [ ] **T5.5** — Solicitar aumento de cota YouTube no Google Cloud Console (10k/dia → 100k/dia). Atual permite ~6 uploads/dia/projeto.
- [ ] **T5.6** — Test E2E (`@slow`) publicando beat real em conta de teste.
- [ ] **Gustavo:** ativar Recursos avancados do canal YouTube (selfie 6s) pra links virarem clicaveis.

## Lessons learned

1. **Container Python free tier requer ffmpeg em low-memory mode.** Default do libx264 estoura facil.
2. **YouTube Shorts classifier eh agressivo.** Qualquer video <=3min em 1:1 ou vertical = Shorts. 1920x1080 obrigatorio pra cair no algoritmo normal.
3. **`imageio-ffmpeg` resolve dor de cabeca de PATH** em buildpacks que tratam binarios nix de forma estranha.
4. **Pillow eh mais leve que filter chain do ffmpeg** pra operacoes de canvas/composicao. Pre-processar imagem e passar pronta vale a pena.
5. **YouTube nao tem webhook de publishAt.** Solucoes: cron polling, lazy check, ou (a mais simples) tratar no frontend pelo `scheduled_at < now()`.
6. **Links externos exigem Recursos avancados ativados.** Mesmo com verificacao por telefone, conta "Qualificado" nao basta.
