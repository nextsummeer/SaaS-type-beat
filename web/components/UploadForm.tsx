'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, AlertCircle, Music, Image, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadWithProgress } from '@/lib/storage'

type Status = 'idle' | 'uploading' | 'error'

const MAX_ARTISTAS = 4

export function UploadForm() {
  const router = useRouter()
  const supabase = createClient()
  const audioRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [artistas, setArtistas] = useState<string[]>([''])
  const [bpm, setBpm] = useState('')
  const [jaPublicado, setJaPublicado] = useState(false)
  const [storeLink, setStoreLink] = useState('')
  const [audioProgress, setAudioProgress] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const bpmNum = Number(bpm)
  const bpmValid = Number.isFinite(bpmNum) && bpmNum >= 40 && bpmNum <= 300
  const artistasLimpos = artistas.map((a) => a.trim()).filter((a) => a.length > 0)
  // Remove duplicatas (case-insensitive)
  const artistasUnicos = artistasLimpos.filter(
    (a, i) => artistasLimpos.findIndex((b) => b.toLowerCase() === a.toLowerCase()) === i,
  )
  const canSubmit =
    !!audioFile &&
    !!coverFile &&
    artistasUnicos.length > 0 &&
    bpmValid &&
    (!jaPublicado || storeLink.trim().length > 0)

  function setArtista(idx: number, valor: string) {
    setArtistas((prev) => prev.map((a, i) => (i === idx ? valor : a)))
  }

  function adicionarArtista() {
    setArtistas((prev) => (prev.length < MAX_ARTISTAS ? [...prev, ''] : prev))
  }

  function removerArtista(idx: number) {
    setArtistas((prev) => prev.filter((_, i) => i !== idx))
  }

  const labelArtistas =
    artistas.length === 1
      ? 'Type beat de quem?'
      : `Type beat de ${Array(artistas.length).fill('quem').join(' x ')}?`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setStatus('uploading')
    setError(null)
    setAudioProgress(0)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Usuário não autenticado')

      const beatId = crypto.randomUUID()
      const audioPath = `${user.id}/${beatId}/original.mp3`

      const { data: signedData, error: signedError } = await supabase.storage
        .from('audios')
        .createSignedUploadUrl(audioPath)
      if (signedError || !signedData) {
        throw new Error(`Erro ao preparar upload: ${signedError?.message}`)
      }

      await uploadWithProgress(signedData.signedUrl, audioFile!, setAudioProgress)

      const coverExt = coverFile!.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const coverPath = `${user.id}/${beatId}/cover.${coverExt}`
      const { data: coverSigned, error: coverSignedError } = await supabase.storage
        .from('covers')
        .createSignedUploadUrl(coverPath)
      if (coverSignedError || !coverSigned) {
        throw new Error(`Erro ao preparar upload da capa: ${coverSignedError?.message}`)
      }
      await uploadWithProgress(coverSigned.signedUrl, coverFile!)

      // Registra o beat no banco e dispara o pipeline
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const apiRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/beats`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            audio_path: audioPath,
            cover_path: coverPath,
            artistas: artistasUnicos,
            artista_nome: artistasUnicos.join(' x '),
            bpm: bpmNum,
            store_link: jaPublicado ? storeLink.trim() : null,
          }),
        },
      )
      if (!apiRes.ok) {
        const err = await apiRes.json().catch(() => ({}))
        throw new Error(err.detail ?? 'Erro ao registrar beat')
      }

      const { id: dbBeatId } = await apiRes.json()
      router.push(`/beats/${dbBeatId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
    }
  }

  const uploading = status === 'uploading'

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-6">
      {/* Artistas (lista) + BPM */}
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            {labelArtistas} <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {artistas.map((valor, idx) => (
              <div key={idx} className="relative flex min-w-[160px] flex-1 items-center">
                <input
                  type="text"
                  value={valor}
                  onChange={(e) => setArtista(idx, e.target.value)}
                  disabled={uploading}
                  placeholder={idx === 0 ? 'Ex: Drake, Travis Scott...' : 'Outro artista'}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 pr-9 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
                />
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => removerArtista(idx)}
                    disabled={uploading}
                    aria-label={`Remover artista ${idx + 1}`}
                    className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {artistas.length < MAX_ARTISTAS && (
              <button
                type="button"
                onClick={adicionarArtista}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-3 py-3 text-sm font-medium text-zinc-400 transition hover:border-violet-500 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Adicionar
              </button>
            )}
          </div>
          {artistasLimpos.length > artistasUnicos.length && (
            <p className="mt-1 text-xs text-amber-400">Artista duplicado ignorado.</p>
          )}
        </div>

        <div className="max-w-[140px]">
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            BPM <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            disabled={uploading}
            min={40}
            max={300}
            placeholder="140"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Link da loja (condicional) */}
      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={jaPublicado}
            onChange={(e) => setJaPublicado(e.target.checked)}
            disabled={uploading}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-500"
          />
          Já publiquei esse beat em uma loja (BeatStars, Airbit, etc)
        </label>
        {jaPublicado && (
          <div>
            <input
              type="url"
              value={storeLink}
              onChange={(e) => setStoreLink(e.target.value)}
              disabled={uploading}
              placeholder="https://www.beatstars.com/beat/..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-zinc-500">Esse link vai aparecer na descrição do vídeo no YouTube.</p>
          </div>
        )}
      </div>

      {/* Audio */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Arquivo de áudio <span className="text-red-400">*</span>
        </label>
        <button
          type="button"
          onClick={() => audioRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 px-6 py-8 text-center transition hover:border-violet-500 hover:bg-zinc-800/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {audioFile ? (
            <>
              <Music className="h-8 w-8 text-violet-400" />
              <div>
                <p className="text-sm font-medium text-white">{audioFile.name}</p>
                <p className="text-xs text-zinc-400">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-300">Clique para selecionar o áudio</p>
                <p className="text-xs text-zinc-500">Somente MP3 — com sua tag de produtor no áudio</p>
              </div>
            </>
          )}
        </button>
        <input
          ref={audioRef}
          type="file"
          accept=".mp3,audio/mpeg"
          className="hidden"
          onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-zinc-400">
            <span>Enviando...</span>
            <span>{audioProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-300"
              style={{ width: `${audioProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Cover — obrigatória */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Capa do beat <span className="text-red-400">*</span>
        </label>
        <button
          type="button"
          onClick={() => coverRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 px-6 py-5 text-center transition hover:border-violet-500 hover:bg-zinc-800/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {coverFile ? (
            <>
              <Image className="h-6 w-6 text-violet-400" />
              <p className="text-sm font-medium text-white">{coverFile.name}</p>
            </>
          ) : (
            <>
              <Image className="h-6 w-6 text-zinc-500" />
              <p className="text-sm text-zinc-500">Clique para adicionar a capa (JPG ou PNG)</p>
            </>
          )}
        </button>
        <input
          ref={coverRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Error */}
      {status === 'error' && error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit || uploading}
        className="rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? 'Enviando...' : 'Fazer upload'}
      </button>
    </form>
  )
}
