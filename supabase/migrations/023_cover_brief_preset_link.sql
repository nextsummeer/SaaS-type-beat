-- T4.41: linka a capa gerada ao brief_preset que a originou.
-- Objetivo: exibir o NOME do brief no modal da capa (CapaModal) e fazer o
-- rename do preset propagar pras capas ja geradas.
--
-- Estrategia (ADR informal sessao 2026-05-28):
--   - brief_preset_id: FK pro preset. ON DELETE SET NULL -- se o produtor
--     apaga o preset, a capa nao quebra, so perde o link ao vivo.
--   - brief_preset_name: snapshot do nome no momento da geracao. Serve de
--     FALLBACK quando o preset foi deletado (frontend prefere o nome ao vivo
--     da lista de presets enquanto o preset existir).
--
-- Nao ha backfill: capas antigas ficam com ambas as colunas nulas (so tokens).
-- Capas manuais (source='manual_upload') tambem ficam nulas -- nao tem brief.

alter table cover_library
  add column if not exists brief_preset_id uuid
    references brief_presets(id) on delete set null;

alter table cover_library
  add column if not exists brief_preset_name text;

-- Index pro ON DELETE SET NULL nao precisar de seq scan quando um preset e
-- deletado (Postgres nao cria index automatico em coluna FK).
create index if not exists cover_library_brief_preset_idx
  on cover_library(brief_preset_id);

comment on column cover_library.brief_preset_id is
  'FK pro brief_preset que originou a capa. NULL = capa antiga, manual, ou '
  'preset deletado. Usado pra exibir o nome ao vivo no CapaModal (rename propaga).';

comment on column cover_library.brief_preset_name is
  'Snapshot do nome do preset no momento da geracao. Fallback exibido quando '
  'o preset foi deletado (brief_preset_id virou NULL).';
