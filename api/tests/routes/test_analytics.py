"""
Testes do endpoint /analytics/overview.

Mocka o service youtube_analytics + validate_token. Não chama
API do YouTube nem Supabase de verdade.

T7.3 do _tasks-fase2-analytics.md.
"""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

# Importa só o router (evita puxar workers que precisam de Pillow/ffmpeg)
from app.routes.analytics import router as analytics_router

app = FastAPI()
app.include_router(analytics_router)
client = TestClient(app)

USER_ID = "11111111-1111-1111-1111-111111111111"
TOKEN = "fake-jwt"


def _overview_payload(views: int, subs: int, retencao: float) -> dict:
    """Helper: payload no formato da YouTube Analytics API."""
    return {
        "columnHeaders": [
            {"name": "views"},
            {"name": "subscribersGained"},
            {"name": "averageViewPercentage"},
        ],
        "rows": [[views, subs, retencao]],
    }


def _user():
    return SimpleNamespace(id=USER_ID)


# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────

def test_overview_sem_authorization_header_da_422():
    """FastAPI valida Header(...) obrigatório."""
    resp = client.get("/analytics/overview")
    assert resp.status_code == 422


def test_overview_sem_bearer_prefix_da_401():
    resp = client.get("/analytics/overview", headers={"Authorization": "Token xyz"})
    assert resp.status_code == 401


def test_overview_com_jwt_invalido_da_401():
    with patch("app.routes.analytics.validate_token", side_effect=Exception("invalido")):
        resp = client.get(
            "/analytics/overview", headers={"Authorization": f"Bearer {TOKEN}"}
        )
    assert resp.status_code == 401


# ──────────────────────────────────────────────
# Validação de period
# ──────────────────────────────────────────────

def test_overview_period_invalido_da_400():
    with patch("app.routes.analytics.validate_token", return_value=_user()):
        resp = client.get(
            "/analytics/overview?period=99d",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
    assert resp.status_code == 400
    assert "period" in resp.json()["detail"]


# ──────────────────────────────────────────────
# Caminho feliz
# ──────────────────────────────────────────────

def test_overview_caminho_feliz_retorna_kpis_com_delta():
    atual = _overview_payload(views=187, subs=3, retencao=47.5)
    anterior = _overview_payload(views=142, subs=1, retencao=42.1)

    def get_overview_mock(uid, period, anterior=False):
        return anterior if anterior else atual

    with patch("app.routes.analytics.validate_token", return_value=_user()), patch(
        "app.routes.analytics.youtube_analytics.get_overview",
        side_effect=lambda uid, p, anterior=False: (anterior_payload := _overview_payload(142, 1, 42.1)) if anterior else _overview_payload(187, 3, 47.5),
    ):
        resp = client.get(
            "/analytics/overview?period=7d",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["period"] == "7d"

    assert body["views"]["value"] == 187
    assert body["views"]["previous"] == 142
    assert body["views"]["delta_pct"] == 31.7  # (187-142)/142 = 0.317

    assert body["subscribers_gained"]["value"] == 3
    assert body["subscribers_gained"]["previous"] == 1
    assert body["subscribers_gained"]["delta_pct"] == 200.0  # (3-1)/1 = 2.0

    assert body["retention"]["value"] == 47.5
    assert body["retention"]["previous"] == 42.1
    assert body["retention"]["delta_pct"] == 12.8


def test_overview_canal_sem_atividade_retorna_zeros():
    """Canal sem views no período → rows vazio → tudo zero, sem erro."""
    vazio = {"columnHeaders": [], "rows": []}

    with patch("app.routes.analytics.validate_token", return_value=_user()), patch(
        "app.routes.analytics.youtube_analytics.get_overview",
        return_value=vazio,
    ):
        resp = client.get(
            "/analytics/overview",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["views"]["value"] == 0
    assert body["views"]["previous"] == 0
    assert body["views"]["delta_pct"] == 0


# ──────────────────────────────────────────────
# Erros propagados do service
# ──────────────────────────────────────────────

def test_overview_user_sem_canal_conectado_da_409():
    with patch("app.routes.analytics.validate_token", return_value=_user()), patch(
        "app.routes.analytics.youtube_analytics.get_overview",
        side_effect=ValueError("User sem canal"),
    ):
        resp = client.get(
            "/analytics/overview",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
    assert resp.status_code == 409


def test_overview_google_rejeitou_da_502():
    with patch("app.routes.analytics.validate_token", return_value=_user()), patch(
        "app.routes.analytics.youtube_analytics.get_overview",
        side_effect=RuntimeError("Google rejeitou: 403"),
    ):
        resp = client.get(
            "/analytics/overview",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
    assert resp.status_code == 502


# ──────────────────────────────────────────────
# /top-beats
# ──────────────────────────────────────────────

def _top_beats_payload():
    """Payload sintético da YouTube Analytics API com dimensão video."""
    return {
        "columnHeaders": [
            {"name": "video"},
            {"name": "views"},
            {"name": "averageViewPercentage"},
        ],
        "rows": [
            ["abc111", 1243, 52.0],
            ["def222", 687, 44.0],
            ["ghi333", 405, 38.5],
        ],
    }


def test_top_beats_sem_auth_da_401():
    resp = client.get("/analytics/top-beats", headers={"Authorization": "Token x"})
    assert resp.status_code == 401


def test_top_beats_caminho_feliz_com_join_de_beats():
    """Endpoint retorna views por vídeo + dados do beat correspondente."""
    fake_supabase = MagicMock()
    fake_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = [
        {
            "youtube_video_id": "abc111",
            "beats": {"id": "uuid-1", "titulo": "Travis Type Beat", "artista_nome": "Travis", "cover_path": "x/y.jpg"},
        }
    ]

    with patch("app.routes.analytics.validate_token", return_value=_user()), patch(
        "app.routes.analytics.youtube_analytics.get_top_beats",
        return_value=_top_beats_payload(),
    ), patch(
        "app.services.supabase_service.get_admin_client",
        return_value=fake_supabase,
    ):
        resp = client.get(
            "/analytics/top-beats?period=7d&limit=5",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["period"] == "7d"
    assert len(body["items"]) == 3
    assert body["items"][0]["video_id"] == "abc111"
    assert body["items"][0]["views"] == 1243
    assert body["items"][0]["retention_pct"] == 52.0
    # abc111 tem beat correspondente
    assert body["items"][0]["beat"]["titulo"] == "Travis Type Beat"
    # def222 e ghi333 não estão no banco → beat=None
    assert body["items"][1]["beat"] is None


def test_top_beats_canal_sem_videos_retorna_lista_vazia():
    """Canal sem videos publicados → rows: [] → items: []."""
    with patch("app.routes.analytics.validate_token", return_value=_user()), patch(
        "app.routes.analytics.youtube_analytics.get_top_beats",
        return_value={"columnHeaders": [], "rows": []},
    ):
        resp = client.get(
            "/analytics/top-beats",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )

    assert resp.status_code == 200
    assert resp.json()["items"] == []


def test_top_beats_period_invalido_da_400():
    with patch("app.routes.analytics.validate_token", return_value=_user()):
        resp = client.get(
            "/analytics/top-beats?period=invalido",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
    assert resp.status_code == 400
