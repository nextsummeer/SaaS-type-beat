-- Sprint B #1: rating do produtor por capa.
-- ADR 2026-05-22-prompt-dna-capa-v3.md
--
-- Coluna nullable porque a maioria das capas vai ficar sem rating
-- (cliente so vai avaliar quando quiser). 1-5 estrelas via CHECK.
-- Index BTREE permite query futura "minhas top capas" / "capas
-- abandonadas".

alter table cover_library
  add column if not exists rating smallint
  check (rating is null or rating between 1 and 5);

create index if not exists cover_library_rating_idx
  on cover_library(user_id, rating desc nulls last, created_at desc);

comment on column cover_library.rating is
  'Avaliacao do produtor (1-5 estrelas) na capa gerada. NULL = nao avaliado. '
  'Usado pra calibrar prompt no futuro e priorizar capas favoritas na UI.';
