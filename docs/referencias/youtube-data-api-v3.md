# YouTube Data API v3 — Upload + OAuth + Quota

**Versao alvo:** google-api-python-client 2.150+
**Docs oficiais:** https://developers.google.com/youtube/v3/docs/videos/insert
**Atualizado:** 2026-04-25

## Setup

```bash
pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
```

Cadastrar projeto no Google Cloud Console:
1. Habilitar "YouTube Data API v3"
2. Criar OAuth 2.0 Client (tipo: Web application)
3. Authorized redirect URIs:
   - `http://localhost:3000/api/youtube/callback` (dev)
   - `https://beatpost.vercel.app/api/youtube/callback` (prod)
4. Copy Client ID + Secret pro `.env`

## OAuth flow (3 steps)

### Step 1: gerar URL de autorizacao

```python
# api/app/services/youtube_service.py
from google_auth_oauthlib.flow import Flow

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

def get_auth_url(state: str) -> str:
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_OAUTH_REDIRECT_URI,
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",       # garante refresh_token
        prompt="consent",            # forca novo refresh token
        state=state,
    )
    return auth_url
```

### Step 2: trocar code por tokens

```python
def exchange_code(code: str) -> dict:
    flow = Flow.from_client_config(...)
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "expires_at": creds.expiry,
        "scopes": creds.scopes,
    }
```

### Step 3: refresh quando expira

```python
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

def refresh_access_token(refresh_token: str) -> dict:
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
        client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
    )
    creds.refresh(Request())
    return {"access_token": creds.token, "expires_at": creds.expiry}
```

## Upload de video

```python
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

def upload_video(
    access_token: str,
    mp4_path: str,
    title: str,
    description: str,
    tags: list[str],
    publish_at: datetime | None = None,
    privacy: str = "private",  # ate publish_at; depois vira public
) -> str:
    creds = Credentials(token=access_token)
    youtube = build("youtube", "v3", credentials=creds)

    body = {
        "snippet": {
            "title": title[:100],              # YouTube limita 100 chars
            "description": description[:5000], # 5000 chars
            "tags": tags[:500],                # ate 500 tags, somando ate 500 chars
            "categoryId": "10",                # Music
        },
        "status": {
            "privacyStatus": "private" if publish_at else privacy,
            "publishAt": publish_at.isoformat() if publish_at else None,
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(mp4_path, chunksize=-1, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()

    return response["id"]   # youtube_video_id
```

## Set thumbnail (opcional, falha em conta nao verificada)

```python
def set_thumbnail(access_token: str, video_id: str, jpg_path: str):
    creds = Credentials(token=access_token)
    youtube = build("youtube", "v3", credentials=creds)
    media = MediaFileUpload(jpg_path)
    try:
        youtube.thumbnails().set(videoId=video_id, media_body=media).execute()
    except Exception as e:
        # 403 se conta nao verificada — silencioso, video fica com auto-frame
        print(f"Thumbnail falhou: {e}")
```

## Pegar info do canal apos OAuth

```python
def get_channel_info(access_token: str) -> dict:
    creds = Credentials(token=access_token)
    youtube = build("youtube", "v3", credentials=creds)
    response = youtube.channels().list(part="snippet", mine=True).execute()
    item = response["items"][0]
    return {"channel_id": item["id"], "title": item["snippet"]["title"]}
```

## Quota

| Operacao | Custo (units) |
|---|---|
| videos.insert | 1.600 |
| thumbnails.set | 50 |
| channels.list | 1 |
| videos.update | 50 |

Default: **10.000 units/dia/projeto**. Reset 00:00 PT.

10 users × 3 variacoes A/B/C = 30 uploads/dia × 1600 = 48.000. **Estoura.**

**T5.5: solicitar 100k/dia** via Google Cloud Console > Quotas > YouTube Data API v3 > Edit Quota. Aprovacao automatica pra usos legitimos.

## Limites de fields

- `title`: 100 chars
- `description`: 5000 chars
- `tags`: total combinado <= 500 chars (incluindo virgulas)
- `categoryId`: "10" = Music
- `tags`: lowercase, sem aspas no API call

## Gotchas

- **`prompt="consent"` essencial** pra garantir refresh_token retornado em re-conexao
- **Refresh_token pode ser revogado** se app passar de "Testing" pra "Production" sem OAuth review — manter em Testing ate 100 users
- **Thumbnail 403:** conta sem verificacao por SMS/2FA nao consegue subir custom thumb. Mensagem amigavel "ative verificacao em myaccount.google.com"
- **publishAt no passado:** YouTube rejeita se < now+5min. Sempre adicionar buffer
- **Resumable upload:** essencial pra videos > 5MB. Sem isso, falha em rede instavel
- **Tags com espaco:** "drake type beat" e UMA tag, nao 3. Mas tags com >30 chars sao truncadas
- **Quota se acumula em todo o projeto:** 10 users compartilham 10k. Solicitar aumento ANTES de abrir beta
