-- Skeleton refresh-safe: cover_library ganha status.
-- Antes: worker inseria a row SO depois de tudo dar certo. Refresh durante
-- geracao perdia o feedback visual.
-- Agora: worker insere pending PRIMEIRO (Realtime dispara, skeleton aparece),
-- e UPDATE pra ready/failed quando termina. Refresh-safe.

alter table cover_library
  add column status text not null default 'ready'
  check (status in ('pending', 'ready', 'failed'));

-- image_url e storage_path agora podem ser NULL (rows pending ainda nao tem)
alter table cover_library alter column image_url drop not null;
alter table cover_library alter column storage_path drop not null;

create index cover_library_user_status_created_idx
  on cover_library(user_id, status, created_at desc);
