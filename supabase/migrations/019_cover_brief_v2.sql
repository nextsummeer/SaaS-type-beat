-- T4.22: Migration brief v2 (DNA da capa IA).
-- ADR 2026-05-21-prompt-dna-capa-v2.md
--
-- Migra brief de 5 campos antigos (sujeito + ambiente + iluminacao + energia
-- + artista_nome) pros 6+2 campos novos (genero_primario + opcional secundario
-- + artista_primario + opcional secundario + quem_aparece + mood + cenario
-- + atmosfera_luz). Brief existe APENAS dentro de JSONB nos 3 lugares:
--   1. cover_library.brief_used
--   2. user_profiles.default_brief
--   3. brief_presets.brief
-- Migration usa funcao PL/pgSQL temporaria pra fazer a conversao atomicamente.
--
-- IMPORTANTE:
-- - Default genero_primario='trap' pra briefs antigos sem genero (Gustavo
--   validou trap como base). Editavel depois pelo produtor no wizard.
-- - so_objeto antigo vira sem_pessoa (objeto e o assunto, sem pessoa em frame).
-- - vermelho e azul_neon antigos viram 'luz_colorida' (o tom especifico fica
--   pro sorteio de variation_seeds em runtime).
-- - Funcao e DROPADA no fim -- usada uma vez so.


-- ============================================================================
-- 1. Schema: adiciona variation_seeds em cover_library
-- ============================================================================
-- Os 7 eixos sorteados pelo variation.py persistem aqui (JSONB) pra debug
-- e analytics futuras ("regerar com mesma seed", "quais combos rendem capas
-- mais aprovadas", etc).

alter table cover_library add column if not exists variation_seeds jsonb;

create index if not exists cover_library_variation_seeds_idx
  on cover_library using gin (variation_seeds);


-- ============================================================================
-- 2. Funcao temporaria de migracao brief v1 -> v2
-- ============================================================================

create or replace function migrate_brief_v1_to_v2(brief_v1 jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_sujeito text;
  v_ambiente text;
  v_iluminacao text;
  v_energia text;
  v_artista text;
  v_nota text;
  v_quem text;
  v_cenario text;
  v_luz text;
  v_mood text;
begin
  if brief_v1 is null then
    return null;
  end if;

  -- Se ja tem 'genero_primario', e v2 -- nao mexer (idempotencia)
  if brief_v1 ? 'genero_primario' then
    return brief_v1;
  end if;

  -- Extrai keys v1
  v_sujeito := brief_v1 ->> 'sujeito';
  v_ambiente := brief_v1 ->> 'ambiente';
  v_iluminacao := brief_v1 ->> 'iluminacao';
  v_energia := brief_v1 ->> 'energia';
  v_artista := brief_v1 ->> 'artista_nome';
  v_nota := brief_v1 ->> 'nota_livre';

  -- Mapeia sujeito -> quem_aparece
  v_quem := case v_sujeito
    when 'jovem'      then 'homem_solo'
    when 'mulher'     then 'mulher_solo'
    when 'grupo'      then 'grupo'
    when 'sem_pessoa' then 'sem_pessoa'
    when 'so_objeto'  then 'sem_pessoa'
    else 'homem_solo'
  end;

  -- Mapeia ambiente -> cenario
  v_cenario := case v_ambiente
    when 'rua_hood'      then 'rua_americana'
    when 'interior_luxo' then 'interior_luxo'
    when 'noturno'       then 'paisagem_urbana'
    when 'natureza'      then 'paisagem_aberta'
    when 'neon'          then 'festa_underground'
    when 'minimalista'   then 'closeup_objeto'
    else 'rua_americana'
  end;

  -- Mapeia iluminacao -> atmosfera_luz
  v_luz := case v_iluminacao
    when 'sol_duro'    then 'sol_duro_dia'
    when 'golden_hour' then 'golden_hour'
    when 'vermelho'    then 'luz_colorida'
    when 'azul_neon'   then 'luz_colorida'
    when 'noturno'     then 'noite_natural'
    when 'vintage'     then 'meia_luz'
    else 'golden_hour'
  end;

  -- Mapeia energia -> mood
  v_mood := case v_energia
    when 'agressivo'    then 'dark'
    when 'melancolico'  then 'sad'
    when 'sexy'         then 'sexy'
    when 'hood_famous'  then 'flexin'
    when 'atmosferico'  then 'chill'
    when 'festa'        then 'party'
    else 'flexin'
  end;

  -- Constroi v2
  return jsonb_build_object(
    'genero_primario',    'trap',
    'genero_secundario',  null,
    'artista_primario',   coalesce(v_artista, 'Lil Baby'),
    'artista_secundario', null,
    'quem_aparece',       v_quem,
    'mood',               v_mood,
    'cenario',            v_cenario,
    'atmosfera_luz',      v_luz,
    'nota_livre',         v_nota
  );
end;
$$;


-- ============================================================================
-- 3. Aplica migracao nos 3 lugares
-- ============================================================================

-- 3.1 cover_library.brief_used (uma row por capa gerada/upada)
update cover_library
set brief_used = migrate_brief_v1_to_v2(brief_used)
where brief_used is not null
  and not (brief_used ? 'genero_primario');

-- 3.2 user_profiles.default_brief (1 brief padrao por user -- legado pre-presets)
update user_profiles
set default_brief = migrate_brief_v1_to_v2(default_brief)
where default_brief is not null
  and not (default_brief ? 'genero_primario');

-- 3.3 brief_presets.brief (presets nomeados, varios por user)
update brief_presets
set brief = migrate_brief_v1_to_v2(brief)
where brief is not null
  and not (brief ? 'genero_primario');


-- ============================================================================
-- 4. Limpeza: drop da funcao (usada uma vez so)
-- ============================================================================

drop function if exists migrate_brief_v1_to_v2(jsonb);


-- ============================================================================
-- 5. Comentarios pra documentacao
-- ============================================================================

comment on column cover_library.variation_seeds is
  'Os 7 eixos sorteados pelo variation.py (subject_framing, camera_angle, '
  'time_of_day, sub_location, secondary_prop, motion_state, film_quirk) + '
  '3 resolvidos de aleatorio (resolved_quem, resolved_cenario, resolved_luz). '
  'ADR 2026-05-21-prompt-dna-capa-v2.md secao 5/6.';
