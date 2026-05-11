# Schema Supabase — SQL completo

**Criado:** 2026-04-25
**Status:** ativo
**Tags:** arquitetura, schema, supabase, rls

## Migracao 001 — Tabelas

```sql
-- Helper pra updated_at automatico
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- youtube_accounts (1:1 user no MVP, 1:N na V2)
create table youtube_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id text not null,
  channel_title text,
  refresh_token bytea not null,        -- pgp_sym_encrypt
  access_token text,                   -- pode ser null/expirado
  access_token_expires_at timestamptz,
  scopes text[],                       -- youtube.upload, youtube.readonly
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, channel_id)
);
create trigger youtube_accounts_updated
  before update on youtube_accounts
  for each row execute function set_updated_at();

-- beats
-- Nota 2026-05-07: mood, cover_source, visual_style sao adicionados na migration 004 (T2.6).
-- Mood vem do produtor (cards visuais no upload), nao do Gemini.
create table beats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_path text not null,
  audio_converted_path text,           -- mp3 320kbps
  cover_path text,
  video_path text,                     -- mp4 gerado (capa+audio)
  status text not null default 'uploaded',
  bpm int,                             -- do analyze.py (Gemini)
  music_key text,                      -- do analyze.py (Gemini)
  genero text,                         -- do analyze.py (Gemini) — trap, drill, afrobeat, etc
  artistas_similares jsonb,            -- do analyze.py (Gemini) — backup pra angulo C do generate
  tags_sugeridas jsonb,                -- do analyze.py (Gemini grounded search)
  duracao_segundos int,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create trigger beats_updated
  before update on beats
  for each row execute function set_updated_at();
create index beats_user_id_idx on beats(user_id);
create index beats_status_idx on beats(status);

-- posts (3 rows por beat: A/B/C)
create table posts (
  id uuid primary key default gen_random_uuid(),
  beat_id uuid not null references beats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  variacao text not null check (variacao in ('A','B','C')),
  titulo text not null,
  descricao text not null,
  tags jsonb not null,
  scheduled_at timestamptz,
  youtube_video_id text,
  youtube_url text,
  published_at timestamptz,
  status text not null default 'draft',
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (beat_id, variacao)
);
create trigger posts_updated
  before update on posts
  for each row execute function set_updated_at();
create index posts_user_id_idx on posts(user_id);
create index posts_beat_id_idx on posts(beat_id);
create index posts_scheduled_at_idx on posts(scheduled_at);

-- usage tracking (futuro billing)
create table api_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users(id),
  beat_id uuid references beats(id) on delete set null,
  feature text not null,
    -- gemini_audio | gemini_search | claude_copy | youtube_upload | ffmpeg_convert | ffmpeg_video
  cost_usd numeric(10,6),
  tokens_in int,
  tokens_out int,
  duration_ms int,
  metadata jsonb,
  created_at timestamptz default now()
);
create index api_usage_user_id_created_idx on api_usage(user_id, created_at desc);
```

## Migracao 002 — RLS policies

```sql
-- youtube_accounts
alter table youtube_accounts enable row level security;
create policy "youtube_accounts_own" on youtube_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- beats
alter table beats enable row level security;
create policy "beats_own" on beats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- posts
alter table posts enable row level security;
create policy "posts_own" on posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- api_usage (read-only pelo user, INSERT so via service-role no backend)
alter table api_usage enable row level security;
create policy "api_usage_read_own" on api_usage
  for select using (auth.uid() = user_id);
-- INSERT bloqueado pra usuarios; service-role bypassa
```

## Migracao 003 — Storage buckets + policies

```sql
-- Buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('audios', 'audios', false, 104857600, array['audio/mpeg','audio/wav','audio/flac','audio/mp4','audio/x-m4a']),
  ('covers', 'covers', false, 5242880, array['image/jpeg','image/png']),
  ('videos', 'videos', false, 524288000, array['video/mp4']);

-- Policy: paths sao {user_id}/{beat_id}/...
create policy "audios_own" on storage.objects
  for all using (
    bucket_id = 'audios' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  ) with check (
    bucket_id = 'audios' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  );

create policy "covers_own" on storage.objects
  for all using (
    bucket_id = 'covers' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  ) with check (
    bucket_id = 'covers' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  );

create policy "videos_own" on storage.objects
  for all using (
    bucket_id = 'videos' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  ) with check (
    bucket_id = 'videos' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  );
```

## Convencao de paths em Storage

```
audios/{user_id}/{beat_id}/original.{ext}
audios/{user_id}/{beat_id}/converted.mp3
covers/{user_id}/{beat_id}/cover.{ext}
videos/{user_id}/{beat_id}/{variacao}.mp4    # gerados pra YouTube
```

## Encriptacao do refresh_token

```sql
-- Criar extension uma vez
create extension if not exists pgcrypto;

-- Inserir
insert into youtube_accounts (user_id, channel_id, refresh_token, ...)
values (
  $user_id,
  $channel_id,
  pgp_sym_encrypt($refresh_token, current_setting('app.vault_key')),
  ...
);

-- Ler (no backend, usando service-role)
select pgp_sym_decrypt(refresh_token, current_setting('app.vault_key'))::text
from youtube_accounts where user_id = $user_id;
```

`app.vault_key` = `SUPABASE_VAULT_KEY` em env. Definido no postgres via:
```sql
alter database postgres set app.vault_key = '<chave>';
```

## Testes RLS

`supabase/tests/rls_isolation_test.sql`:

```sql
-- Setup: 2 users, beats em cada
-- Asserta que user A com JWT proprio nao ve beat de user B
-- Asserta que tentar UPDATE em beat de B retorna 0 rows
```

Roda via `supabase db test`.
