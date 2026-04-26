# Workers + QStash

**Criado:** 2026-04-25
**Status:** ativo
**Tags:** arquitetura, workers, async, qstash

## Por que QStash

Workers fazem operacoes longas: ffmpeg de 30s, Gemini de 5-10s, YouTube upload de 30-60s. Nao pode rodar inline numa request HTTP de browser. Opcoes:

1. **Celery + Redis** — padrao Python, mas precisa VPS persistente, Redis ($), Celery worker rodando 24/7
2. **Upstash QStash** — HTTP-based serverless. Voce publica job, ele faz POST no seu endpoint quando manda. $0 idle.
3. **Background tasks FastAPI** — so pra <30s. Nao serve.

Escolhemos QStash. Backend FastAPI fica stateless. QStash gerencia retries, agendamentos, signing.

## Como funciona

### Publicar job

```python
from upstash_qstash import Client

qstash = Client(token=QSTASH_TOKEN)

qstash.message.publish_json(
    url=f"{API_URL}/internal/beats/{beat_id}/convert",
    body={"beat_id": beat_id},
    retries=3,
    delay=0,  # ou f"{seconds}s" pra agendar
)
```

QStash garante que `POST {url}` vai ser chamado. Se 5xx, retry automatico com backoff exponencial. Se 2xx, marca como entregue.

### Receber job (endpoint /internal)

```python
from fastapi import Request, HTTPException
from upstash_qstash import Receiver

receiver = Receiver(
    current_signing_key=QSTASH_CURRENT_SIGNING_KEY,
    next_signing_key=QSTASH_NEXT_SIGNING_KEY,
)

@app.post("/internal/beats/{beat_id}/convert")
async def convert_endpoint(beat_id: str, request: Request):
    signature = request.headers.get("Upstash-Signature")
    body = await request.body()
    try:
        receiver.verify(signature=signature, body=body, url=str(request.url))
    except Exception:
        raise HTTPException(401, "Invalid signature")
    # processar
    ...
```

Sem assinatura valida = 401. So QStash chama esses endpoints.

## Idempotencia

QStash retry em 5xx. Worker precisa estar pronto pra ser chamado N vezes pro mesmo beat sem efeito colateral:

```python
async def convert(beat_id: str):
    beat = supabase.table("beats").select("*").eq("id", beat_id).single().execute().data
    if beat["status"] not in ("uploaded", "converting"):
        return {"ok": True, "skipped": True}
    # marca em-andamento (para outros retries verem)
    supabase.table("beats").update({"status": "converting"}).eq("id", beat_id).execute()
    # processar
    ...
    # ao final
    supabase.table("beats").update({"status": "converted"}).eq("id", beat_id).execute()
    # encadear proximo worker
    qstash.message.publish_json(url=f"{API_URL}/internal/beats/{beat_id}/analyze")
```

State machine e o seguro. Status anterior define se o worker avanca ou skipa.

## Encadeamento de workers

```
[upload] → POST /beats → publish convert
[convert] → status=converted → publish analyze
[analyze] → status=analyzed → publish generate
[generate] → status=ready_for_review → STOP (espera user)
[user clica publicar] → POST /beats/{id}/publish → publish (worker)
[publish] → status=published → END
```

Se um worker falha 3x:
- Status fica em `failed`
- `error_message` populado
- Frontend mostra erro com botao "Tentar de novo"
- "Tentar de novo" reseta status pro estagio anterior + republica job

## Agendamento (Fase 5 — postagem)

A publicacao real no YouTube tambem usa scheduled_at do post. Mas o agendamento nao e do QStash — e do YouTube (`publishAt` na request `videos.insert`).

QStash so dispara o WORKER de upload. Worker faz upload com `publishAt` futuro. YouTube guarda video como private agendado e libera no horario.

Por isso `publish.py` chama YouTube uma vez por variacao A/B/C, com 3 `publishAt` diferentes. Nao precisa cron rodando.

## Limites Upstash QStash

| Plano | Mensagens/dia | Custo |
|---|---|---|
| Free | 500 | $0 |
| Pay-as-you-go | unlimited | $1 / 100k msgs |

MVP com 10 users × 60 beats/mes × 4 workers (convert/analyze/generate/publish×3) = ~80 msgs/dia. **Free tier cobre.**

## Local dev

Em dev (sem Upstash configurado), usar mock que chama o endpoint sincronamente:

```python
# api/app/services/qstash_service.py
class QStashService:
    def publish(self, url: str, body: dict, delay: int = 0):
        if ENVIRONMENT == "development" and not QSTASH_TOKEN:
            # chama sincrono pra debug local
            requests.post(url, json=body, headers={"X-Mock-QStash": "1"})
            return
        # producao usa QStash real
        client.message.publish_json(url=url, body=body, delay=f"{delay}s")
```

Endpoints `/internal/*` aceitam `X-Mock-QStash: 1` header **so quando ENVIRONMENT=development**.

## Observabilidade

QStash dashboard mostra:
- Jobs publicados, entregues, falhados
- Tempo de delivery
- Retries

Logar no backend o `Upstash-Message-Id` em cada worker pra correlacionar.
