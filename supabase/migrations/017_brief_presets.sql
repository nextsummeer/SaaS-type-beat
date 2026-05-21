-- Brief presets: substitui o user_profiles.default_brief unico por uma tabela
-- com multiplos presets nomeados. User ativa um e os botoes "Gerar 1/3" do
-- header usam o ativo.
-- ADR atualizada (mesmo doc 2026-05-21).
-- Limites em codigo (presets_service.py):
--   free: 1 / intermediate: 5 / premium: ilimitado.
-- Coluna user_profiles.default_brief continua existindo (nao deleta) pra nao
-- quebrar codigo legado durante transicao.

create table brief_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brief jsonb not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index brief_presets_user_idx on brief_presets(user_id, created_at desc);

-- Garante que so 1 preset por user e ativo simultaneamente
create unique index brief_presets_one_active_per_user
  on brief_presets(user_id) where is_active = true;

alter table brief_presets enable row level security;

create policy "brief_presets_read_own" on brief_presets
  for select using (auth.uid() = user_id);

create policy "brief_presets_insert_own" on brief_presets
  for insert with check (auth.uid() = user_id);

create policy "brief_presets_update_own" on brief_presets
  for update using (auth.uid() = user_id);

create policy "brief_presets_delete_own" on brief_presets
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.brief_presets to service_role;
