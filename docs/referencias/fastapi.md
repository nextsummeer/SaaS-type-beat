# FastAPI — Routes + Deps + Async + Lifespan

**Versao alvo:** FastAPI 0.115+ + Pydantic v2
**Docs oficiais:** https://fastapi.tiangolo.com
**Atualizado:** 2026-04-25

## Setup inicial

```bash
cd api
python -m venv .venv
source .venv/Scripts/activate    # ou .venv/bin/activate
pip install fastapi uvicorn[standard] pydantic-settings python-jose[cryptography] python-multipart
pip install supabase qstash google-genai anthropic google-api-python-client ffmpeg-python
pip install --group dev pytest pytest-asyncio httpx ruff mypy
```

`pyproject.toml` minimo:

```toml
[project]
name = "beatpost-api"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]>=0.30",
  "pydantic>=2.5",
  "pydantic-settings>=2.0",
  "supabase>=2.0",
  "qstash>=2.0",
  "google-genai>=1.0",
  "anthropic>=0.40",
  "google-api-python-client>=2.150",
  "google-auth-oauthlib>=1.2",
  "ffmpeg-python>=0.2",
]

[project.optional-dependencies]
dev = ["pytest", "pytest-asyncio", "httpx", "ruff", "mypy"]
```

## App entrypoint

```python
# api/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routes import beats, posts, youtube, health

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup: warm caches, validate env
    print(f"Starting BeatPost API in {settings.ENVIRONMENT}")
    yield
    # shutdown

app = FastAPI(title="BeatPost API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(beats.router, prefix="/beats", tags=["beats"])
app.include_router(posts.router, prefix="/posts", tags=["posts"])
app.include_router(youtube.router, prefix="/youtube", tags=["youtube"])
```

## Config via pydantic-settings

```python
# api/app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_VAULT_KEY: str

    GOOGLE_API_KEY: str
    ANTHROPIC_API_KEY: str

    GOOGLE_OAUTH_CLIENT_ID: str
    GOOGLE_OAUTH_CLIENT_SECRET: str
    GOOGLE_OAUTH_REDIRECT_URI: str

    QSTASH_URL: str = "https://qstash.upstash.io"
    QSTASH_TOKEN: str
    QSTASH_CURRENT_SIGNING_KEY: str
    QSTASH_NEXT_SIGNING_KEY: str

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
```

## Dependency injection — auth

```python
# api/app/deps.py
from fastapi import Depends, Header, HTTPException
from supabase import create_client, Client
from .config import settings

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def get_current_user(authorization: str = Header(...), supabase: Client = Depends(get_supabase)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization[7:]
    user = supabase.auth.get_user(token).user
    if not user:
        raise HTTPException(401, "Invalid token")
    return user
```

## Route com auth

```python
# api/app/routes/beats.py
from fastapi import APIRouter, Depends
from ..deps import get_current_user, get_supabase

router = APIRouter()

@router.post("")
async def create_beat(audio_path: str, cover_path: str | None = None,
                      user = Depends(get_current_user),
                      supabase = Depends(get_supabase)):
    result = supabase.table("beats").insert({
        "user_id": user.id,
        "audio_path": audio_path,
        "cover_path": cover_path,
        "status": "uploaded",
    }).execute()
    beat_id = result.data[0]["id"]
    # dispara worker via QStash
    return {"beat_id": beat_id}
```

## Async vs sync

- Use `async def` quando ha I/O (HTTP, DB) — FastAPI roda no event loop
- Use `def` (sync) pra CPU-bound ou libs sync (ffmpeg-python wrapper) — FastAPI joga em threadpool
- supabase-py e sync por enquanto. Tudo bem usar com `async def` (chama em threadpool implicito), mas perde paralelismo

## Lifespan vs startup/shutdown

`lifespan` (asynccontextmanager) e a forma moderna. `@app.on_event("startup")` esta deprecated.

## Gotchas

- **CORS antes de routers:** middleware add_middleware deve vir antes do include_router pra ordem certa
- **Pydantic v2:** `model_config = SettingsConfigDict(...)` e nao `class Config:`
- **Service role key bypassa RLS:** sempre filtrar `user_id` explicitamente nos workers
- **Reload em dev:** `uvicorn app.main:app --reload --reload-dirs app` evita reload em todos arquivos
- **Trailing slash:** FastAPI redireciona `/beats` → `/beats/`. Pode quebrar CORS preflight em dev. Configurar consistentemente.
