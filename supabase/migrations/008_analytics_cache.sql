-- T7.2: cache de 24h para respostas da YouTube Analytics API.
-- Reduz chamadas externas (1 unit cada) e respeita o delay natural
-- de 24-48h dos dados do YT Analytics. Chave composta (user_id, cache_key)
-- onde cache_key codifica o tipo de relatorio + periodo (ex: "overview:7d").

create table analytics_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  cache_key text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, cache_key)
);

-- Indice pra purga de expirados (cron futuro, ou query "give me valid cache")
create index analytics_cache_expires_idx on analytics_cache(expires_at);

-- RLS: usuario so le o proprio cache; insert/update so via service_role
alter table analytics_cache enable row level security;

create policy "analytics_cache_read_own" on analytics_cache
  for select using (auth.uid() = user_id);

-- service_role precisa de full access pra cachear (regra do projeto, ver memory)
grant select, insert, update, delete on table public.analytics_cache to service_role;
