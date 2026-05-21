-- T4.12: biblioteca de capas reusaveis por produtor.
-- ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md
-- Cada produtor tem sua biblioteca privada (RLS via user_id).
-- Capas ficam em covers/{user_id}/library/{uuid}.jpg no Storage.
-- Bucket 'covers' ja existe (migration 003) com policy covers_own.

create table cover_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  storage_path text not null,
  brief_used jsonb,
  prompt_final text,
  cost_usd numeric(10,4) not null default 0,
  source text not null check (source in ('ai_generated', 'manual_upload')),
  used_in_beats_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index cover_library_user_created_idx
  on cover_library(user_id, created_at desc);

alter table cover_library enable row level security;

create policy "cover_library_read_own" on cover_library
  for select using (auth.uid() = user_id);

create policy "cover_library_insert_own" on cover_library
  for insert with check (auth.uid() = user_id);

create policy "cover_library_delete_own" on cover_library
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.cover_library to service_role;
