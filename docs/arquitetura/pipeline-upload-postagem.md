# Pipeline ponta-a-ponta — Upload ate postagem

**Criado:** 2026-04-25
**Status:** ativo
**Tags:** arquitetura, pipeline, workers

## Visao geral

Upload e postagem sao processados em pipeline async via QStash. Frontend nao espera nada sincrono — ele subscreve via Supabase Realtime e atualiza UI conforme `status` da row muda.

```
[USUARIO]
   │ login (Supabase Auth)
   ▼
[NEXT.JS WEB]
   │ uploads via signed URL → Supabase Storage
   │ POST /beats {audio_path, cover_path}
   ▼
[FASTAPI]
   │ INSERT beats (status=uploaded)
   │ QStash.publish → /internal/beats/{id}/convert
   │ retorna beat_id pro frontend
   ▼
[QSTASH] ───▶ [WORKER convert.py] ────▶ status=converted ─▶ QStash next
                ffmpeg → MP3 320
                                                                │
                                                                ▼
              [WORKER analyze.py] ────▶ status=analyzed  ─▶ QStash next
                Gemini Audio + grounded search
                                                                │
                                                                ▼
              [WORKER generate.py] ───▶ status=ready_for_review ▶ STOP
                Claude → 3 posts A/B/C
                                                                │
                                                       [USUARIO REVISA UI]
                                                                │
                                                                ▼
              POST /beats/{id}/publish (apos confirmacao)
                                                                │
                                                                ▼
              [WORKER publish.py] ────▶ status=published
                ffmpeg gera mp4 + 3x YouTube upload
```

## State machine `beats.status`

```
uploaded
  ↓ (worker convert)
converting
  ↓
converted
  ↓ (worker analyze, auto-trigger)
analyzing
  ↓
analyzed
  ↓ (worker generate, auto-trigger)
generating
  ↓
ready_for_review
  ↓ (user clica "Publicar")
publishing
  ↓
published

[em qualquer transicao] → failed (com error_message)
```

State machine `posts.status` (1 row por variacao A/B/C):

```
draft → scheduled → publishing → published
                           ↓
                         failed
```

## Idempotencia dos workers

QStash faz retry automatico em 5xx. Workers precisam ser idempotentes:

```python
# pseudocodigo
def worker_convert(beat_id):
    beat = supabase.table("beats").select("*").eq("id", beat_id).single()
    if beat.status not in ("uploaded", "converting"):
        return {"ok": True, "skipped": True, "reason": f"status={beat.status}"}
    # ... resto da logica
```

Mesmo padrao em analyze, generate, publish. Status e a fonte de verdade.

## Trigger encadeado

Cada worker dispara o proximo via QStash ao concluir. Nao e cron, e cascata reativa:

```python
# convert.py concluindo
supabase.table("beats").update({"status": "converted"}).eq("id", beat_id).execute()
qstash.publish_json(
    url=f"{API_URL}/internal/beats/{beat_id}/analyze",
    body={},
    headers={"Authorization": f"Bearer {INTERNAL_TOKEN}"},
)
```

Excecao: `publish` nao e auto-trigger. Espera user confirmar via UI.

## Endpoints internos vs publicos

| Rota | Auth | Quem chama |
|---|---|---|
| `POST /beats` | JWT user | Frontend |
| `POST /beats/{id}/publish` | JWT user | Frontend (apos revisar) |
| `PATCH /posts/{id}` | JWT user | Frontend (editar variacao) |
| `/internal/beats/{id}/convert` | QStash signing key | QStash |
| `/internal/beats/{id}/analyze` | QStash signing key | QStash |
| `/internal/beats/{id}/generate` | QStash signing key | QStash |
| `/internal/beats/{id}/publish` | QStash signing key | QStash |

Endpoints `/internal/*` validam header `Upstash-Signature` (HMAC). Sem assinatura valida, retorna 401.

## Falhas e recuperacao

- Worker falha sincronamente: QStash retry 3x com backoff exponencial
- Apos 3 retries: row marca `status=failed`, `error_message` populado, frontend mostra alert
- Beatmaker pode "Re-tentar" no UI → reseta status pro estagio anterior, dispara worker novamente

## Realtime updates

Frontend usa `supabase.channel(f"beat:{id}")`:

```ts
const channel = supabase
  .channel(`beat:${beatId}`)
  .on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "beats", filter: `id=eq.${beatId}` },
      (payload) => setStatus(payload.new.status))
  .subscribe();
```

UI mostra timeline (Upload → Conversao → Analise → Geracao → Pronto) com check/loader.
