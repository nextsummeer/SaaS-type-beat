"""Testes do link capa <-> brief_preset no worker cover.py (T4.41).

Foco: a row pending criada em cover_library grava brief_preset_id +
brief_preset_name corretos, resolvendo o nome a partir do preset (com
checagem de dono).

Truque pra isolar: deixamos o builder estourar logo APOS o INSERT pending
(parse_brief lanca ValueError). Assim a geracao para no passo (b) sem
precisar mockar fal.ai/download/storage, e ainda conseguimos inspecionar
o payload do insert.
"""

from unittest.mock import MagicMock, patch

from app.workers.cover import generate_covers

USER_ID = "user-1111"
PRESET_ID = "preset-2222"
BRIEF = {
    "genero_primario": "underground_trap",
    "artista_primario": "Feng",
    "quem_aparece": "mulher_solo",
    "mood": "sad",
    "atmosfera_luz": "flash_duro",
}


def _make_client(preset_row):
    """Cliente Supabase falso com tabelas distintas por nome.

    Retorna (client, covers_tbl) -- covers_tbl serve pra inspecionar o
    payload passado pro insert de cover_library.
    """
    presets_tbl = MagicMock()
    (
        presets_tbl.select.return_value.eq.return_value
        .maybe_single.return_value.execute.return_value.data
    ) = preset_row

    profiles_tbl = MagicMock()
    (
        profiles_tbl.select.return_value.eq.return_value
        .maybe_single.return_value.execute.return_value.data
    ) = {"has_generated_first_cover": True}  # nao e a primeira capa

    covers_tbl = MagicMock()
    covers_tbl.insert.return_value.execute.return_value.data = [{"id": "cover-1"}]

    tables = {
        "brief_presets": presets_tbl,
        "user_profiles": profiles_tbl,
        "cover_library": covers_tbl,
    }

    client = MagicMock()
    client.table.side_effect = lambda name: tables[name]
    return client, covers_tbl


def _insert_payload(covers_tbl) -> dict:
    """Extrai o dict passado pro insert de cover_library."""
    assert covers_tbl.insert.called, "insert em cover_library nao foi chamado"
    return covers_tbl.insert.call_args.args[0]


def _run(client, brief_preset_id):
    """Roda generate_covers com builder estourando logo apos o insert pending."""
    with (
        patch("app.workers.cover.get_admin_client", return_value=client),
        patch(
            "app.workers.cover.credits_service.get_remaining",
            return_value={"remaining": 10},
        ),
        patch(
            "app.workers.cover.parse_brief",
            side_effect=ValueError("parada proposital pos-insert"),
        ),
    ):
        return generate_covers(
            user_id=USER_ID,
            brief=BRIEF,
            lote=1,
            brief_preset_id=brief_preset_id,
        )


def test_link_grava_id_e_nome_do_preset_do_dono():
    """Preset existe e e do mesmo user -> capa linka id + nome resolvido."""
    client, covers_tbl = _make_client(
        preset_row={"name": "Meu brief sad", "user_id": USER_ID}
    )

    _run(client, PRESET_ID)

    payload = _insert_payload(covers_tbl)
    assert payload["brief_preset_id"] == PRESET_ID
    assert payload["brief_preset_name"] == "Meu brief sad"


def test_preset_de_outro_user_nao_linka():
    """Preset pertence a outro user -> nao linka (id e nome ficam None)."""
    client, covers_tbl = _make_client(
        preset_row={"name": "Brief alheio", "user_id": "outro-user"}
    )

    _run(client, PRESET_ID)

    payload = _insert_payload(covers_tbl)
    assert payload["brief_preset_id"] is None
    assert payload["brief_preset_name"] is None


def test_sem_preset_id_nao_linka():
    """Geracao sem preset (ad-hoc) -> colunas de link ficam None."""
    client, covers_tbl = _make_client(preset_row=None)

    _run(client, None)

    payload = _insert_payload(covers_tbl)
    assert payload["brief_preset_id"] is None
    assert payload["brief_preset_name"] is None
