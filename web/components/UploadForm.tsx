'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UploadCloud, AlertCircle, Music, Image, Plus, X, Check, Store, ExternalLink, CalendarClock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadWithProgress } from '@/lib/storage'

type Status = 'idle' | 'uploading' | 'error'

const MAX_ARTISTAS = 4

/** chave usada pra carregar o pre-agendamento na /review depois do beat ficar pronto */
const PRE_SCHEDULE_KEY = (beatId: string) => `pre_schedule:${beatId}`

export function UploadForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const preAgendar = useMemo(() => {
    const raw = searchParams.get('agendar_em')
    if (!raw) return null
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  }, [searchParams])
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

      // Guarda o pre-agendamento pra /review consumir quando o beat ficar pronto
      if (preAgendar && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(PRE_SCHEDULE_KEY(dbBeatId), preAgendar.toISOString())
        } catch {
          // sessionStorage pode estar bloqueado em modo privado — nao e critico
        }
      }

      router.push(`/beats/${dbBeatId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
    }
  }

  const uploading = status === 'uploading'

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-6">
      {/* Banner pre-agendamento (quando vier do calendario com ?agendar_em=) */}
      {preAgendar && (
        <div
          className="flex items-start gap-3 rounded-lg"
          style={{
            padding: '12px 14px',
            background: 'var(--accent-muted)',
            border: '1px solid var(--accent-line)',
          }}
        >
          <CalendarClock size={16} style={{ color: 'var(--accent)', marginTop: 2 }} />
          <div className="flex-1">
            <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
              Esse beat vai ser pré-agendado pra{' '}
              <strong style={{ color: 'var(--accent)' }}>
                {new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(preAgendar)}
              </strong>
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Você pode mudar a data depois na tela de revisão.
            </p>
          </div>
        </div>
      )}

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
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 pr-9 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 px-3 py-3 text-sm font-medium text-zinc-400 transition hover:border-orange-500 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
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
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Link da loja (condicional) — card toggleable */}
      <div className="space-y-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={jaPublicado}
          onClick={() => !uploading && setJaPublicado(!jaPublicado)}
          disabled={uploading}
          className="group flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: jaPublicado ? 'var(--accent-muted)' : 'var(--bg-elevated)',
            border: jaPublicado
              ? '1px solid rgba(255, 90, 31, 0.4)'
              : '1px solid var(--border)',
            boxShadow: jaPublicado ? 'var(--shadow-glow-accent)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!jaPublicado && !uploading) {
              e.currentTarget.style.borderColor = 'var(--border-strong)'
              e.currentTarget.style.background = 'var(--bg-overlay)'
            }
          }}
          onMouseLeave={(e) => {
            if (!jaPublicado && !uploading) {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.background = 'var(--bg-elevated)'
            }
          }}
        >
          {/* Check custom */}
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md transition-all"
            style={{
              background: jaPublicado ? 'var(--accent)' : 'transparent',
              border: jaPublicado
                ? '1px solid var(--accent)'
                : '1.5px solid var(--border-strong)',
            }}
          >
            <Check
              size={13}
              strokeWidth={3}
              style={{
                color: '#fff',
                opacity: jaPublicado ? 1 : 0,
                transition: 'opacity 0.18s',
              }}
            />
          </span>

          {/* Ícone Store contextual */}
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{
              background: jaPublicado
                ? 'rgba(255, 90, 31, 0.18)'
                : 'var(--bg-surface)',
              border: '1px solid',
              borderColor: jaPublicado
                ? 'rgba(255, 90, 31, 0.4)'
                : 'var(--border-muted)',
            }}
          >
            <Store
              size={16}
              strokeWidth={1.75}
              style={{
                color: jaPublicado ? 'var(--accent)' : 'var(--text-muted)',
              }}
            />
          </span>

          {/* Texto */}
          <span className="flex flex-1 flex-col gap-0.5">
            <span
              className="text-[14px] font-medium leading-tight"
              style={{ color: jaPublicado ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              Já publiquei esse beat em uma loja
            </span>
            <span
              className="text-[11.5px] leading-tight"
              style={{ color: 'var(--text-subtle)' }}
            >
              BeatStars, Airbit, Traktrain, etc
            </span>
          </span>
        </button>

        {jaPublicado && (
          <div
            className="space-y-1.5 rise rise-1"
            style={{ animationDuration: '0.3s' }}
          >
            <div
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition focus-within:ring-1"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              <ExternalLink
                size={14}
                style={{ color: 'var(--text-subtle)' }}
                className="shrink-0"
              />
              <input
                type="url"
                value={storeLink}
                onChange={(e) => setStoreLink(e.target.value)}
                disabled={uploading}
                placeholder="https://www.beatstars.com/beat/..."
                className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-[var(--text-subtle)] disabled:opacity-50"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <p className="ml-1 text-[11.5px]" style={{ color: 'var(--text-subtle)' }}>
              Esse link vai aparecer na descrição do vídeo no YouTube.
            </p>
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
          className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 px-6 py-8 text-center transition hover:border-orange-500 hover:bg-zinc-800/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {audioFile ? (
            <>
              <Music className="h-8 w-8 text-orange-400" />
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
              className="h-full rounded-full bg-orange-600 transition-all duration-300"
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
          className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900 px-6 py-5 text-center transition hover:border-orange-500 hover:bg-zinc-800/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {coverFile ? (
            <>
              <Image className="h-6 w-6 text-orange-400" />
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
        className="rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? 'Enviando...' : 'Fazer upload'}
      </button>
    </form>
  )
}
