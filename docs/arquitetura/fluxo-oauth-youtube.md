# Fluxo OAuth YouTube

**Criado:** 2026-04-25
**Status:** ativo
**Tags:** arquitetura, oauth, youtube, seguranca

## Visao geral

OAuth 2.0 Authorization Code flow do Google. Beatmaker autoriza o BeatPost a publicar no canal dele. Sistema guarda `refresh_token` encriptado pra renovar `access_token` quando expirar (~1h).

## Diagrama de sequencia

```
[USUARIO] [WEB]            [API]              [GOOGLE]      [SUPABASE]
   │        │                │                    │             │
   │ click  │                │                    │             │
   │"Conectar"                │                    │             │
   ├───────▶│                │                    │             │
   │        │  GET /youtube/auth                  │             │
   │        ├───────────────▶│                    │             │
   │        │                │  monta URL OAuth   │             │
   │        │                │  com state=csrf    │             │
   │        │  302 → google  │                    │             │
   │        │◀───────────────┤                    │             │
   │        │  redirect      │                    │             │
   │        ├──────────────────────────────────▶│             │
   │  consent screen          │                    │             │
   │◀───────────────────────────────────────────┤             │
   │  autoriza                │                    │             │
   ├──────────────────────────────────────────▶│             │
   │        │                │                    │             │
   │        │ ◀──────────── 302 /youtube/callback?code=...&state=
   │        │                │                    │             │
   │        │  GET /youtube/callback?code=...     │             │
   │        ├───────────────▶│                    │             │
   │        │                │  POST oauth/token  │             │
   │        │                │  exchange code     │             │
   │        │                ├──────────────────▶│             │
   │        │                │  tokens            │             │
   │        │                │◀──────────────────┤             │
   │        │                │  GET channels.list │             │
   │        │                ├──────────────────▶│             │
   │        │                │  channel info      │             │
   │        │                │◀──────────────────┤             │
   │        │                │  pgp_sym_encrypt   │             │
   │        │                │  INSERT youtube_accounts        │
   │        │                ├─────────────────────────────────▶│
   │        │  302 /dashboard │                    │             │
   │        │◀───────────────┤                    │             │
   │  ve canal conectado     │                    │             │
   │◀───────┤                │                    │             │
```

## Endpoints

### `GET /api/youtube/auth`
- Gera `state` aleatorio (CSRF, salva em cookie httpOnly)
- Constroi URL: `https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=.../api/youtube/callback&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload&access_type=offline&prompt=consent&state=<csrf>`
- 302 → URL Google

### `GET /api/youtube/callback?code=...&state=...`
- Valida `state` contra cookie (CSRF)
- Trade code por tokens: POST `https://oauth2.googleapis.com/token` com `grant_type=authorization_code`
- Recebe `{access_token, refresh_token, expires_in, scope}`
- GET `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true` com `Authorization: Bearer {access_token}` → pega channel_id e title
- INSERT `youtube_accounts` com `refresh_token` encriptado via pgp_sym_encrypt
- 302 → `/dashboard?connected=1`

## Refresh de access_token

Backend funcao `youtube_service.get_access_token(user_id)`:

```python
def get_access_token(user_id: str) -> str:
    row = supabase.table("youtube_accounts").select("*").eq("user_id", user_id).single()
    if row.access_token and row.access_token_expires_at > now() + timedelta(minutes=5):
        return row.access_token
    # Refresh
    refresh_token = decrypt(row.refresh_token)
    resp = requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": GOOGLE_OAUTH_CLIENT_ID,
        "client_secret": GOOGLE_OAUTH_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    })
    tokens = resp.json()
    new_expires_at = now() + timedelta(seconds=tokens["expires_in"])
    supabase.table("youtube_accounts").update({
        "access_token": tokens["access_token"],
        "access_token_expires_at": new_expires_at,
    }).eq("user_id", user_id).execute()
    return tokens["access_token"]
```

## Scopes solicitados

- `https://www.googleapis.com/auth/youtube.upload` — upload de video + thumbnail

NAO usar `youtube` (full access) — beatmaker fica desconfiado.

## Callback URL fixa

**ATENCAO:** Vercel preview deploys usam URLs dinamicas (`beatpost-pr-42.vercel.app`). OAuth do Google rejeita callback que nao bate com `redirect_uri` autorizado.

Solucao:
- **Producao:** `https://beatpost.vercel.app/api/youtube/callback`
- **Dev local:** `http://localhost:3000/api/youtube/callback`
- **Preview branches:** sem OAuth (mock no preview)

Os 2 sao registrados no Google Cloud Console > OAuth Client.

## Refresh_token e revogado quando

- User revoga manualmente em myaccount.google.com
- Token nao usado por 6 meses
- User troca senha
- App passa de production limit (atras de OAuth review)

Ao detectar refresh fail (400 invalid_grant), marcar `youtube_accounts.access_token = null`, mostrar UI "Reconectar canal".

## Multi-canal V2

Quando suportar N canais por user, mudar:
- Tabela ja tem `unique(user_id, channel_id)` — basta tirar limite de 1 row
- UI: dropdown "Publicar em qual canal?" no agendamento
- Worker publish itera por canais quando user marcar "publicar em todos"

## Quota YouTube

- Default: 10.000 units/dia/projeto
- Upload custa 1.600 units → max 6 uploads/dia
- 10 users × 3 variacoes = 30 uploads/dia → estoura
- Solicitar 100k/dia via Google Cloud Console (T5.5)
- Aprovacao automatica pra usos legitimos
