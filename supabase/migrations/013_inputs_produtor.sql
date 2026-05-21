-- T2.6: inputs do produtor (mood + artistas) + capa via biblioteca + default_brief
-- ADR 2026-05-07-fluxo-upload-e-inputs-do-produtor.md
-- ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md (atualiza modelo de capa)
-- mood NULLABLE no MVP (beats antigos nao tem essa info — frontend obriga em uploads novos)
-- cover_source default 'manual' (beats antigos ficam como manual, nao quebra)

-- =====================================================
-- 1. CATALOGO DE ARTISTAS DE REFERENCIA (leitura publica autenticada)
-- =====================================================
create table artistas_referencia (
  id uuid primary key default gen_random_uuid(),
  nome_canonico text not null,
  spotify_id text,
  popularity integer,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index artistas_referencia_nome_idx
  on artistas_referencia(lower(nome_canonico));

create unique index artistas_referencia_spotify_id_uniq
  on artistas_referencia(spotify_id)
  where spotify_id is not null;

alter table artistas_referencia enable row level security;

create policy "artistas_referencia_read_all" on artistas_referencia
  for select to authenticated using (true);

grant select, insert, update, delete on table public.artistas_referencia to service_role;
grant select on table public.artistas_referencia to authenticated;


-- =====================================================
-- 2. RELACAO N:N BEAT <-> ARTISTAS
-- =====================================================
create table beat_artistas (
  beat_id uuid not null references beats(id) on delete cascade,
  artista_id uuid not null references artistas_referencia(id) on delete restrict,
  role text not null check (role in ('main', 'collab')),
  created_at timestamptz not null default now(),
  primary key (beat_id, artista_id)
);

create index beat_artistas_artista_idx on beat_artistas(artista_id);

alter table beat_artistas enable row level security;

create policy "beat_artistas_owner" on beat_artistas
  for all using (
    exists (
      select 1 from beats
      where beats.id = beat_artistas.beat_id
        and beats.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on table public.beat_artistas to service_role;


-- =====================================================
-- 3. CAMPOS NOVOS EM beats
-- =====================================================
alter table beats add column mood text
  check (mood in ('sad', 'aggressive', 'romantic', 'dark', 'energetic', 'atmospheric'));

alter table beats add column cover_source text not null default 'manual'
  check (cover_source in ('library', 'manual', 'inline_ai'));

alter table beats add column cover_id uuid references cover_library(id) on delete set null;

create index beats_cover_id_idx on beats(cover_id) where cover_id is not null;


-- =====================================================
-- 4. default_brief EM user_profiles
-- =====================================================
-- JSONB com: {artista_id, sujeito, ambiente, iluminacao, energia, nota_livre}
-- Nullable: so preenche apos primeiro uso da aba /capas (wizard T4.13)
-- Sem validacao de schema no banco — validacao no Python (permite iterar sem deploy)
alter table user_profiles add column default_brief jsonb;
