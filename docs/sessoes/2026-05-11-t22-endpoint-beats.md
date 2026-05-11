# Sessao 2026-05-11 — T2.2: Endpoint POST /beats

## Objetivo
Criar o endpoint `POST /beats` na API FastAPI que registra um beat no banco de dados (status=uploaded) após o upload do arquivo no Supabase Storage, e prepara o terreno para despachar o job de conversão via QStash.

## O que foi feito

### Codigo criado
- `api/app/routes/beats.py` — endpoint POST /beats: valida JWT via `validate_token`, insere row na tabela `beats` com status=uploaded, tenta despachar job QStash (graceful se token ausente)
- `api/app/services/supabase_service.py` — `get_admin_client()` (service role) e `validate_token(jwt)` usando `client.auth.get_user()`
- `api/app/services/qstash_service.py` — `dispatch_convert_job(beat_id)`: se `QSTASH_TOKEN` ausente, loga warning e retorna False sem falhar
- `api/app/__init__.py`, `api/app/routes/__init__.py`, `api/app/services/__init__.py` — arquivos de modulo Python necessarios para imports

### Codigo modificado
- `api/app/main.py` — registra `beats.router` com `app.include_router()`
- `api/requirements.txt` — adiciona `supabase==2.15.0` e `requests==2.32.3`
- `web/components/UploadForm.tsx` — apos upload para Storage, chama `POST /beats` com JWT do usuario no header Authorization
- `web/app/page.tsx` — substituiu template padrao Next.js por redirect para `/dashboard`
- `web/package.json` — `lint` script mudou de `next lint` para `eslint .` (Next.js 16 removeu o comando `next lint`)
- `web/eslint.config.mjs` — novo arquivo: flat config do ESLint usando `eslint-config-next` 16

### Dependencias adicionadas (web/)
- `eslint@^9` — ESLint compativel com eslint-config-next 16
- `eslint-config-next@16.2.6` — regras Next.js/React/TypeScript
- `@eslint/eslintrc@^3` — necessario para FlatCompat (depois substituido por import direto)

## Problemas encontrados e solucoes

### 1. next lint removido no Next.js 16
- **Problema:** `pnpm lint` falhava com "Invalid project directory: web/lint"
- **Causa:** Next.js 16 removeu o comando `next lint` do CLI
- **Solucao:** Instalar `eslint` + `eslint-config-next` e mudar script para `eslint .` com `eslint.config.mjs`

### 2. Projeto duplicado no Railway
- **Problema:** Havia dois projetos Railway (`efficient-generosity` e `wonderful-forgiveness`), o segundo com build falhando
- **Causa:** `wonderful-forgiveness` criado sem root directory = `api/`, tentava buildar da raiz do monorepo
- **Solucao:** Deletar `wonderful-forgiveness`. O correto e `efficient-generosity`.

### 3. Vercel mostrando pagina padrao Next.js
- **Problema:** `saa-s-type-beat.vercel.app` mostrava template "To get started, edit page.tsx"
- **Causa 1:** `web/app/page.tsx` ainda era o template padrao do Next.js (nunca atualizado)
- **Causa 2:** Todos os deploys desde T1.5 falhavam por falta de env vars `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no Vercel
- **Solucao:** Adicionar env vars no Vercel + substituir `page.tsx` por redirect para `/dashboard`

### 4. 500 + CORS no POST /beats
- **Problema:** Upload retornava "Failed to fetch" no frontend
- **Causa:** `service_role` nao tinha permissao de INSERT na tabela `beats` — migrations foram criadas manualmente sem o GRANT automatico que o Supabase UI faria
- **Solucao:** Executar no SQL Editor do Supabase:
  ```sql
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
  ```
- **Observacao:** Quando a API retorna 500 sem CORS headers, o browser reporta "CORS error" como sintoma, mas a causa real e o 500

## Variaveis de ambiente necessarias

### Railway (API)
| Variavel | Descricao |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (bypassa RLS) |
| `CORS_ORIGINS` | Origins permitidas (Vercel URL + localhost) |
| `QSTASH_TOKEN` | Token Upstash QStash (opcional por enquanto) |

### Vercel (Web)
| Variavel | Descricao |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL publica do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon publica |
| `NEXT_PUBLIC_API_URL` | URL da API Railway |

## Estado ao fechar sessao
- T2.2 `[x]` concluida — row em `beats` com `status=uploaded` confirmada no Supabase Table Editor
- QStash ainda nao configurado (conta Upstash pendente) — codigo ja preparado para quando configurar
- Proximo: T2.3 — Worker `convert.py` com ffmpeg (MP3 320kbps + loudnorm)
