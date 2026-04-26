# Next.js 15 — App Router + Middleware + Server Actions

**Versao alvo:** Next.js 15.1.x
**Docs oficiais:** https://nextjs.org/docs
**Atualizado:** 2026-04-25

## Setup inicial

```bash
pnpm create next-app web --typescript --tailwind --app --src-dir=false --import-alias "@/*"
cd web
pnpm dev
```

## Route groups (para nosso layout)

```
web/app/
├── (auth)/           # Sem layout de app (login/signup)
│   └── login/page.tsx
├── (app)/            # Com layout protegido (sidebar)
│   ├── layout.tsx    # Sidebar + protecao auth
│   ├── dashboard/page.tsx
│   ├── beats/[id]/page.tsx
│   ├── upload/page.tsx
│   └── youtube/connect/page.tsx
└── api/
    ├── youtube/
    │   ├── auth/route.ts
    │   └── callback/route.ts
    └── internal/...
```

`(auth)` e `(app)` sao route groups — nao aparecem na URL, mas permitem layout independente.

## Middleware pra autenticacao

```ts
// middleware.ts (raiz do web/)
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Rotas protegidas: tudo dentro de (app)
  const isAppRoute = ["/dashboard", "/beats", "/upload", "/youtube"]
    .some((p) => req.nextUrl.pathname.startsWith(p));

  if (isAppRoute && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/beats/:path*", "/upload/:path*", "/youtube/:path*"],
};
```

## Server Components fetching

```tsx
// web/app/(app)/dashboard/page.tsx
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: beats } = await supabase
    .from("beats")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      {beats?.map((beat) => <BeatCard key={beat.id} beat={beat} />)}
    </div>
  );
}
```

RLS faz isolamento — query nao precisa filtrar por user_id.

## Server Actions (form mutations)

```tsx
// app/(app)/beats/[id]/actions.ts
"use server";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function updatePost(postId: string, formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from("posts").update({
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao"),
  }).eq("id", postId);
  revalidatePath(`/beats/${postId}`);
}
```

## Realtime subscription (Client Component)

```tsx
"use client";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";

export function BeatStatus({ beatId, initial }: { beatId: string; initial: string }) {
  const [status, setStatus] = useState(initial);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const channel = supabase
      .channel(`beat:${beatId}`)
      .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "beats", filter: `id=eq.${beatId}` },
          (payload) => setStatus(payload.new.status))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [beatId, supabase]);

  return <span>{status}</span>;
}
```

## Gotchas

- **Cookie SSR:** sempre passar `cookies()` em Server Components / Server Actions. Sem isso, sessao nao vai pra DB.
- **Hydration:** `createClientComponentClient` so dentro de `"use client"`. Misturar quebra hidratacao.
- **Route groups com mesmo nome:** `(auth)/login` e `(app)/login` colidem. Cada path final precisa ser unico.
- **Middleware rodando em rotas erradas:** o `matcher` e regex, cuidado com prefixos. Testar em dev.
- **Vercel preview deploys + OAuth callback:** preview tem URL dinamica que quebra OAuth. Mockar OAuth em preview ou usar redirect URI fixa de dev only em producao.
- **Server Actions e revalidacao:** sempre chamar `revalidatePath` ou `revalidateTag` apos mutar; senao Server Component nao re-renderiza.
