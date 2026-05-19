"""Testes do endpoint PATCH /posts/{post_id}/reschedule.

Mocka validate_token, get_admin_client e update_scheduled_publish_at. Nao
chama YouTube nem Supabase de verdade.

T6.19 do _tasks-mvp.md.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes.posts import router as posts_router

app = FastAPI()
app.include_router(posts_router)
client = TestClient(app)

USER_ID = "11111111-1111-1111-1111-111111111111"
POST_ID = "22222222-2222-2222-2222-222222222222"
VIDEO_ID = "abc123XYZ"
TOKEN = "fake-jwt"


def _user():
    return SimpleNamespace(id=USER_ID)


def _future_iso(hours: int = 24) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


def _supabase_with_post(post_data: dict | None) -> MagicMock:
    """Retorna um mock do get_admin_client cujo .table().select()...maybe_single()
    devolve `post_data` (ou None pra simular 404).
    """
    mock_client = MagicMock()
    chain = mock_client.table.return_value
    chain.select.return_value.eq.return_value.eq.return_value.maybe_single.return_value.execute.return_value = (
        SimpleNamespace(data=post_data)
    )
    chain.update.return_value.eq.return_value.execute.return_value = SimpleNamespace(data=None)
    return mock_client


# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────

def test_reschedule_sem_authorization_da_422():
    resp = client.patch(f"/posts/{POST_ID}/reschedule", json={"scheduled_at": _future_iso()})
    assert resp.status_code == 422


def test_reschedule_sem_bearer_prefix_da_401():
    resp = client.patch(
        f"/posts/{POST_ID}/reschedule",
        json={"scheduled_at": _future_iso()},
        headers={"Authorization": "Token xyz"},
    )
    assert resp.status_code == 401


def test_reschedule_jwt_invalido_da_401():
    with patch("app.routes.posts.validate_token", side_effect=Exception("nope")):
        resp = client.patch(
            f"/posts/{POST_ID}/reschedule",
            json={"scheduled_at": _future_iso()},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
    assert resp.status_code == 401


# ──────────────────────────────────────────────
# Validação de data
# ──────────────────────────────────────────────

def test_reschedule_data_em_formato_invalido_da_400():
    with patch("app.routes.posts.validate_token", return_value=_user()):
        resp = client.patch(
            f"/posts/{POST_ID}/reschedule",
            json={"scheduled_at": "amanha de manha"},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
    assert resp.status_code == 400
    assert "ISO" in resp.json()["detail"]


def test_reschedule_data_no_passado_da_422():
    passado = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    with patch("app.routes.posts.validate_token", return_value=_user()):
        resp = client.patch(
            f"/posts/{POST_ID}/reschedule",
            json={"scheduled_at": passado},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
    assert resp.status_code == 422
    assert "futuro" in resp.json()["detail"].lower()


# ──────────────────────────────────────────────
# Estado do post
# ──────────────────────────────────────────────

def test_reschedule_post_de_outro_user_da_404():
    """O .eq('user_id', str(user.id)) faz o select retornar None."""
    mock_sb = _supabase_with_post(None)
    with patch("app.routes.posts.validate_token", return_value=_user()), patch(
        "app.routes.posts.get_admin_client", return_value=mock_sb
    ):
        resp = client.patch(
            f"/posts/{POST_ID}/reschedule",
            json={"scheduled_at": _future_iso()},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
    assert resp.status_code == 404


def test_reschedule_post_ja_no_youtube_da_409():
    """Beat com youtube_video_id setado (publicado de verdade ou apenas agendado
    com video private+publishAt) nao pode ser reagendado — videos.update exige
    scope 'youtube' full que ainda nao pedimos."""
    mock_sb = _supabase_with_post({
        "id": POST_ID,
        "user_id": USER_ID,
        "status": "scheduled",
        "scheduled_at": _future_iso(),
        "youtube_video_id": VIDEO_ID,
        "published_at": None,
    })
    with patch("app.routes.posts.validate_token", return_value=_user()), patch(
        "app.routes.posts.get_admin_client", return_value=mock_sb
    ):
        resp = client.patch(
            f"/posts/{POST_ID}/reschedule",
            json={"scheduled_at": _future_iso(72)},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
    assert resp.status_code == 409
    assert "youtube" in resp.json()["detail"].lower()


def test_reschedule_post_em_publishing_da_409():
    mock_sb = _supabase_with_post({
        "id": POST_ID,
        "user_id": USER_ID,
        "status": "publishing",
        "scheduled_at": _future_iso(),
        "youtube_video_id": None,
        "published_at": None,
    })
    with patch("app.routes.posts.validate_token", return_value=_user()), patch(
        "app.routes.posts.get_admin_client", return_value=mock_sb
    ):
        resp = client.patch(
            f"/posts/{POST_ID}/reschedule",
            json={"scheduled_at": _future_iso()},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
    assert resp.status_code == 409


# ──────────────────────────────────────────────
# Caminho feliz
# ──────────────────────────────────────────────

def test_reschedule_sem_video_no_youtube_atualiza_so_db():
    """Post agendado mas worker ainda nao subiu pro YouTube — so update no DB."""
    mock_sb = _supabase_with_post({
        "id": POST_ID,
        "user_id": USER_ID,
        "status": "scheduled",
        "scheduled_at": _future_iso(24),
        "youtube_video_id": None,
        "published_at": None,
    })
    with patch("app.routes.posts.validate_token", return_value=_user()), patch(
        "app.routes.posts.get_admin_client", return_value=mock_sb
    ):
        resp = client.patch(
            f"/posts/{POST_ID}/reschedule",
            json={"scheduled_at": _future_iso(72)},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["ok"] is True
    assert body["synced_with_youtube"] is False
    mock_sb.table.return_value.update.assert_called_once()


def test_reschedule_publicado_efetivo_da_409():
    """status='published' tambem bloqueia (caso classico)."""
    mock_sb = _supabase_with_post({
        "id": POST_ID,
        "user_id": USER_ID,
        "status": "published",
        "scheduled_at": _future_iso(-48),
        "youtube_video_id": VIDEO_ID,
        "published_at": "2026-05-10T18:00:00Z",
    })
    with patch("app.routes.posts.validate_token", return_value=_user()), patch(
        "app.routes.posts.get_admin_client", return_value=mock_sb
    ):
        resp = client.patch(
            f"/posts/{POST_ID}/reschedule",
            json={"scheduled_at": _future_iso()},
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
    assert resp.status_code == 409
