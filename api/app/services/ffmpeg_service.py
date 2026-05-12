"""Gera MP4 (capa estatica + audio MP3) via ffmpeg pra upload no YouTube."""
import logging
import os
import shutil
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

FFMPEG_TIMEOUT_SECONDS = 300


def _ffmpeg_binary() -> str:
    """Retorna o path do binario ffmpeg.
    Ordem: FFMPEG_PATH env > ffmpeg no PATH > imageio-ffmpeg embutido.
    """
    env_path = os.environ.get("FFMPEG_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    which = shutil.which("ffmpeg")
    if which:
        return which

    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as exc:
        raise RuntimeError(
            "ffmpeg nao encontrado: nem no PATH, nem via imageio-ffmpeg"
        ) from exc


def audio_to_mp4(mp3_path: str, cover_path: str, output_path: str) -> None:
    """
    Gera MP4 com capa estatica + audio.
    -r 1 + -c:a copy: capa nao precisa de 30fps, mantem MP3 sem reencode.
    Resultado: arquivo ~5x menor e gera ~10x mais rapido que -r 30 -c:a aac.
    """
    for label, path in (("mp3", mp3_path), ("cover", cover_path)):
        if not os.path.exists(path):
            raise FileNotFoundError(f"Arquivo {label} nao existe: {path}")

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    ffmpeg_bin = _ffmpeg_binary()
    cmd = [
        ffmpeg_bin, "-y",
        "-loop", "1", "-i", cover_path,
        "-i", mp3_path,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
        "-r", "1", "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-shortest", "-movflags", "+faststart",
        output_path,
    ]

    logger.info("ffmpeg: gerando MP4 com bin=%s output=%s", ffmpeg_bin, output_path)
    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
            timeout=FFMPEG_TIMEOUT_SECONDS,
        )
    except subprocess.CalledProcessError as exc:
        stderr_tail = (exc.stderr or "")[-2000:]
        logger.error("ffmpeg falhou (rc=%s): %s", exc.returncode, stderr_tail)
        raise RuntimeError(f"ffmpeg falhou: {stderr_tail}") from exc
    except subprocess.TimeoutExpired as exc:
        logger.error("ffmpeg timeout apos %ss", FFMPEG_TIMEOUT_SECONDS)
        raise RuntimeError(f"ffmpeg timeout apos {FFMPEG_TIMEOUT_SECONDS}s") from exc

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    logger.info("ffmpeg: MP4 gerado %.1fMB stderr_tail=%s", size_mb, (result.stderr or "")[-200:])
