# Sessao 2026-05-12 — T5.1 OAuth YouTube

**Status:** concluida
**Tags:** sessao, fase5, oauth, youtube, supabase, debug

## Resumo

T5.1 entregue ponta-a-ponta: produtor clica "Conectar canal" em `/youtube`, autoriza no Google, refresh_token cifrado fica salvo no Supabase, UI mostra canal conectado. Canal de teste `NEXT SUMMER MUSIK` (ID `UCaUDdYH41dD-sL0p4f7lPjw`) conectado com sucesso.

Tambem entregue: T2.14 (lista de beats), refinamentos de UX (modal de delete, selecao em lote, sync de link na descricao da review, delete no review).

## Arquivos criados / alterados

### Backend
- `api/app/services/youtube_oauth.py` (novo) — state HMAC stateless, exchange_code, channels.list com fallback mine/managedByMe, revoke, save_account via RPC.
- `api/app/routes/youtube.py` (novo) — `GET /youtube/auth`, `GET /youtube/callback`, `GET /youtube/me`, `DELETE /youtube/me`.
- `api/app/main.py` — registra `youtube.router`.

### SQL
- `supabase/migrations/006_youtube_oauth_helpers.sql` (novo) — funcoes SQL `upsert_youtube_account` e `get_youtube_refresh_token` com `SECURITY DEFINER` + `search_path = public, extensions`.

### Frontend
- `web/lib/api.ts` — `fetchYoutubeAccount`, `disconnectYoutubeAccount`, `getYoutubeAuthUrl`, tipo `YoutubeAccount`.
- `web/app/(app)/youtube/page.tsx` (novo) — card "Conectar canal" ou "Canal conectado" + modal de desconectar + parse de status/erro via querystring.
- `web/components/ConfirmDialog.tsx` (novo) — modal generico de confirmacao (usado em delete de beat, desconectar canal).
- `web/components/BeatCard.tsx` e `web/app/(app)/beats/page.tsx` — modo selecao em lote, delete confirmado, grid mais denso.
- `web/app/(app)/beats/[id]/review/page.tsx` — botao "Abrir" no link de venda, sync do link na descricao ao salvar, botao "Deletar beat" no header.

## Decisoes

- **Callback no backend FastAPI/Railway**, nao no Next.js. Toda logica de cifrar/decifrar fica em um lugar so.
- **Scope = `youtube.upload + youtube.readonly`**. Sem readonly, `channels.list?mine=true` da 403.
- **state CSRF stateless** via HMAC-SHA256 com chave reusada do `SUPABASE_VAULT_KEY` (sem cookie, funciona cross-domain entre Vercel e Railway).
- **refresh_token cifrado com pgp_sym_encrypt** (regra 2 do CLAUDE.md). Chave em env `SUPABASE_VAULT_KEY`.
- **Fallback mine -> managedByMe** em `get_channel_info` pra cobrir Brand Accounts.
- **Logs de debug com `logger.warning` + prefixo `[YT_DEBUG]`** — `logger.info` e filtrado pelo uvicorn em prod.

## Gotchas resolvidos (em ordem)

1. **Variavel `GOOGLE_OAUTH_REDIRECT_URI` ja existia vazia no Railway** — clicar "Overwrite" no aviso resolve.
2. **YouTube Data API v3 nao estava ativada no projeto `beatpost-mvp`** — tinha sido ativada no `Default Gemini Project` por engano. Erro: `403 SERVICE_DISABLED`. Fix: ativar em https://console.cloud.google.com/apis/library/youtube.googleapis.com?project=beatpost-mvp.
3. **PowerShell 5.1 nao tem `RandomNumberGenerator.GetBytes`** — usar `RNGCryptoServiceProvider` em 5.1, ou comando alternativo com GUIDs.
4. **Scope `youtube.upload` sozinho retorna `no_channel`** — adicionar `youtube.readonly` no codigo E no consent screen do Google Cloud.
5. **Funcao SECURITY DEFINER com `search_path = public` nao acha pgp_sym_encrypt** — pgcrypto vive em schema `extensions` no Supabase, nao `public`. Fix: `SET search_path = public, extensions`.
6. **`logger.info` invisivel em prod** — usar `logger.warning` pra debug.

## Variaveis novas no Railway

- `SUPABASE_VAULT_KEY` — chave simetrica usada pra `pgp_sym_encrypt` do refresh_token. Gerada com `RNGCryptoServiceProvider` (32 bytes -> base64). Guardada em local seguro.
- `WEB_URL` — URL do frontend pra redirect pos-callback. Valor: `https://saa-s-type-beat.vercel.app`.

## Commits da sessao

- `975a4ea` feat: T2.14 — pagina /beats com lista de cards
- `2c9c333` feat: deletar beats + cards mais densos
- `1d438d0` feat: modal de confirmacao + selecao em lote para deletar beats
- `522d124` feat: melhorias na pagina de review do beat
- `fcfa15f` feat: T5.1 — OAuth YouTube (auth + callback + me + disconnect)
- `96fd2cc` fix: forcar tela 'escolher conta' no OAuth do YouTube
- `72334cb` fix: adicionar scope youtube.readonly
- `92e4d35` debug: logs detalhados + fallback managedByMe
- `d15d25f` debug: forcar logs YT_DEBUG visiveis (info->warning)
- `735c1c5` fix: search_path = public, extensions na migration 006
- `5596cf0` docs: fecha T5.1

## Proximo passo

T5.3 (ffmpeg_service: audio_para_video) + T5.2 (youtube_service.upload_video) + T5.4 (worker publish.py) — a fase que efetivamente publica o video no canal conectado.

## Tarefas manuais pendentes pro produtor

- Solicitar quota de 100k uploads/dia no Google Cloud (T5.5) — atual default e 10k/dia que limita a ~6 uploads/dia.
- Quando passar do beta privado, enviar app pra OAuth Verification do Google (sair do modo "Testing").
