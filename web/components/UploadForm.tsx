'use client'

import { useState, useRef } from 'react'
import { UploadCloud, CheckCircle2, AlertCircle, Music, Image } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadWithProgress } from '@/lib/storage'

type Status = 'idle' | 'uploading' | 'done' | 'error'

export function UploadForm() {
  const supabase = createClient()
  const audioRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [audioProgress, setAudioProgress] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!audioFile) return

    setStatus('uploading')
    setError(null)
    setAudioProgress(0)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Usuário não autenticado')

      const beatId = crypto.randomUUID()
      const ext = audioFile.name.split('.').pop()?.toLowerCase() ?? 'mp3'
      const audioPath = `${user.id}/${beatId}/original.${ext}`

      const { data: signedData, error: signedError } = await supabase.storage
        .from('audios')
        .createSignedUploadUrl(audioPath)
      if (signedError || !signedData) {
        throw new Error(`Erro ao preparar upload: ${signedError?.message}`)
      }

      await uploadWithProgress(signedData.signedUrl, audioFile, setAudioProgress)

      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const coverPath = `${user.id}/${beatId}/cover.${coverExt}`
        const { data: coverSigned, error: coverSignedError } = await supabase.storage
          .from('covers')
          .createSignedUploadUrl(coverPath)
        if (coverSignedError || !coverSigned) {
          throw new Error(`Erro ao preparar upload da capa: ${coverSignedError?.message}`)
        }
        await uploadWithProgress(coverSigned.signedUrl, coverFile)
      }

      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
    }
  }

  const uploading = status === 'uploading'

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-green-500/20 bg-green-500/5 px-8 py-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-400" />
        <div>
          <p className="text-lg font-semibold text-white">Upload concluído!</p>
          <p className="mt-1 text-sm text-zinc-400">
            Seu beat foi enviado. Em breve o pipeline de IA vai gerar os títulos e descrições.
          </p>
        </div>
        <button
          onClick={() => {
            setStatus('idle')
            setAudioFile(null)
            setCoverFile(null)
            setAudioProgress(0)
          }}
          className="mt-2 rounded-lg bg-zinc-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          Fazer outro upload
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-6">
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
                <p className="text-xs text-zinc-500">MP3, WAV, FLAC ou M4A</p>
              </div>
            </>
          )}
        </button>
        <input
          ref={audioRef}
          type="file"
          accept=".mp3,.wav,.flac,.m4a,audio/mpeg,audio/wav,audio/flac,audio/x-m4a,audio/mp4"
          className="hidden"
          onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-zinc-400">
            <span>Enviando áudio...</span>
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

      {/* Cover */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Capa <span className="text-zinc-500">(opcional)</span>
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
              <p className="text-sm text-zinc-500">Clique para adicionar uma capa (JPG ou PNG)</p>
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
        disabled={!audioFile || uploading}
        className="rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? 'Enviando...' : 'Fazer upload'}
      </button>
    </form>
  )
}
