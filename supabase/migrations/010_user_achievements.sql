-- T9.1: tabela de conquistas desbloqueadas por usuario.
-- Catalogo das conquistas mora no codigo Python (achievements_service.py).
-- Aqui so persistimos QUEM desbloqueou O QUE e QUANDO.

create table user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

create index user_achievements_user_id_idx on user_achievements(user_id);

alter table user_achievements enable row level security;

create policy "user_achievements_read_own" on user_achievements
  for select using (auth.uid() = user_id);

grant select, insert, delete on table public.user_achievements to service_role;
