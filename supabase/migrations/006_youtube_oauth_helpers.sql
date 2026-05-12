-- T5.1: helpers de upsert/desconectar canal YouTube com pgp_sym_encrypt do refresh_token
-- Funções SECURITY DEFINER pra que o service_role possa cifrar/decifrar sem ler a chave
-- a chave vai como parâmetro (vinda do env SUPABASE_VAULT_KEY no backend)

CREATE OR REPLACE FUNCTION upsert_youtube_account(
  p_user_id uuid,
  p_channel_id text,
  p_channel_title text,
  p_refresh_token text,
  p_access_token text,
  p_access_token_expires_at timestamptz,
  p_scopes text[],
  p_vault_key text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO youtube_accounts (
    user_id, channel_id, channel_title,
    refresh_token, access_token, access_token_expires_at, scopes
  )
  VALUES (
    p_user_id, p_channel_id, p_channel_title,
    pgp_sym_encrypt(p_refresh_token, p_vault_key),
    p_access_token, p_access_token_expires_at, p_scopes
  )
  ON CONFLICT (user_id, channel_id) DO UPDATE SET
    refresh_token = EXCLUDED.refresh_token,
    access_token = EXCLUDED.access_token,
    access_token_expires_at = EXCLUDED.access_token_expires_at,
    channel_title = EXCLUDED.channel_title,
    scopes = EXCLUDED.scopes,
    updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_youtube_refresh_token(
  p_user_id uuid,
  p_vault_key text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  SELECT pgp_sym_decrypt(refresh_token, p_vault_key)
  INTO v_token
  FROM youtube_accounts
  WHERE user_id = p_user_id
  LIMIT 1;
  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_youtube_account TO service_role;
GRANT EXECUTE ON FUNCTION get_youtube_refresh_token TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.youtube_accounts TO service_role;
