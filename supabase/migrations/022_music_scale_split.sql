-- T4.39 — Split do campo music_key em music_key (nota) + music_scale (modo)
-- pra entregar 3 campos independentes na UI (BPM | KEY | SCALE) e abrir
-- caminho pro essentia.js client-side substituir o librosa server-side.
--
-- Antes:  beats.music_key = "A minor"  (text concat)
-- Depois: beats.music_key = "A"  + beats.music_scale = "Minor"
--
-- Backfill: parse das strings legacy. Strings que nao baterem o pattern
-- ficam com music_scale = NULL (worker analyze.py recalcula no proximo
-- acesso se necessario).

-- 1) Adiciona coluna music_scale
ALTER TABLE beats
  ADD COLUMN IF NOT EXISTS music_scale text;

-- 2) Backfill: pega o sufixo "major"/"minor" do music_key atual.
-- Considera capitalize -- "A minor", "a Minor", "A Minor", "C MAJOR", "C# major", etc.
UPDATE beats
SET music_scale = CASE
  WHEN music_key ILIKE '% minor' THEN 'Minor'
  WHEN music_key ILIKE '% major' THEN 'Major'
  ELSE NULL
END
WHERE music_scale IS NULL
  AND music_key IS NOT NULL
  AND music_key <> '';

-- 3) Normaliza music_key removendo " minor" / " major" do sufixo (lowercase/uppercase agnostic).
UPDATE beats
SET music_key = regexp_replace(music_key, '\s+(minor|major|Minor|Major|MINOR|MAJOR)\s*$', '', 'i')
WHERE music_key IS NOT NULL
  AND music_key ILIKE ANY (ARRAY['% minor', '% major']);

-- 4) Trim do music_key final pra eliminar espacos sobrando
UPDATE beats
SET music_key = TRIM(music_key)
WHERE music_key IS NOT NULL;

-- 5) Check opcional (nao obriga -- legacy pode ter valores estranhos):
--    music_scale aceita Major/Minor/NULL apenas (case-sensitive).
ALTER TABLE beats
  DROP CONSTRAINT IF EXISTS beats_music_scale_check;
ALTER TABLE beats
  ADD CONSTRAINT beats_music_scale_check
  CHECK (music_scale IS NULL OR music_scale IN ('Major', 'Minor'));

COMMENT ON COLUMN beats.music_key IS 'Nota musical (C, C#, D, ... B). T4.39 -- separado de music_scale.';
COMMENT ON COLUMN beats.music_scale IS 'Modo (Major ou Minor). T4.39 -- separado de music_key.';
