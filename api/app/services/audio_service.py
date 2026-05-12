import tempfile
import logging
import numpy as np

logger = logging.getLogger(__name__)

# Perfis de Krumhansl-Kessler — padrão da musicologia para detecção de tom
_MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def detect_key(file_path: str) -> dict:
    """
    Analisa um arquivo de áudio e retorna o tom musical (key).
    BPM nao e detectado aqui — vem do input manual do produtor (T2.13).

    Retorna: {"music_key": "A minor"}
    """
    import librosa  # import lazy — evita custo de startup quando não usado

    # Carrega só os primeiros 60s a 22050 Hz — suficiente para detectar tom
    y, sr = librosa.load(file_path, sr=22050, mono=True, duration=60)

    # Tom — correlação com perfis de Krumhansl-Kessler
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = chroma.mean(axis=1)

    best_key = "C major"
    best_score = -np.inf

    for i in range(12):
        major_score = np.corrcoef(chroma_mean, np.roll(_MAJOR, i))[0, 1]
        minor_score = np.corrcoef(chroma_mean, np.roll(_MINOR, i))[0, 1]

        if major_score > best_score:
            best_score = major_score
            best_key = f"{_NOTES[i]} major"

        if minor_score > best_score:
            best_score = minor_score
            best_key = f"{_NOTES[i]} minor"

    logger.info("Análise: key=%s", best_key)
    return {"music_key": best_key}
