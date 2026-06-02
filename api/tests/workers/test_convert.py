"""
Testes do worker convert.py.

Não chamamos o Supabase nem o QStash de verdade — usamos mocks
(objetos falsos que simulam o comportamento esperado). Isso deixa
os testes rápidos e sem custo.
"""

from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

BEAT_ID = "00000000-0000-0000-0000-000000000001"
AUDIO_PATH = f"user-abc/{BEAT_ID}/original.mp3"


def _make_supabase(beat_data: dict, storage_ok: bool = True):
    """Monta um cliente Supabase falso com os dados do beat informados."""
    mock = MagicMock()

    # Simula: client.table("beats").select("*").eq(...).single().execute()
    mock.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = beat_data

    # Simula: client.storage.from_("audios").create_signed_url(path, 60)
    if storage_ok:
        mock.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://storage.example.com/file.mp3"
        }
    else:
        # Arquivo ausente → create_signed_url lança exceção
        mock.storage.from_.return_value.create_signed_url.side_effect = Exception("Not found")

    return mock


# ──────────────────────────────────────────────
# Caso 1 — caminho feliz
# ──────────────────────────────────────────────

def test_convert_uploaded_beat_avanca_para_converted():
    """
    Beat em status 'uploaded' com arquivo no Storage deve:
    - Atualizar status para 'converted'
    - Disparar o job de analyze no QStash
    - Retornar 200 com ok=True
    """
    beat = {"id": BEAT_ID, "status": "uploaded", "audio_path": AUDIO_PATH}
    supabase_mock = _make_supabase(beat, storage_ok=True)

    with (
        patch("app.workers.convert.get_admin_client", return_value=supabase_mock),
        patch("app.workers.convert.dispatch_analyze_job") as mock_dispatch,
    ):
        response = client.post(f"/internal/beats/{BEAT_ID}/convert")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["status"] == "converted"

    # Verifica que o status foi atualizado no banco
    supabase_mock.table.return_value.update.assert_called_once_with({"status": "converted"})

    # Verifica que o próximo job foi disparado
    mock_dispatch.assert_called_once_with(BEAT_ID)


# ──────────────────────────────────────────────
# Caso 2 — idempotência
# ──────────────────────────────────────────────

def test_convert_beat_ja_convertido_retorna_skipped():
    """
    Beat já em status 'converted' (ou além) não deve ser reprocessado.
    O worker deve retornar skipped=True sem tocar no banco ou no QStash.
    """
    beat = {"id": BEAT_ID, "status": "converted", "audio_path": AUDIO_PATH}
    supabase_mock = _make_supabase(beat, storage_ok=True)

    with (
        patch("app.workers.convert.get_admin_client", return_value=supabase_mock),
        patch("app.workers.convert.dispatch_analyze_job") as mock_dispatch,
    ):
        response = client.post(f"/internal/beats/{BEAT_ID}/convert")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["skipped"] is True

    # Nenhuma atualização no banco
    supabase_mock.table.return_value.update.assert_not_called()

    # Nenhum job disparado
    mock_dispatch.assert_not_called()


# ──────────────────────────────────────────────
# Caso 3 — arquivo ausente no Storage
# ──────────────────────────────────────────────

def test_convert_arquivo_ausente_marca_failed():
    """
    Beat em 'uploaded' mas sem arquivo no Storage deve:
    - Marcar status como 'failed' no banco
    - Retornar 422
    """
    beat = {"id": BEAT_ID, "status": "uploaded", "audio_path": AUDIO_PATH}
    supabase_mock = _make_supabase(beat, storage_ok=False)

    with (
        patch("app.workers.convert.get_admin_client", return_value=supabase_mock),
        patch("app.workers.convert.dispatch_analyze_job") as mock_dispatch,
    ):
        response = client.post(f"/internal/beats/{BEAT_ID}/convert")

    assert response.status_code == 422

    # Status marcado como failed (com error_message preenchido)
    update_call = supabase_mock.table.return_value.update.call_args
    assert update_call is not None, "update() não foi chamado"
    update_payload = update_call.args[0]
    assert update_payload["status"] == "failed"
    assert "arquivo" in update_payload.get("error_message", "").lower()

    # Nenhum job disparado
    mock_dispatch.assert_not_called()


# ──────────────────────────────────────────────
# Caso 4 — upload de WAV converte pra MP3 320k (T2.15)
# ──────────────────────────────────────────────

WAV_PATH = f"user-abc/{BEAT_ID}/original.wav"
WAV_MP3_PATH = f"user-abc/{BEAT_ID}/original.mp3"


def test_convert_wav_transcodifica_para_mp3():
    """
    Beat em 'uploaded' com WAV no Storage deve:
    - Baixar o WAV, transcodificar pra MP3 320k (ffmpeg mockado)
    - Subir o MP3 e trocar o audio_path pra original.mp3
    - Remover o WAV original
    - Avancar status pra 'converted' e disparar analyze
    """
    beat = {"id": BEAT_ID, "status": "uploaded", "audio_path": WAV_PATH}
    supabase_mock = _make_supabase(beat, storage_ok=True)

    fake_resp = MagicMock()
    fake_resp.content = b"RIFF....fake-wav-bytes"
    fake_resp.raise_for_status = MagicMock()

    with (
        patch("app.workers.convert.get_admin_client", return_value=supabase_mock),
        patch("app.workers.convert.dispatch_analyze_job") as mock_dispatch,
        patch("app.workers.convert.transcode_to_mp3") as mock_transcode,
        patch("app.workers.convert.http_requests.get", return_value=fake_resp),
    ):
        response = client.post(f"/internal/beats/{BEAT_ID}/convert")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["status"] == "converted"

    # ffmpeg foi chamado pra transcodificar
    mock_transcode.assert_called_once()

    # audio_path trocado pro MP3 + status avancado numa unica update
    supabase_mock.table.return_value.update.assert_called_once_with(
        {"audio_path": WAV_MP3_PATH, "status": "converted"}
    )

    # MP3 foi subido no bucket de audios
    upload_call = supabase_mock.storage.from_.return_value.upload.call_args
    assert upload_call is not None, "upload() não foi chamado"
    assert upload_call.kwargs["path"] == WAV_MP3_PATH

    # WAV original removido (best-effort, depois do update)
    supabase_mock.storage.from_.return_value.remove.assert_called_once_with([WAV_PATH])

    # Proximo job disparado
    mock_dispatch.assert_called_once_with(BEAT_ID)
