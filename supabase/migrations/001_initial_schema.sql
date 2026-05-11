-- Helper pra updated_at automatico
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- pgcrypto para refresh_token encriptado
create extension if not exists pgcrypto;

-- youtube_accounts (1:1 user no MVP)
create table youtube_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id text not null,
  channel_title text,
  refresh_token bytea not null,
  access_token text,
  access_token_expires_at timestamptz,
  scopes text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, channel_id)
);
create trigger youtube_accounts_updated
  before update on youtube_accounts
  for each row execute function set_updated_at();

-- beats
create table beats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_path text not null,
  audio_converted_path text,
  cover_path text,
  video_path text,
  status text not null default 'uploaded',
  bpm int,
  music_key text,
  genero text,
  artistas_similares jsonb,
  tags_sugeridas jsonb,
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

-- api_usage (tracking de custo por usuario)
create table api_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users(id),
  beat_id uuid references beats(id) on delete set null,
  feature text not null,
  cost_usd numeric(10,6),
  tokens_in int,
  tokens_out int,
  duration_ms int,
  metadata jsonb,
  created_at timestamptz default now()
);
create index api_usage_user_id_created_idx on api_usage(user_id, created_at desc);
