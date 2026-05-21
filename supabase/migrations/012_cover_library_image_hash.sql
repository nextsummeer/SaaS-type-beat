-- T4.12 (complemento): adiciona image_hash em cover_library para dedup
-- ADR 2026-05-21-geracao-de-capa-prompt-base-claude.md
-- Hash SHA256 da imagem permite detectar quando produtor sobe manualmente
-- uma capa que ja existe na biblioteca (gerada por IA e baixada).
-- Nesse caso, reusa cover_id existente em vez de duplicar storage.

alter table cover_library add column image_hash text;

create index cover_library_user_hash_idx
  on cover_library(user_id, image_hash)
  where image_hash is not null;
