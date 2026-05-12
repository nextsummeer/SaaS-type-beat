-- Adiciona artista_nome e purchase_link aos beats
ALTER TABLE beats ADD COLUMN IF NOT EXISTS artista_nome text;

-- purchase_link fica em posts (pode variar por variação)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS purchase_link text;

-- Perfil do produtor (nome, instagram) — 1:1 com auth.users
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  nome text,
  instagram text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger user_profiles_updated
  before update on user_profiles
  for each row execute function set_updated_at();

alter table user_profiles enable row level security;

create policy "user_profiles_select_own"
  on user_profiles for select
  using (auth.uid() = user_id);

create policy "user_profiles_insert_own"
  on user_profiles for insert
  with check (auth.uid() = user_id);

create policy "user_profiles_update_own"
  on user_profiles for update
  using (auth.uid() = user_id);
