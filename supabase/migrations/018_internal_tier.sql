-- Tier 'internal' pra contas internas (dono, time, beta testers).
-- Limites efetivamente ilimitados (creditos altos + briefs ilimitados).
-- Gustavo (dono) usa esse tier pra testar sem ficar travado em limites.

-- Descobre o nome da constraint check do tier e dropa
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.user_profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%tier%';

  if constraint_name is not null then
    execute 'alter table user_profiles drop constraint ' || quote_ident(constraint_name);
  end if;
end $$;

-- Recria com 'internal' incluido
alter table user_profiles add constraint user_profiles_tier_check
  check (tier in ('free', 'intermediate', 'premium', 'internal'));
