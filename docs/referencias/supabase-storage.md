# Supabase Storage — Buckets + Signed URLs + Policies

**Versao alvo:** @supabase/storage-js 2.7+ (incluso em supabase-js 2.45+)
**Docs oficiais:** https://supabase.com/docs/guides/storage
**Atualizado:** 2026-04-25

## Buckets do BeatPost

| Bucket | Public? | Limit | MIME |
|---|---|---|---|
| `audios` | private | 100 MB | audio/mpeg, audio/wav, audio/flac, audio/mp4, audio/x-m4a |
| `covers` | private | 5 MB | image/jpeg, image/png |
| `videos` | private | 500 MB | video/mp4 |

## Path convention

```
audios/{user_id}/{beat_id}/original.{ext}
audios/{user_id}/{beat_id}/converted.mp3
covers/{user_id}/{beat_id}/cover.{ext}
videos/{user_id}/{beat_id}/{variacao}.mp4
```

`{user_id}` no inicio e essencial pra RLS funcionar via `split_part(name, '/', 1)::uuid = auth.uid()`.

## Upload com signed URL (frontend → bucket direto)

Backend cria signed URL, browser faz PUT direto no bucket. Reduz egress do API.

### 1. Backend cria signed URL

```python
# api/app/routes/uploads.py
@router.post("/uploads/signed-url")
async def create_signed_url(
    bucket: str,
    path: str,
    user = Depends(get_current_user),
    supabase = Depends(get_supabase),
):
    # validar path comeca com user.id
    if not path.startswith(f"{user.id}/"):
        raise HTTPException(403, "Invalid path")
    response = supabase.storage.from_(bucket).create_signed_upload_url(path)
    return response  # {signedUrl, token, path}
```

### 2. Frontend faz PUT direto

```ts
// web/lib/upload.ts
export async function uploadToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 100);
    };
    xhr.onload = () => xhr.status === 200 ? resolve() : reject(xhr.statusText);
    xhr.onerror = () => reject(xhr.statusText);
    xhr.send(file);
  });
}
```

## Download autenticado (backend → worker)

```python
# api/app/services/storage_service.py
def download_to_temp(supabase, bucket: str, path: str) -> str:
    """Baixa arquivo do bucket pra um path temporario."""
    import tempfile
    bytes_data = supabase.storage.from_(bucket).download(path)
    tmp_path = tempfile.NamedTemporaryFile(delete=False, suffix=Path(path).suffix).name
    with open(tmp_path, "wb") as f:
        f.write(bytes_data)
    return tmp_path
```

## Upload programatico (worker → bucket)

```python
def upload_file(supabase, bucket: str, path: str, local_path: str, content_type: str):
    with open(local_path, "rb") as f:
        supabase.storage.from_(bucket).upload(
            path=path,
            file=f.read(),
            file_options={"content-type": content_type, "upsert": "true"},
        )
```

## Signed URL pra download (compartilhar capa publicamente apos publicar)

```python
def get_download_url(supabase, bucket: str, path: str, expires_in: int = 3600) -> str:
    response = supabase.storage.from_(bucket).create_signed_url(path, expires_in)
    return response["signedURL"]
```

## Policies (ja em supabase/migrations/003)

```sql
create policy "audios_own" on storage.objects
  for all using (
    bucket_id = 'audios' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  ) with check (
    bucket_id = 'audios' and
    (split_part(name, '/', 1))::uuid = auth.uid()
  );
```

3 policies (uma por bucket: audios, covers, videos). Mesmo padrao.

## Gotchas

- **`upsert: "true"`** evita erro 409 quando re-uploadando. Util pra workers que retry.
- **Content-Type** precisa bater com `allowed_mime_types` do bucket — senao da 400
- **Files > 100 MB** precisam `multipart upload`. Pra MP3 320kbps de ate 5min, fica em ~12 MB. Tranquilo.
- **CORS:** Storage tem CORS proprio (separado do API). Configurar em dashboard se browser bloquear PUT direto
- **Egress cobra:** Supabase free 5GB/mes. Workers que baixam toda hora consomem rapido. Cachear local em worker quando possivel
- **Path normalization:** `'/abc/'` vira `'abc'` no upload. Cuidado com leading slash
- **Service role bypassa RLS** mas RLS de Storage usa policies separadas — service role respeita policies de bucket por padrao (pode bypassar com `--use-anon-key=false`)
