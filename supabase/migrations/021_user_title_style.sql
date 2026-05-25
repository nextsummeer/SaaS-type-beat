-- T4.34: estilo do titulo escolhido pelo produtor.
--
-- Dois padroes circulam na comunidade type beat:
--   'default'   -> [FREE] Slayr x Nettspend type beat "GHOST LOAD"
--   'lowercase' -> [free] untiljapan + nosaint type beat - "eye to eye"
--
-- Coluna NOT NULL com default 'default' pra cobrir todos os produtores
-- existentes sem precisar de backfill. CHECK garante que so esses dois
-- valores entrem (extensivel via ALTER TABLE no futuro se virar enum aberto).
-- O worker generate.py le este campo antes de chamar o Claude.

alter table user_profiles
  add column if not exists title_style text not null default 'default'
  check (title_style in ('default', 'lowercase'));

comment on column user_profiles.title_style is
  'Estilo de formatacao do titulo gerado pela IA. '
  '''default'' = [FREE] A x B type beat "NAME" (caps tradicionais). '
  '''lowercase'' = [free] a + b type beat - "name" (estetica gen z). '
  'Configurado pelo produtor em /configuracoes.';
