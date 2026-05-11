# Sessao: Setup de Contas e Supabase

**Data:** 2026-05-11
**Participantes:** Gustavo
**Tasks fechadas:** T0.5, T0.6
**Status:** concluida

## O que foi feito

### Conta Google / email do projeto
- Decisao: criar email dedicado ao projeto, separado do email pessoal e do email de type beats
- Email criado: `type.automation@gmail.com`
- 2FA ativado + codigos de backup salvos + email de recuperacao configurado
- Esse email e a conta-mae de todos os servicos do stack

### Supabase
- Conta criada com `type.automation@gmail.com`
- Organization: `Type Beat startup` (nome temporario, sem impacto tecnico)
- Projeto criado: `beatpost-mvp`
  - Regiao: South America (São Paulo / sa-east-1)
  - Database password: gerada automaticamente, salva pelo Gustavo
  - Security: Data API ligado, "Automatically expose new tables" desligado, "Enable automatic RLS" ligado
- Project ID: `fniliopbvsbimvejqqms`
- URL: `https://fniliopbvsbimvejqqms.supabase.co`

### Migrations aplicadas via SQL Editor
Tres migrations rodadas em sequencia, todas com sucesso (`Success. No rows returned`):

**001_initial_schema.sql** — Tabelas:
- `youtube_accounts` — armazena canal YouTube + refresh_token encriptado (bytea)
- `beats` — unidade central: audio, status da state machine, resultado do analyze
- `posts` — 3 rows por beat (variacoes A/B/C): titulo, descricao, tags, agendamento
- `api_usage` — tracking de custo por usuario por chamada paga
- Trigger `set_updated_at()` em todas as tabelas com `updated_at`
- Extension `pgcrypto` habilitada (para encriptar refresh_token)

**002_rls_policies.sql** — RLS:
- RLS habilitado em todas as 4 tabelas
- Policy `auth.uid() = user_id` em youtube_accounts, beats, posts (SELECT/INSERT/UPDATE/DELETE)
- api_usage: SELECT permitido ao dono; INSERT bloqueado para usuario (so via service-role no backend)

**003_storage_buckets.sql** — Storage:
- Bucket `audios` (privado, max 100MB, audio/mpeg wav flac mp4 x-m4a)
- Bucket `covers` (privado, max 5MB, image/jpeg png)
- Bucket `videos` (privado, max 500MB, video/mp4)
- Policies de acesso: path comeca com `{user_id}/`, so o dono acessa

### Verificacao
- Query `select * from beats` retornou `Success. No rows returned` — tabela existe, RLS em vigor

### Credenciais
- **Salvas pelo Gustavo** em documento privado: Publishable key, Secret key, Project ID, URL
- **Nao registradas aqui** por seguranca

### Git
- Commit: `chore: cria projeto Supabase e aplica migrations iniciais`
- Push para `github.com/nextsummeer/SaaS-type-beat` (branch main)

## Decisoes tomadas nesta sessao

| Tema | Decisao |
|------|---------|
| Email do projeto | `type.automation@gmail.com` — conta nova, separada de uso pessoal |
| GitHub vs novo repo | Repo ja existia (`nextsummeer/SaaS-type-beat`), reaproveitado |
| API Keys Supabase | Novo formato (`sb_publishable_` / `sb_secret_`) — legacy nao usado |

## Proximo passo

**T0.7** — Configurar Vercel (web/) e Railway (api/)
- Vercel: importar repo, root = `web/`, framework Next.js, env vars
- Railway: importar repo, root = `api/`, buildpack Python, ffmpeg via apt
- Criterio: Vercel mostra build hello-world; Railway responde `/health` 200
