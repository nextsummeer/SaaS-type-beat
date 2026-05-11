import tempfile
import logging
import numpy as np

logger = logging.getLogger(__name__)

# Perfis de Krumhansl-Kessler — padrão da musicologia para detecção de tom
_MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def detect_bpm_and_key(file_path: str) -> dict:
    """
    Analisa um arquivo de áudio e retorna BPM e tom musical.

    Retorna: {"bpm": 140, "music_key": "A minor"}
    """
    import librosa  # import lazy — evita custo de startup quando não usado

    y, sr = librosa.load(file_path, sr=None, mono=True)

    # BPM
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    bpm = int(round(float(np.atleast_1d(tempo)[0])))

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

    logger.info("Análise: bpm=%d key=%s", bpm, best_key)
    return {"bpm": bpm, "music_key": best_key}
