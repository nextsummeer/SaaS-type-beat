# Multitenancy via Supabase RLS desde dia 1

**Data:** 2026-04-25
**Status:** aceita
**Tags:** decisao, seguranca, supabase, rls, multitenant

## Contexto

MVP precisa nascer multitenant — desde o primeiro upload, dois usuarios diferentes nao podem ver beats um do outro. Reescrever isolamento depois e perigoso (cross-tenant leak vira incidente publico). Supabase oferece RLS (Row Level Security) nativa do Postgres com integracao com `auth.uid()` do JWT.

## Opcoes Consideradas

### 1. RLS Supabase em todas as tabelas e buckets desde dia 1
- **Pros:** Isolamento garantido pelo banco, mesmo se a aplicacao tiver bug. Storage tambem isolado via path-based policy. Audita facil (`select * from pg_policies`).
- **Contras:** Curva pra entender policies. Service-role key bypassa RLS — cuidado em usa-la so no backend.

### 2. Filtro `where user_id = ?` na aplicacao (sem RLS)
- **Pros:** Mais simples mentalmente, dev em qualquer linguagem.
- **Contras:** Bug de aplicacao = leak. Sem checagem do banco. Audit horrivel. Storage continua sem isolamento.

### 3. Schema-per-tenant
- **Pros:** Isolamento maximo.
- **Contras:** Operacional pesado. Migrations N vezes. Overkill pra MVP.

## Decisao

**Veredito: Opcao 1 — RLS em todas as tabelas e buckets.**

Mesmo que custe 1 dia de aprendizado, e feature do banco que protege ate de bug nosso. E porque escolhemos Supabase justamente pra ter isso pronto.

### Padrao em CADA tabela

```sql
create table <tabela> (
  ...
  user_id uuid not null references auth.users(id) on delete cascade,
  ...
);

alter table <tabela> enable row level security;

create policy "<tabela>_own_data" on <tabela>
  for all using (auth.uid() = user_id);
```

### Padrao em CADA bucket de Storage

Path: `{user_id}/{resource_id}/{filename}`

```sql
create policy "storage_own_files" on storage.objects
  for all using (
    bucket_id = '<bucket>' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  );
```

### Quando service-role key

Backend (FastAPI) usa **service-role key** via env var `SUPABASE_SERVICE_ROLE_KEY` para:
- Workers async (QStash chama backend, nao tem JWT do user)
- Operacoes admin (criar user, listar usage)

Backend SEMPRE filtra por `user_id` explicitamente quando usa service-role. RLS bypass e poder, nao licenca.

### Frontend e workers

- **Frontend:** anon key + JWT do user. RLS protege automaticamente.
- **Worker (recebe job QStash):** service-role key + filtro explicito `where id = ? and user_id = ?` (defense in depth).

## Consequencias

- Toda migration que adiciona tabela com `user_id` PRECISA criar RLS na mesma migration (lint check no CI futuro)
- Testes de RLS sao obrigatorios — `supabase/tests/` valida que user A nao ve beat de user B
- Service-role key NUNCA vai pro frontend nem pro repo. So via env var em Railway.
- Logs de erro nao podem expor user_id de outro tenant
- Storage policies sao um ponto comum de erro — testar end-to-end na Fase 2
