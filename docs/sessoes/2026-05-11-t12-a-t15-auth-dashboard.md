# Sessao 2026-05-11 — T1.2 a T1.5: Auth + Dashboard + API

**Data:** 2026-05-11
**Tasks fechadas:** T1.1 (retroativo), T1.2, T1.3, T1.4, T1.5
**Proxima task:** T1.6 — Teste E2E Playwright

---

## O que foi feito

### T1.2 — Login Supabase Auth
- Pacotes instalados: `@supabase/supabase-js` + `@supabase/ssr`
- `web/lib/supabase/client.ts` — cliente browser (createBrowserClient)
- `web/lib/supabase/server.ts` — cliente server SSR com cookies
- `web/components/LoginForm.tsx` — email/senha + Google OAuth + toggle login/criar conta + erros em portugues
- `web/app/(auth)/login/page.tsx` — pagina /login dark
- `web/app/auth/callback/route.ts` — troca code OAuth por sessao, redireciona pro /dashboard
- `web/.env.local` — criado com NEXT_PUBLIC_SUPABASE_URL + ANON_KEY (nao commitado)
- Supabase Anon Key: novo formato `sb_publishable_*` (Supabase atualizou nomenclatura)
- Testado: cadastro com email retornou "Verifique seu e-mail" — fluxo correto

### T1.3 — Middleware de protecao de rotas
- `web/middleware.ts` — checa sessao via cookies Supabase
- Rotas protegidas: /dashboard, /upload, /beats, /youtube, /configuracoes, /onboarding
- Sem sessao → redirect /login. Ja logado em /login → redirect /dashboard
- Testado: acessar /dashboard sem login redirecionou para /login

### T1.4 — Dashboard vazio + sidebar
- `web/app/(app)/layout.tsx` — layout com sidebar fixa
- `web/app/(app)/dashboard/page.tsx` — pagina /dashboard vazia
- `web/components/Sidebar.tsx` — Upload, Beats, YouTube, Sair (logout funcional)
- **Bug resolvido:** texto "Sair" invisivel. Causa: elemento `<button>` nao herda cor do pai em alguns browsers + `justify-between` empurrava item pra fora da tela. Solucao: mover "Sair" para dentro do mesmo `<nav>` que os outros links (estrutura identica = mesma heranca de estilos).
- `web/app/globals.css` — adicionado `button { color: inherit }`

### T1.5 — API /health + integracao web→api
- `web/lib/api.ts` — `healthCheck()` com fetch + graceful offline (try/catch)
- Dashboard mostra badge "API: OK v0.1.0" (verde) ou "API: offline" (vermelho)
- `.env.local` atualizado para apontar pro Railway (`saas-type-beat-production.up.railway.app`)
- CORS ja estava configurado no `api/app/main.py`
- Testado: badge verde com Railway respondendo

---

## Decisoes tecnicas desta sessao

| Decisao | Motivo |
|---|---|
| Nao usar `@supabase/auth-ui-react` | React 19 incompatibilidade. Substituido por LoginForm manual com Tailwind |
| `@supabase/ssr` em vez de `auth-helpers-nextjs` | Pacote oficial para Next.js App Router |
| Sidebar com `<nav>` unico (sem justify-between) | justify-between + h-screen causava item fora do viewport |
| `button { color: inherit }` no globals.css | Browsers nao herdam cor nos `<button>` por padrao |

---

## Estado atual do projeto

- `/login` — funcionando (email/senha + Google OAuth configurado no Supabase)
- `/dashboard` — funcionando (protegido por middleware, mostra badge API)
- Sidebar — funcionando (Upload, Beats, YouTube, Sair)
- API Railway — respondendo (`/health` retorna OK v0.1.0)
- Supabase Auth — funcionando (cadastro envia email de confirmacao)

---

## Proximos passos

- **T1.6** — Teste E2E Playwright: instalar Playwright, criar `web/e2e/auth.spec.ts`, testar login → dashboard → logout com user fake via Supabase admin
- **T1.7** — Onboarding pos-cadastro: galeria de selecao de estilo visual
- Fase 2 — Upload + conversao MP3 (blocos maiores de trabalho)

---

## Ambiente de desenvolvimento

- `pnpm dev` dentro de `web/` para rodar o frontend (localhost:3000)
- `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` — necessario uma vez no Windows para habilitar scripts PowerShell
- `.env.local` nao esta no git — precisa ser recriado manualmente com as chaves do Supabase
