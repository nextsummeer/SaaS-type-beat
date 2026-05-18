"""
Testes do `youtube_service.get_realtime_stats`.

Cobre o pattern de cache (hit/miss/force_refresh), parsing da resposta da
Data API (videos.list?part=statistics,snippet,status), deteccao de video
deletado e tracking via usage_tracker.

T7.12 do _tasks-fase2-analytics.md.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.services import youtube_service


USER_ID = "11111111-1111-1111-1111-111111111111"


def _videos_list_response(items: list[dict]) -> dict:
    """Resposta sintetica da YouTube Data API (videos.list)."""
    return {"kind": "youtube#videoListResponse", "items": items}


def _video_item(
    video_id: str,
    views: int = 100,
    likes: int = 5,
    comments: int = 1,
    published_at: str = "2026-05-18T15:00:00Z",
    title: str = "Type Beat Test",
    privacy: str = "public",
    duration: str = "PT2M36S",
) -> dict:
    return {
        "id": video_id,
        "statistics": {
            "viewCount": str(views),
            "likeCount": str(likes),
            "commentCount": str(comments),
        },
        "snippet": {"publishedAt": published_at, "title": title},
        "status": {"privacyStatus": privacy},
        "contentDetails": {"duration": duration},
    }


def _mock_supabase_cache_hit(payload: dict, expires_em_minutos: float = 3.0):
    """Supabase mock que retorna cache valido."""
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=expires_em_minutos)).isoformat()
    mock = MagicMock()
    chain = (
        mock.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .limit.return_value
        .execute.return_value
    )
    chain.data = [{"payload": payload, "expires_at": expires_at}]
    return mock


def _mock_supabase_cache_miss():
    mock = MagicMock()
    chain = (
        mock.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .limit.return_value
        .execute.return_value
    )
    chain.data = []
    return mock


def _mock_youtube_client(items: list[dict]) -> MagicMock:
    """Mock do client youtube com videos().list().execute() retornando items."""
    mock = MagicMock()
    mock.videos.return_value.list.return_value.execute.return_value = _videos_list_response(items)
    return mock


# ──────────────────────────────────────────────
# Parse de duration ISO 8601
# ──────────────────────────────────────────────

def test_parse_duration_minutos_e_segundos():
    """PT2M36S = 2 minutos e 36 segundos = 156s."""
    assert youtube_service._parse_iso8601_duration("PT2M36S") == 156


def test_parse_duration_so_segundos():
    """PT45S = 45s."""
    assert youtube_service._parse_iso8601_duration("PT45S") == 45


def test_parse_duration_com_horas():
    """PT1H5M30S = 1*3600 + 5*60 + 30 = 3930s."""
    assert youtube_service._parse_iso8601_duration("PT1H5M30S") == 3930


def test_parse_duration_so_minutos():
    """PT5M = 300s."""
    assert youtube_service._parse_iso8601_duration("PT5M") == 300


def test_parse_duration_invalido_retorna_zero():
    """Input vazio / invalido retorna 0 (graceful degradation)."""
    assert youtube_service._parse_iso8601_duration(None) == 0
    assert youtube_service._parse_iso8601_duration("") == 0
    assert youtube_service._parse_iso8601_duration("garbage") == 0


# ──────────────────────────────────────────────
# Lista vazia
# ──────────────────────────────────────────────

def test_video_ids_vazio_retorna_dict_vazio_sem_chamar_api():
    """Sem video_ids: skip total, nao chama Supabase nem YouTube."""
    with patch("app.services.youtube_service.get_admin_client") as mock_supabase, \
         patch("app.services.youtube_service.build") as mock_build:
        stats, was_fresh = youtube_service.get_realtime_stats(USER_ID, [])
    assert stats == {}
    assert was_fresh is False
    mock_supabase.assert_not_called()
    mock_build.assert_not_called()


# ──────────────────────────────────────────────
# Cache
# ──────────────────────────────────────────────

def test_cache_hit_nao_chama_youtube_api():
    """Quando cache valido existe, NAO bate na API do YouTube. was_fresh=False."""
    cached_payload = {
        "abc123": {
            "view_count": 50, "like_count": 2, "comment_count": 1,
            "published_at": "2026-05-17T10:00:00Z", "title": "Beat A", "privacy_status": "public",
        }
    }
    with patch("app.services.youtube_service.get_admin_client", return_value=_mock_supabase_cache_hit(cached_payload)), \
         patch("app.services.youtube_service.build") as mock_build, \
         patch("app.services.youtube_service._load_account") as mock_load:
        stats, was_fresh = youtube_service.get_realtime_stats(USER_ID, ["abc123"])

    assert stats == cached_payload
    assert was_fresh is False
    mock_build.assert_not_called()
    mock_load.assert_not_called()


def test_cache_hit_filtra_apenas_video_ids_pedidos():
    """Cache pode ter videos antigos; retorno deve filtrar so os pedidos."""
    cached_payload = {
        "abc123": {"view_count": 50, "like_count": 2, "comment_count": 1, "published_at": None, "title": "A", "privacy_status": "public"},
        "xyz789": {"view_count": 10, "like_count": 0, "comment_count": 0, "published_at": None, "title": "B", "privacy_status": "public"},
    }
    with patch("app.services.youtube_service.get_admin_client", return_value=_mock_supabase_cache_hit(cached_payload)):
        stats, was_fresh = youtube_service.get_realtime_stats(USER_ID, ["abc123"])

    assert "abc123" in stats
    assert "xyz789" not in stats
    assert was_fresh is False


def test_cache_miss_chama_youtube_api_e_popula_cache():
    """Cache miss: chama API + salva no cache + retorna dict parseado. was_fresh=True."""
    mock_supabase = _mock_supabase_cache_miss()
    yt_client = _mock_youtube_client([_video_item("abc123", views=200, likes=10, comments=3)])

    with patch("app.services.youtube_service.get_admin_client", return_value=mock_supabase), \
         patch("app.services.youtube_service.build", return_value=yt_client), \
         patch("app.services.youtube_service._load_account") as mock_load, \
         patch("app.services.youtube_service._build_credentials") as mock_creds, \
         patch("app.services.youtube_service.usage_tracker") as mock_tracker:
        mock_load.return_value = {"account_id": "x", "scopes": []}
        mock_creds.return_value.valid = True

        stats, was_fresh = youtube_service.get_realtime_stats(USER_ID, ["abc123"])

    assert stats["abc123"]["view_count"] == 200
    assert stats["abc123"]["like_count"] == 10
    assert stats["abc123"]["comment_count"] == 3
    assert stats["abc123"]["privacy_status"] == "public"
    assert was_fresh is True
    # API foi chamada exatamente 1x
    yt_client.videos.return_value.list.assert_called_once()
    # usage_tracker registrou 1 chunk
    mock_tracker.track.assert_called_once()
    # Cache foi populado (upsert chamado)
    mock_supabase.table.return_value.upsert.assert_called()


def test_force_refresh_ignora_cache_valido():
    """force_refresh=True bate na API mesmo com cache valido (botao RELOAD). was_fresh=True."""
    cached_payload = {"abc123": {"view_count": 1, "like_count": 0, "comment_count": 0, "published_at": None, "title": "old", "privacy_status": "public"}}
    yt_client = _mock_youtube_client([_video_item("abc123", views=999, likes=99, comments=9)])

    with patch("app.services.youtube_service.get_admin_client", return_value=_mock_supabase_cache_hit(cached_payload)), \
         patch("app.services.youtube_service.build", return_value=yt_client), \
         patch("app.services.youtube_service._load_account") as mock_load, \
         patch("app.services.youtube_service._build_credentials") as mock_creds, \
         patch("app.services.youtube_service.usage_tracker"):
        mock_load.return_value = {"account_id": "x", "scopes": []}
        mock_creds.return_value.valid = True

        stats, was_fresh = youtube_service.get_realtime_stats(USER_ID, ["abc123"], force_refresh=True)

    # Dados frescos da API, NAO do cache
    assert stats["abc123"]["view_count"] == 999
    assert was_fresh is True
    yt_client.videos.return_value.list.assert_called_once()


# ──────────────────────────────────────────────
# Parsing
# ──────────────────────────────────────────────

def test_video_deletado_nao_aparece_no_dict():
    """Se video sumiu da resposta (deletado/removido), nao entra no resultado.
    was_fresh=True permite ao endpoint persistir youtube_deleted_at."""
    # Pedimos 2 IDs, API retorna so 1
    yt_client = _mock_youtube_client([_video_item("vivo123", views=100)])

    with patch("app.services.youtube_service.get_admin_client", return_value=_mock_supabase_cache_miss()), \
         patch("app.services.youtube_service.build", return_value=yt_client), \
         patch("app.services.youtube_service._load_account") as mock_load, \
         patch("app.services.youtube_service._build_credentials") as mock_creds, \
         patch("app.services.youtube_service.usage_tracker"):
        mock_load.return_value = {"account_id": "x", "scopes": []}
        mock_creds.return_value.valid = True

        stats, was_fresh = youtube_service.get_realtime_stats(USER_ID, ["vivo123", "deletado456"])

    assert "vivo123" in stats
    assert "deletado456" not in stats
    # was_fresh=True sinaliza pro caller que a ausencia e signal certeiro de deletado
    assert was_fresh is True


def test_parse_converte_strings_em_int():
    """A API retorna strings (`viewCount: "1234"`); precisamos converter pra int."""
    yt_client = _mock_youtube_client([_video_item("abc", views=1234, likes=56, comments=7)])

    with patch("app.services.youtube_service.get_admin_client", return_value=_mock_supabase_cache_miss()), \
         patch("app.services.youtube_service.build", return_value=yt_client), \
         patch("app.services.youtube_service._load_account") as mock_load, \
         patch("app.services.youtube_service._build_credentials") as mock_creds, \
         patch("app.services.youtube_service.usage_tracker"):
        mock_load.return_value = {"account_id": "x", "scopes": []}
        mock_creds.return_value.valid = True

        stats, _ = youtube_service.get_realtime_stats(USER_ID, ["abc"])

    assert stats["abc"]["view_count"] == 1234
    assert isinstance(stats["abc"]["view_count"], int)


def test_stats_ausentes_viram_zero():
    """Videos novos podem nao ter likeCount/commentCount. Default = 0."""
    item_sem_stats = {
        "id": "novo123",
        "statistics": {"viewCount": "5"},  # so views
        "snippet": {"publishedAt": "2026-05-18T15:00:00Z", "title": "Beat Novo"},
        "status": {"privacyStatus": "public"},
    }
    yt_client = _mock_youtube_client([item_sem_stats])

    with patch("app.services.youtube_service.get_admin_client", return_value=_mock_supabase_cache_miss()), \
         patch("app.services.youtube_service.build", return_value=yt_client), \
         patch("app.services.youtube_service._load_account") as mock_load, \
         patch("app.services.youtube_service._build_credentials") as mock_creds, \
         patch("app.services.youtube_service.usage_tracker"):
        mock_load.return_value = {"account_id": "x", "scopes": []}
        mock_creds.return_value.valid = True

        stats, _ = youtube_service.get_realtime_stats(USER_ID, ["novo123"])

    assert stats["novo123"]["view_count"] == 5
    assert stats["novo123"]["like_count"] == 0
    assert stats["novo123"]["comment_count"] == 0


# ──────────────────────────────────────────────
# Quota tracking
# ──────────────────────────────────────────────

def test_tracking_registra_quota_units_por_chunk():
    """Cada chunk de ate 50 IDs = 1 unit registrado via usage_tracker.track."""
    # 1 chunk com 2 videos
    yt_client = _mock_youtube_client([_video_item("a"), _video_item("b")])

    with patch("app.services.youtube_service.get_admin_client", return_value=_mock_supabase_cache_miss()), \
         patch("app.services.youtube_service.build", return_value=yt_client), \
         patch("app.services.youtube_service._load_account") as mock_load, \
         patch("app.services.youtube_service._build_credentials") as mock_creds, \
         patch("app.services.youtube_service.usage_tracker") as mock_tracker:
        mock_load.return_value = {"account_id": "x", "scopes": []}
        mock_creds.return_value.valid = True

        youtube_service.get_realtime_stats(USER_ID, ["a", "b"])

    mock_tracker.track.assert_called_once()
    call_kwargs = mock_tracker.track.call_args.kwargs
    assert call_kwargs["feature"] == "youtube_data_api"
    assert call_kwargs["metadata"]["quota_units"] == 1
    assert call_kwargs["metadata"]["video_count"] == 2
