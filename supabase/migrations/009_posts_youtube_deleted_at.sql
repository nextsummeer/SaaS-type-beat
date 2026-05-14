-- T7.x: detectar quando produtor deleta video manualmente no YouTube.
-- Campo persistente (uma vez marcado, fica). Privado/unlisted NAO entram
-- aqui porque sao reversiveis e calculados em tempo real via videos.list.

alter table posts
  add column if not exists youtube_deleted_at timestamptz;

comment on column posts.youtube_deleted_at is
  'Timestamp da primeira vez que detectamos que o video foi deletado do YouTube. NULL = ainda existe (ou nunca foi publicado).';

create index if not exists posts_youtube_deleted_at_idx
  on posts(youtube_deleted_at)
  where youtube_deleted_at is null;
