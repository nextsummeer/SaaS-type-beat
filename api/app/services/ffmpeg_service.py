"""Gera MP4 (capa estatica + audio MP3) via ffmpeg pra upload no YouTube."""
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

logger = logging.getLogger(__name__)

FFMPEG_TIMEOUT_SECONDS = 300
VIDEO_WIDTH = 1920
VIDEO_HEIGHT = 1080
COVER_SIZE = 1080


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


def _prepare_canvas(cover_path: str) -> str:
    """
    Pre-processa a capa em um canvas 1920x1080 com pillarbox preto.
    A capa SEMPRE ocupa 100% da altura (1080px), preservando aspect ratio:
      - capa 1:1 (1080x1080)  → centralizada, barras de 420px de cada lado
      - capa menor que 1080   → upscale pra altura 1080 (mantem proporcao)
      - capa wide (ex: 16:9)  → ocupa toda a largura tambem, crop horizontal centro
    Retorna o path do JPEG temporario.
    """
    with Image.open(cover_path) as img:
        img = img.convert("RGB")

        # Forca altura = VIDEO_HEIGHT, mantendo aspect (upscale ou downscale)
        if img.height != VIDEO_HEIGHT:
            ratio = VIDEO_HEIGHT / img.height
            new_w = max(1, int(round(img.width * ratio)))
            img = img.resize((new_w, VIDEO_HEIGHT), Image.LANCZOS)

        # Se a capa ficou mais larga que o canvas (capa wide), crop horizontal centro
        if img.width > VIDEO_WIDTH:
            left = (img.width - VIDEO_WIDTH) // 2
            img = img.crop((left, 0, left + VIDEO_WIDTH, VIDEO_HEIGHT))

        canvas = Image.new("RGB", (VIDEO_WIDTH, VIDEO_HEIGHT), color=(0, 0, 0))
        offset_x = (VIDEO_WIDTH - img.width) // 2
        canvas.paste(img, (offset_x, 0))

        out = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
        out.close()
        canvas.save(out.name, "JPEG", quality=92, optimize=True)
        return out.name


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
    canvas_path = _prepare_canvas(cover_path)
    canvas_size = os.path.getsize(canvas_path)
    logger.info(
        "ffmpeg: canvas pronto path=%s size=%dKB",
        canvas_path, canvas_size // 1024,
    )

    # Modo "low memory" do libx264 (Railway free tem ~512MB):
    #   -preset ultrafast: encoder mais rapido, menos buffers internos
    #   -bf 0: sem B-frames (lookahead minimo)
    #   -g 1: GOP=1, todo frame eh keyframe (sem inter-frame state)
    #   -profile:v baseline: profile mais simples do H.264
    # Como a capa eh estatica e roda a 1fps, isso nao perde qualidade visivel
    # e mantem pico de RAM <100MB.
    cmd = [
        ffmpeg_bin, "-y",
        "-loop", "1", "-i", canvas_path,
        "-i", mp3_path,
        "-c:v", "libx264", "-preset", "ultrafast",
        "-profile:v", "baseline", "-level", "3.1",
        "-bf", "0", "-g", "1",
        "-crf", "23",
        "-r", "1", "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-shortest", "-movflags", "+faststart",
        output_path,
    ]

    logger.info("ffmpeg: rodando cmd=%s", " ".join(cmd))
    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
            timeout=FFMPEG_TIMEOUT_SECONDS,
        )
    except subprocess.CalledProcessError as exc:
        stderr_tail = (exc.stderr or "")[-8000:]
        logger.error("ffmpeg falhou (rc=%s) stderr=\n%s", exc.returncode, stderr_tail)
        raise RuntimeError(f"ffmpeg rc={exc.returncode}: {stderr_tail[-1500:]}") from exc
    except subprocess.TimeoutExpired as exc:
        logger.error("ffmpeg timeout apos %ss", FFMPEG_TIMEOUT_SECONDS)
        raise RuntimeError(f"ffmpeg timeout apos {FFMPEG_TIMEOUT_SECONDS}s") from exc
    finally:
        if os.path.exists(canvas_path):
            try:
                os.unlink(canvas_path)
            except OSError:
                pass

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    logger.info("ffmpeg: MP4 gerado %.1fMB stderr_tail=%s", size_mb, (result.stderr or "")[-200:])
