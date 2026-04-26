# ffmpeg — Conversao + Geracao de video

**Versao alvo:** ffmpeg 6.x + ffmpeg-python 0.2.0
**Docs oficiais:** https://ffmpeg.org/documentation.html
**Atualizado:** 2026-04-25

## Instalacao

### Local (dev)
- Windows: `winget install Gyan.FFmpeg`
- Mac: `brew install ffmpeg`
- Linux: `apt install ffmpeg`

### Railway (producao)
Adicionar no `api/Dockerfile`:
```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml .
RUN pip install -e .
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Railway buildpack Python NAO inclui ffmpeg por default. Por isso Dockerfile.

```bash
pip install ffmpeg-python
```

## Conversao audio → MP3 320kbps com loudnorm

```python
# api/app/services/ffmpeg_service.py
import ffmpeg

def convert_to_mp3(input_path: str, output_path: str):
    """
    Converte qualquer formato pra MP3 320kbps com normalizacao de volume EBU R128.
    """
    (
        ffmpeg
        .input(input_path)
        .audio
        .filter("loudnorm", I=-14, TP=-1.5, LRA=11)
        .output(output_path, audio_bitrate="320k", acodec="libmp3lame", format="mp3")
        .overwrite_output()
        .run(quiet=True)
    )
```

Ou via subprocess direto (mais controle):

```python
import subprocess

def convert_to_mp3(input_path: str, output_path: str):
    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-b:a", "320k",
        "-acodec", "libmp3lame",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
```

`loudnorm` parametros:
- `I=-14` LUFS target (padrao Spotify/YouTube)
- `TP=-1.5` true peak ceiling
- `LRA=11` loudness range alvo

## Geracao de video (capa estatica + audio)

```python
def audio_to_video(cover_path: str, mp3_path: str, output_path: str):
    """
    Cria mp4 com capa congelada + audio rodando.
    Output 1280x720 por padrao YouTube.
    """
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", cover_path,
        "-i", mp3_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-r", "30",
        "-pix_fmt", "yuv420p",
        "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
```

`-shortest` faz video durar o mesmo que o audio (parar quando audio acabar).
`scale + pad` mantem aspect ratio com letterbox preto (capa pode ser quadrada, vira widescreen).

## Probe (extrair duracao, formato)

```python
def get_audio_info(audio_path: str) -> dict:
    probe = ffmpeg.probe(audio_path)
    audio_stream = next(s for s in probe["streams"] if s["codec_type"] == "audio")
    return {
        "duration_seconds": float(probe["format"]["duration"]),
        "bitrate": int(audio_stream.get("bit_rate", 0)),
        "codec": audio_stream["codec_name"],
        "sample_rate": int(audio_stream["sample_rate"]),
    }
```

## Tempo esperado

| Operacao | Beat de 3min | Maquina |
|---|---|---|
| Conversao MP3 320 + loudnorm | ~10-15s | Railway 1vCPU |
| Geracao video 1280x720 | ~30-45s | Railway 1vCPU |

Total worker convert + publish: ~1min por variacao A/B/C. Por isso async/QStash.

## Gotchas

- **Dockerfile Railway:** sem ffmpeg apt no image, `subprocess.run("ffmpeg")` falha com FileNotFoundError. Validar `which ffmpeg` no startup
- **stderr verbose:** ffmpeg loga em stderr mesmo em sucesso. `capture_output=True` pra silenciar
- **Memoria:** loudnorm com `LRA=11` exige analise de 2 passes idealmente. 1 pass com LRA=11 da resultado bom mas approx
- **Imagens RGBA → mp4:** algumas capas PNG tem alpha. ffmpeg avisa "deprecated pixel format". Solucao: forcar `-pix_fmt yuv420p` no encode
- **Codec MP4 + tags:** ffmpeg gera mp4 com `moov` no fim por default — YouTube aceita. Mas pra streaming, adicionar `-movflags +faststart`
- **Long files (>30min):** chunk processing. Pra type beat (max 5min), nao precisa
- **Path com espacos:** quote no Python `subprocess` aceita lista, nao precisa quotar manual
- **Crop vs pad:** capa quadrada (1080x1080) virando 1280x720 com pad fica com barras pretas. Alternativa: scale + crop (perde info nas pontas). Default do BeatPost: pad
