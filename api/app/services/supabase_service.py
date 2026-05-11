import os
from supabase import create_client, Client


def get_admin_client() -> Client:
    """Cliente com service role — usa para validar tokens e operações admin."""
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def validate_token(access_token: str):
    """Valida o JWT do usuário e retorna o objeto user. Lança ValueError se inválido."""
    client = get_admin_client()
    response = client.auth.get_user(access_token)
    if not response or not response.user:
        raise ValueError("Token inválido")
    return response.user
