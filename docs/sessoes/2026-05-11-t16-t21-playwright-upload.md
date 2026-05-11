# Sessao 2026-05-11 — T1.6 + T2.1: Teste E2E + UI de Upload

**Data:** 2026-05-11
**Tasks fechadas:** T1.6, T2.1
**Task bloqueada:** T1.7 (aguardando definicao dos estilos visuais)
**Proxima task:** T2.2 — Endpoint POST /beats que cria row + dispara QStash

---

## O que foi feito

### T1.6 — Teste E2E: login → dashboard → logout

- Playwright instalado: `@playwright/test` v1.59.1 + `dotenv` v17.4.2 (dev deps)
- Browsers instalados: `pnpm exec playwright install chromium`
- `web/playwright.config.ts` — config com webServer Next.js (localhost:3000), reuseExistingServer: true, reporter: list
- `web/e2e/auth.spec.ts` — teste completo:
  - `beforeAll`: cria user fake via Supabase admin API (service role key)
  - Teste: login com email/senha → verifica URL /dashboard + heading "Dashboard" → clica "Sair" → verifica URL /login
  - `afterAll`: deleta user fake via admin API
- Script `"test:e2e": "playwright test"` adicionado ao package.json
- `SUPABASE_SERVICE_ROLE_KEY` adicionado ao `.env.local` (nao commitado, necessario para testes E2E)
- Testado: `pnpm test:e2e` → **1 passed (22s)**

**Variavel de ambiente necessaria para E2E:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # pegar em Supabase → Settings → API → service_role
```

**Para rodar os testes:**
```bash
cd web
pnpm test:e2e   # sobe o dev server automaticamente se nao estiver rodando
```

---

### T1.7 — Onboarding pos-cadastro (BLOQUEADA)

- Marcada como `[-]` no _tasks-mvp.md
- Motivo: estilos visuais (Ghost Mode, Midnight Drive, etc.) ainda nao foram definidos/curados
- Retomar quando T4.6 (curadoria de estilos visuais) estiver avancada
- Proxima task pulou para T2.1

---

### T2.1 — UI de upload com progress bar

- `web/lib/storage.ts` — helper `uploadWithProgress(signedUrl, file, onProgress)` usando XHR + `upload.onprogress`. Suporta callback de progresso (0-100%).
- `web/components/UploadForm.tsx` — componente client-side com:
  - Dropzone clicavel para audio (MP3, WAV, FLAC, M4A) — obrigatorio
  - Dropzone clicavel para capa (JPG, PNG) — opcional
  - Barra de progresso violeta animada durante upload
  - Estados: idle / uploading / done / error
  - Botao desabilitado durante upload
  - Tela de sucesso com botao "Fazer outro upload"
- `web/app/(app)/upload/page.tsx` — pagina /upload com titulo e UploadForm
- **Fluxo tecnico:**
  1. Pega `user.id` via `supabase.auth.getUser()`
  2. Gera `beat_id` com `crypto.randomUUID()`
  3. Cria signed URL via `supabase.storage.from('audios').createSignedUploadUrl(path)`
  4. Faz PUT via XHR com progresso em tempo real
  5. Repete para capa (bucket `covers`) se fornecida
- **Path salvo:** `audios/{user_id}/{beat_id}/original.{ext}`
- Testado: MP3 de 3.45MB salvo corretamente no bucket `audios` do Supabase Storage. RLS funcionando (usuario so ve seus proprios arquivos).

---

## Decisoes tecnicas desta sessao

| Decisao | Motivo |
|---|---|
| Upload direto browser → Supabase Storage (sem passar pelo backend) | Reduz egress do API; Supabase Storage aceita PUT autenticado via signed URL |
| `createSignedUploadUrl` + XHR em vez de `supabase.storage.upload()` | `upload()` nao expoe callbacks de progresso; XHR tem `upload.onprogress` nativo |
| `crypto.randomUUID()` no frontend para gerar beat_id | Disponivel em todos browsers modernos; beat_id gerado antes do upload para montar o path |
| T1.7 bloqueada em vez de implementada com placeholders | Estilos visuais nao definidos; implementar com placeholders geraria retrabalho garantido |

---

## Estado atual do projeto

- `/login` — funcionando
- `/dashboard` — funcionando (badge API: OK)
- `/upload` — **novo**: formulario de upload com progress bar funcionando
- Supabase Storage buckets `audios` e `covers` — recebendo arquivos corretamente
- Testes E2E — funcionando (`pnpm test:e2e`)

---

## Proximos passos

- **T2.2** — Endpoint `POST /beats` no FastAPI: recebe `{audio_path, cover_path}`, cria row em `beats` (status=uploaded), dispara QStash → worker pipeline. **Primeira task do backend Python.**
- **T2.3** — Worker convert.py: ffmpeg → MP3 320kbps + loudnorm
- **T1.7** — Retomar quando estilos visuais estiverem definidos (T4.6)

---

## Ambiente

- `cd web && pnpm dev` — frontend localhost:3000
- `cd web && pnpm test:e2e` — testes E2E (sobe servidor automaticamente)
- `.env.local` requer: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`, `SUPABASE_SERVICE_ROLE_KEY`
