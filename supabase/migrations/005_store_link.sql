-- T2.13: Link da loja (BeatStars, Airbit, etc) por beat
-- Substitui o placeholder "[insira seu link de venda]" na descricao gerada
ALTER TABLE beats ADD COLUMN IF NOT EXISTS store_link text;

-- GRANT pra service_role (workers do backend)
GRANT SELECT, INSERT, UPDATE ON TABLE public.beats TO service_role;
