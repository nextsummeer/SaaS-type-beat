"""
Testes do service youtube_analytics.

Sem chamadas reais ao Supabase nem à API do YouTube — tudo mockado
pra rodar rápido e sem custo. Cobre o pattern de cache (hit/miss) +
registro em api_usage.

T7.2 do _tasks-fase2-analytics.md.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.services import youtube_analytics


USER_ID = "11111111-1111-1111-1111-111111111111"
ACCESS_TOKEN = "fake-access-token"
CHANNEL_ID = "UCfakechannel123"


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _payload_overview() -> dict:
    """Resposta sintética parecida com a da YouTube Analytics API."""
    return {
        "kind": "youtubeAnalytics#resultTable",
        "columnHeaders": [
            {"name": "views", "columnType": "METRIC", "dataType": "INTEGER"},
            {"name": "subscribersGained", "columnType": "METRIC", "dataType": "INTEGER"},
            {"name": "averageViewPercentage", "columnType": "METRIC", "dataType": "FLOAT"},
        ],
        "rows": [[1234, 12, 47.5]],
    }


def _mock_supabase_cache_hit(payload: dict, expires_em_horas: float = 12):
    """Cliente Supabase falso que devolve cache válido (expira no futuro)."""
    expires_at = (
        datetime.now(timezone.utc) + timedelta(hours=expires_em_horas)
    ).isoformat()
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
    """Cliente Supabase falso que devolve cache vazio (= miss)."""
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


# ──────────────────────────────────────────────
# Tests
# ──────────────────────────────────────────────

def test_periodo_para_datas_valida():
    """7d = 7 dias completos terminando ONTEM (start..end inclusivo, diff=6)."""
    from datetime import date, timedelta

    start, end = youtube_analytics._periodo_para_datas("7d")
    # End deve ser ontem (não hoje) pra evitar dia em processamento na API
    assert end == date.today() - timedelta(days=1)
    # 7 dias inclusivos = 6 dias de diferença
    assert (end - start).days == 6


def test_periodo_para_datas_anterior():
    """O período anterior fica imediatamente antes do atual, sem sobreposição."""
    start_atual, end_atual = youtube_analytics._periodo_para_datas("7d")
    start_ant, end_ant = youtube_analytics._periodo_para_datas("7d", anterior=True)
    # End anterior = 1 dia antes do start atual (sem sobreposição)
    from datetime import timedelta
    assert end_ant == start_atual - timedelta(days=1)
    assert (end_ant - start_ant).days == 6


def test_periodo_para_datas_invalido():
    with pytest.raises(ValueError):
        youtube_analytics._periodo_para_datas("99d")


def test_get_overview_cache_hit_nao_chama_api():
    """Se cache válido existe, NÃO deve chamar API do YouTube."""
    cached = _payload_overview()

    with patch.object(
        youtube_analytics, "get_admin_client", return_value=_mock_supabase_cache_hit(cached)
    ), patch.object(
        youtube_analytics.youtube_oauth, "get_access_token"
    ) as mock_get_token, patch.object(
        youtube_analytics, "_reports_query"
    ) as mock_reports:
        result = youtube_analytics.get_overview(USER_ID, "7d")

    assert result == cached
    mock_get_token.assert_not_called()
    mock_reports.assert_not_called()


def test_get_overview_cache_miss_chama_api_e_persiste():
    """Cache miss → chama API, salva no banco, registra em api_usage."""
    fresh_payload = _payload_overview()
    miss_client = _mock_supabase_cache_miss()

    with patch.object(
        youtube_analytics, "get_admin_client", return_value=miss_client
    ), patch.object(
        youtube_analytics.youtube_oauth, "get_access_token", return_value=ACCESS_TOKEN
    ) as mock_get_token, patch.object(
        youtube_analytics, "_get_channel_id", return_value=CHANNEL_ID
    ) as mock_get_channel, patch.object(
        youtube_analytics, "_reports_query", return_value=fresh_payload
    ) as mock_reports:
        result = youtube_analytics.get_overview(USER_ID, "30d")

    assert result == fresh_payload
    mock_get_token.assert_called_once_with(USER_ID)
    mock_get_channel.assert_called_once_with(USER_ID)
    # _reports_query foi chamado com channel_id explicito
    assert mock_reports.call_args.args[1] == CHANNEL_ID

    tables_called = [c.args[0] for c in miss_client.table.call_args_list]
    assert "analytics_cache" in tables_called
    assert "api_usage" in tables_called


def test_get_top_beats_valida_limite():
    with pytest.raises(ValueError):
        youtube_analytics.get_top_beats(USER_ID, "7d", limite=0)
    with pytest.raises(ValueError):
        youtube_analytics.get_top_beats(USER_ID, "7d", limite=50)


def test_get_views_timeline_usa_month_para_90d():
    """Em 90d, agregamos por mês pra não retornar 90 pontos."""
    captured: dict = {}

    def fake_reports(access_token, channel_id, params):
        captured["params"] = params
        captured["channel_id"] = channel_id
        return {"rows": []}

    with patch.object(
        youtube_analytics, "get_admin_client", return_value=_mock_supabase_cache_miss()
    ), patch.object(
        youtube_analytics.youtube_oauth, "get_access_token", return_value=ACCESS_TOKEN
    ), patch.object(
        youtube_analytics, "_get_channel_id", return_value=CHANNEL_ID
    ), patch.object(
        youtube_analytics, "_reports_query", side_effect=fake_reports
    ):
        youtube_analytics.get_views_timeline(USER_ID, "90d")

    assert captured["params"]["dimensions"] == "month"
    assert captured["channel_id"] == CHANNEL_ID


def test_get_views_timeline_usa_day_para_periodos_curtos():
    captured: dict = {}

    def fake_reports(access_token, channel_id, params):
        captured["params"] = params
        return {"rows": []}

    with patch.object(
        youtube_analytics, "get_admin_client", return_value=_mock_supabase_cache_miss()
    ), patch.object(
        youtube_analytics.youtube_oauth, "get_access_token", return_value=ACCESS_TOKEN
    ), patch.object(
        youtube_analytics, "_get_channel_id", return_value=CHANNEL_ID
    ), patch.object(
        youtube_analytics, "_reports_query", side_effect=fake_reports
    ):
        youtube_analytics.get_views_timeline(USER_ID, "7d")

    assert captured["params"]["dimensions"] == "day"


def test_cache_expirado_e_tratado_como_miss():
    """Cache com expires_at no passado deve ser ignorado."""
    expirado = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    mock = MagicMock()
    chain = (
        mock.table.return_value
        .select.return_value
        .eq.return_value
        .eq.return_value
        .limit.return_value
        .execute.return_value
    )
    chain.data = [{"payload": {"old": True}, "expires_at": expirado}]

    fresh = {"new": True}
    with patch.object(
        youtube_analytics, "get_admin_client", return_value=mock
    ), patch.object(
        youtube_analytics.youtube_oauth, "get_access_token", return_value=ACCESS_TOKEN
    ), patch.object(
        youtube_analytics, "_get_channel_id", return_value=CHANNEL_ID
    ), patch.object(
        youtube_analytics, "_reports_query", return_value=fresh
    ):
        result = youtube_analytics.get_overview(USER_ID, "7d")

    assert result == fresh
