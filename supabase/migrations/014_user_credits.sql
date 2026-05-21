-- T4.14: sistema de creditos para geracao de capa IA
-- ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md
-- Limites por tier ficam em PLAN_LIMITS no codigo Python (credits_service.py).
-- Reset: ciclo de 30 dias a partir do signup (renova automaticamente quando data passa).

alter table user_profiles add column tier text not null default 'free'
  check (tier in ('free', 'intermediate', 'premium'));

alter table user_profiles add column credits_used_this_month integer not null default 0;

-- Default: 30 dias apos signup do user.
-- credits_service detecta quando passa dessa data e: zera contador + soma +30 dias.
alter table user_profiles add column credits_reset_at timestamptz not null
  default (now() + interval '30 days');

create index user_profiles_credits_reset_idx
  on user_profiles(credits_reset_at)
  where credits_used_this_month > 0;
