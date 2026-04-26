# Upstash QStash — Async worker via HTTP

**Versao alvo:** qstash-python 2.0+
**Docs oficiais:** https://upstash.com/docs/qstash
**Atualizado:** 2026-04-25 via Context7

## Setup

```bash
pip install qstash
```

Conta gratuita em upstash.com. Criar projeto QStash. Copiar:
- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`

## Publicar job (publisher)

```python
# api/app/services/qstash_service.py
from qstash import QStash
from .config import settings

qstash = QStash(settings.QSTASH_TOKEN)

def enqueue_worker(beat_id: str, worker: str, delay: int = 0):
    """
    worker: 'convert' | 'analyze' | 'generate' | 'publish'
    delay: segundos
    """
    qstash.message.publish_json(
        url=f"{settings.API_URL}/internal/beats/{beat_id}/{worker}",
        body={"beat_id": beat_id},
        retries=3,
        delay=f"{delay}s" if delay else None,
    )
```

## Receber job (consumer FastAPI)

```python
# api/app/routes/internal.py
from fastapi import APIRouter, Request, HTTPException
from qstash import Receiver
from ..config import settings

router = APIRouter(prefix="/internal/beats")

receiver = Receiver(
    current_signing_key=settings.QSTASH_CURRENT_SIGNING_KEY,
    next_signing_key=settings.QSTASH_NEXT_SIGNING_KEY,
)

async def verify_qstash(request: Request):
    """Valida assinatura. Em dev, aceita header X-Mock-QStash."""
    if settings.ENVIRONMENT == "development" and request.headers.get("X-Mock-QStash"):
        return
    signature = request.headers.get("Upstash-Signature")
    if not signature:
        raise HTTPException(401, "Missing signature")
    body = await request.body()
    try:
        receiver.verify(
            body=body.decode(),
            signature=signature,
            url=str(request.url),
        )
    except Exception:
        raise HTTPException(401, "Invalid signature")

@router.post("/{beat_id}/convert")
async def convert_endpoint(beat_id: str, request: Request):
    await verify_qstash(request)
    from ..workers.convert import run
    return await run(beat_id)
```

## Worker idempotente

```python
# api/app/workers/convert.py
async def run(beat_id: str):
    beat = supabase.table("beats").select("*").eq("id", beat_id).single().execute().data
    if beat["status"] not in ("uploaded", "converting"):
        return {"ok": True, "skipped": True, "reason": f"status={beat['status']}"}

    supabase.table("beats").update({"status": "converting"}).eq("id", beat_id).execute()
    try:
        # ... ffmpeg conversion
        supabase.table("beats").update({
            "status": "converted",
            "audio_converted_path": converted_path,
        }).eq("id", beat_id).execute()
        # encadear proximo
        from ..services.qstash_service import enqueue_worker
        enqueue_worker(beat_id, "analyze")
        return {"ok": True}
    except Exception as e:
        supabase.table("beats").update({
            "status": "failed",
            "error_message": str(e)[:500],
        }).eq("id", beat_id).execute()
        raise   # 5xx faz QStash retry
```

## Modo mock pra dev local

```python
def enqueue_worker(beat_id: str, worker: str, delay: int = 0):
    if settings.ENVIRONMENT == "development" and not settings.QSTASH_TOKEN:
        # chama sincrono pra debug
        import requests
        requests.post(
            f"{settings.API_URL}/internal/beats/{beat_id}/{worker}",
            json={"beat_id": beat_id},
            headers={"X-Mock-QStash": "1"},
        )
        return
    # producao: usa QStash real
    qstash.message.publish_json(...)
```

## Limites

| Plano | Mensagens/dia | Custo |
|---|---|---|
| Free | 500 | $0 |
| Pay-as-you-go | unlimited | ~$1 / 100k msgs |

MVP: 10 users × 60 beats/mes × 4 workers = 80 msgs/dia. **Free tier cobre.**

## Async version

QStash Python tem versao async tambem:

```python
from qstash import AsyncQStash

qstash = AsyncQStash(settings.QSTASH_TOKEN)
await qstash.message.publish_json(...)
```

Util quando worker FastAPI ja usa async.

## Schedules (cron) — opcional

QStash tambem agenda recorrente:

```python
qstash.schedule.create(
    destination=f"{settings.API_URL}/internal/cleanup",
    cron="0 4 * * *",  # 4h da manha todo dia
    body={},
)
```

Util pra job de limpeza de uploads orfaos (V2).

## Gotchas

- **Signing key tem 2 versoes** (current + next) pra rotacao. Receiver tenta ambas
- **Body precisa ser string em verify**, nao bytes. `body.decode()` resolve
- **URL no verify deve bater EXATAMENTE com a URL chamada** — incluindo trailing slash, query string. Em proxy reverso (Railway), validar que `request.url` reflete a URL externa
- **Retry 3x default:** 5xx → retry. 4xx (incluindo 401 do verify) NAO retry
- **Webhook em localhost:** QStash nao consegue chamar localhost. Usar ngrok em dev OU mock mode
- **Delay max:** 7 dias. Pra mais que isso, usar Schedule
- **Idempotency key opcional** no publish — se enviar com mesma key em <X minutos, QStash deduplica
- **Body 1MB max** — pra payloads grandes, passar reference (beat_id) e worker busca
