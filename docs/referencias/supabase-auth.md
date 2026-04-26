# Supabase Auth — Email + Google + Next.js helpers

**Versao alvo:** @supabase/supabase-js 2.45+ + @supabase/auth-helpers-nextjs 0.10+
**Docs oficiais:** https://supabase.com/docs/guides/auth
**Atualizado:** 2026-04-25

> Nota: Supabase migrou helpers pra `@supabase/ssr`. No MVP usamos `auth-helpers-nextjs` (estavel). Migrar pra ssr na V2.

## Setup

```bash
cd web
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-ui-react @supabase/auth-ui-shared
```

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://[id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Provider Google no dashboard

1. Supabase dashboard > Authentication > Providers > Google
2. Toggle "Enable"
3. Pegar Client ID + Secret do Google Cloud (mesmo OAuth client da YouTube API)
4. Callback URL pra colar no Google: `https://[id].supabase.co/auth/v1/callback`

## Clients

```ts
// web/lib/supabase/client.ts (Client Component)
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
export const createClient = () => createClientComponentClient();

// web/lib/supabase/server.ts (Server Component / Server Action)
import { createServerComponentClient, createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
export const createServerClient = () => createServerComponentClient({ cookies });
export const createActionClient = () => createServerActionClient({ cookies });
```

## Login UI (componente shadcn-ui ready)

```tsx
// web/app/(auth)/login/page.tsx
"use client";
import { createClient } from "@/lib/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function LoginPage() {
  const supabase = createClient();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={["google"]}
          redirectTo={`${window.location.origin}/auth/callback`}
          localization={{
            variables: {
              sign_in: { email_label: "Email", password_label: "Senha" },
            },
          }}
        />
      </div>
    </div>
  );
}
```

## Callback handler

```ts
// web/app/auth/callback/route.ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
```

## Logout

```ts
"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";

export async function logout() {
  const supabase = createServerActionClient({ cookies });
  await supabase.auth.signOut();
  redirect("/login");
}
```

## Acesso ao user no backend (FastAPI)

Frontend manda JWT no header `Authorization: Bearer <token>`. Backend valida via supabase admin:

```python
# api/app/deps.py
def get_current_user(authorization: str = Header(...), supabase = Depends(get_supabase)):
    token = authorization.replace("Bearer ", "")
    user_response = supabase.auth.get_user(token)
    if not user_response.user:
        raise HTTPException(401)
    return user_response.user
```

## RLS — JWT do user passa direto

Frontend usando `createClientComponentClient` ja injeta JWT em cada query. Postgres aplica policies automaticamente:

```ts
const { data } = await supabase.from("beats").select("*");
// Equivalente a: SELECT * FROM beats WHERE auth.uid() = user_id
```

## Gotchas

- **Trocar `@supabase/auth-helpers-nextjs` por `@supabase/ssr`** quando MVP estabilizar — auth-helpers esta em maintenance
- **Provider Google aparece com "Continue with Google"** — UI customizada precisa replicar isso
- **Callback URL no Google Cloud** precisa incluir BOTH: `[supabase].co/auth/v1/callback` (Supabase trata) e `[seu-dominio]/auth/callback` (seu handler)
- **Email confirm:** padrao Supabase pede confirmacao. Em beta privado, desabilitar em Auth > Settings > Email Auth > Confirm email
- **JWT expira em 1h** — refresh automatico pelo client. No backend, valide a cada request (get_user faz isso)
- **Service role key NUNCA no frontend** — anon key + RLS. Service role e server-side only
