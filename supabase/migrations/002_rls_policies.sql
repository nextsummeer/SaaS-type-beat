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

-- api_usage (leitura pelo user; INSERT so via service-role no backend)
alter table api_usage enable row level security;
create policy "api_usage_read_own" on api_usage
  for select using (auth.uid() = user_id);
