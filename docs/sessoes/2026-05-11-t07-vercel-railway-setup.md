# Sessao 2026-05-11 — T0.7: Vercel + Railway configurados

**Data:** 2026-05-11
**Tasks fechadas:** T0.7 (+ T1.1 coberta aqui)
**Proximo passo:** T1.2 — Login Supabase Auth

---

## O que foi feito

### Codigo criado

**web/ — Next.js completo (T1.1 coberta aqui)**
- Next.js 16.2.6 + TypeScript + Tailwind v4 + App Router
- shadcn/ui inicializado (style: base-nova, base color: neutral)
- `web/lib/utils.ts` criado manualmente (cn helper)
- `web/pnpm-workspace.yaml`: msw e sharp em `ignoredBuiltDependencies` + `allowBuilds.msw: false`
- Build passando: `pnpm build` ok localmente

**api/ — FastAPI minimo**
- `api/app/main.py`: FastAPI com CORS + endpoint `GET /health` → `{"ok":true,"version":"0.1.0"}`
- `api/requirements.txt`: fastapi==0.115.12, uvicorn[standard]==0.34.3, python-dotenv==1.1.0
- `api/Procfile`: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- `api/nixpacks.toml`: Python 3.11 + ffmpeg via nixPkgs

### Plataformas configuradas

**Vercel**
- URL: `saa-s-type-beat.vercel.app`
- Conta: Gustavo (email, plano Hobby)
- Root Directory: `web`
- Framework: Next.js (auto-detectado)
- Auto-deploy: sim, branch main
- Env vars: nenhuma ainda (hello-world nao precisa)

**Railway**
- URL: `saas-type-beat-production.up.railway.app`
- Conta: Gustavo (login GitHub)
- Root Directory: `/api`
- Builder: Railpack (detectou Python automaticamente via requirements.txt)
- Porta publica: 8080 (Railway define $PORT=8080 por padrao)
- Auto-deploy: sim, branch main

---

## Problemas encontrados e solucoes

| Problema | Causa | Solucao |
|---|---|---|
| `pnpm install` falhava com ERR_PNPM_IGNORED_BUILDS | pnpm v9+ exige aprovacao explicita de build scripts | `allowBuilds.msw: false` em pnpm-workspace.yaml |
| shadcn init nao criou lib/utils.ts | msw bloqueou o final do init | Criado manualmente |
| Railway build falhava (Railpack nao reconhecia Python) | Root Directory nao estava configurado — lia raiz do repo | Configurar Root Directory = `/api` nas Settings |
| `/health` retornava "Application failed to respond" | Dominio gerado na porta 8000, app rodando na 8080 | Editar dominio → porta 8080 |

---

## Estado atual das URLs

- **Frontend:** https://saa-s-type-beat.vercel.app
- **Backend:** https://saas-type-beat-production.up.railway.app
- **Health check:** https://saas-type-beat-production.up.railway.app/health → `{"ok":true,"version":"0.1.0"}`

---

## Contexto para proximo chat

- T0.7 e T1.1 estao fechadas
- **Proximo: T1.2** — Login Supabase Auth (email + Google)
  - Criar `web/app/(auth)/login/page.tsx`
  - Criar `web/lib/supabase/client.ts` e `server.ts`
  - Habilitar provider Google no Supabase dashboard
  - Callback em `/auth/callback`
  - Criterio: login com email/Google redireciona pra `/dashboard`
- Supabase ja esta criado: `https://fniliopbvsbimvejqqms.supabase.co`
- GitHub repo: `nextsummeer/SaaS-type-beat` (branch main)
- Gustavo e iniciante em dev — explicar antes de codar, aprovacao task por task
