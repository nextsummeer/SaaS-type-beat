'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UploadCloud, AlertCircle, Music, Plus, Check, Store, ExternalLink, CalendarClock, Sparkles, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadWithProgress } from '@/lib/storage'
import { CoverPicker } from './CoverPicker'
import { AudioPlayer } from './AudioPlayer'
import {
  ArtistComboBox,
  loadRecentArtists,
  saveRecentArtists,
  type SelectedArtist,
} from './ArtistComboBox'

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

  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!audioFile) {
      setAudioPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(audioFile)
    setAudioPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [audioFile])

  /** Capa via upload manual (modo CoverPicker tab 'Manual') */
  const [coverFile, setCoverFile] = useState<File | null>(null)
  /** Capa selecionada da biblioteca (modo CoverPicker tab 'Biblioteca').
   * Inicializa via query param `?cover_id=...` (vindo do botao "Usar em
   * beat" da aba /capas). */
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(
    () => searchParams.get('cover_id'),
  )
  // Slots de artista (null = vazio com combobox aberto). Comeca com 1 slot
  // e pre-popula com o ultimo artista usado se houver no localStorage.
  const [artistSlots, setArtistSlots] = useState<(SelectedArtist | null)[]>([null])
  const [recentArtists, setRecentArtists] = useState<SelectedArtist[]>([])

  useEffect(() => {
    const recents = loadRecentArtists()
    setRecentArtists(recents)
    if (recents.length > 0) {
      setArtistSlots([recents[0]])
    }
  }, [])

  const [bpm, setBpm] = useState('')
  const [jaPublicado, setJaPublicado] = useState(false)
  const [storeLink, setStoreLink] = useState('')
  const [audioProgress, setAudioProgress] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [audioDragOver, setAudioDragOver] = useState(false)
  const [dropAviso, setDropAviso] = useState<string | null>(null)

  const bpmNum = Number(bpm)
  const bpmValid = Number.isFinite(bpmNum) && bpmNum >= 40 && bpmNum <= 300
  const filledArtists = artistSlots.filter(
    (a): a is SelectedArtist => a !== null,
  )
  const artistasUnicos = filledArtists.map((a) => a.name)
  const hasCover = !!coverFile || !!selectedCoverId
  const canSubmit =
    !!audioFile &&
    hasCover &&
    artistasUnicos.length > 0 &&
    bpmValid &&
    (!jaPublicado || storeLink.trim().length > 0)

  function exibirAviso(msg: string) {
    setDropAviso(msg)
    setTimeout(() => setDropAviso(null), 3500)
  }

  function handleAudioDrop(e: React.DragEvent) {
    e.preventDefault()
    setAudioDragOver(false)
    if (uploading) return
    const arquivo = e.dataTransfer.files?.[0]
    if (!arquivo) return
    const nomeLower = arquivo.name.toLowerCase()
    const ehMp3 = arquivo.type === 'audio/mpeg' || nomeLower.endsWith('.mp3')
    if (!ehMp3) {
      exibirAviso('Só MP3 por enquanto — converta o arquivo antes de soltar.')
      return
    }
    setAudioFile(arquivo)
  }

  function setSlotArtist(idx: number, artist: SelectedArtist | null) {
    setArtistSlots((prev) => prev.map((a, i) => (i === idx ? artist : a)))
  }

  function adicionarSlot() {
    setArtistSlots((prev) =>
      prev.length < MAX_ARTISTAS ? [...prev, null] : prev,
    )
  }

  function removerSlot(idx: number) {
    setArtistSlots((prev) => {
      if (prev.length === 1) return [null]
      return prev.filter((_, i) => i !== idx)
    })
  }

  const labelArtistas =
    artistSlots.length === 1
      ? 'Type beat de quem?'
      : `Type beat de ${Array(artistSlots.length).fill('quem').join(' x ')}?`

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

      // Capa pode vir de 2 caminhos:
      //  (a) Manual: faz upload do file pro storage, manda cover_path
      //  (b) Biblioteca: capa ja existe em cover_library, manda cover_id direto
      let coverPath: string | null = null
      const coverId = selectedCoverId

      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        coverPath = `${user.id}/${beatId}/cover.${coverExt}`
        const { data: coverSigned, error: coverSignedError } = await supabase.storage
          .from('covers')
          .createSignedUploadUrl(coverPath)
        if (coverSignedError || !coverSigned) {
          throw new Error(`Erro ao preparar upload da capa: ${coverSignedError?.message}`)
        }
        await uploadWithProgress(coverSigned.signedUrl, coverFile)
      }

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
            cover_id: coverId,
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

      // Persiste artistas usados pra pre-preencher o proximo upload.
      saveRecentArtists(filledArtists)

      if (preAgendar && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(PRE_SCHEDULE_KEY(dbBeatId), preAgendar.toISOString())
        } catch {
          // sessionStorage pode estar bloqueado em modo privado
        }
      }

      router.push(`/beats/${dbBeatId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
    }
  }

  const uploading = status === 'uploading'

  const inputBase: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 10,
    color: 'var(--text-primary)',
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-6">
      {/* Banner pre-agendamento */}
      {preAgendar && (
        <div
          className="flex items-start gap-3 rounded-lg"
          style={{
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-medium)',
          }}
        >
          <CalendarClock size={16} style={{ color: 'var(--text-primary)', marginTop: 2 }} />
          <div className="flex-1">
            <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
              Esse beat vai ser pré-agendado pra{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
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

      {/* Artistas + BPM */}
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {labelArtistas} <span style={{ color: 'var(--led-error)' }}>*</span>
          </label>
          <div className="space-y-2">
            {artistSlots.map((slot, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <ArtistComboBox
                    value={slot}
                    onChange={(a) => setSlotArtist(idx, a)}
                    placeholder={
                      idx === 0
                        ? 'ex: Drake, Travis Scott…'
                        : 'outro artista (colab)'
                    }
                    disabled={uploading}
                    recentArtists={idx === 0 ? recentArtists : []}
                    excludeNames={artistSlots
                      .filter((s, i) => i !== idx && s !== null)
                      .map((s) => s!.name)}
                  />
                </div>
                {artistSlots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerSlot(idx)}
                    disabled={uploading}
                    aria-label={`Remover slot ${idx + 1}`}
                    className="flex h-[50px] w-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(248,113,113,0.10)'
                      e.currentTarget.style.color = 'var(--led-error)'
                      e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-muted)'
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    }}
                  >
                    <Plus size={14} strokeWidth={2.2} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                )}
              </div>
            ))}
            {artistSlots.length < MAX_ARTISTAS && (
              <button
                type="button"
                onClick={adicionarSlot}
                disabled={uploading}
                className="font-mono uppercase inline-flex items-center gap-2 rounded-lg border border-dashed px-3.5 py-2.5 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  fontSize: 10.5,
                  letterSpacing: '0.22em',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-strong)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-medium)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Plus size={11} strokeWidth={2.2} />
                Adicionar artista
              </button>
            )}
          </div>
        </div>

        <div className="max-w-[140px]">
          <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            BPM <span style={{ color: 'var(--led-error)' }}>*</span>
          </label>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            disabled={uploading}
            min={40}
            max={300}
            placeholder="140"
            className="field-input disabled:opacity-50"
          />
        </div>
      </div>

      {/* Link da loja */}
      <div className="space-y-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={jaPublicado}
          onClick={() => !uploading && setJaPublicado(!jaPublicado)}
          disabled={uploading}
          className="group flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: jaPublicado ? 'rgba(255,255,255,0.05)' : 'var(--bg-surface)',
            border: jaPublicado
              ? '1px solid var(--border-strong)'
              : '1px solid var(--border-subtle)',
          }}
          onMouseEnter={(e) => {
            if (!jaPublicado && !uploading) {
              e.currentTarget.style.borderColor = 'var(--border-medium)'
              e.currentTarget.style.background = 'var(--bg-elevated)'
            }
          }}
          onMouseLeave={(e) => {
            if (!jaPublicado && !uploading) {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
              e.currentTarget.style.background = 'var(--bg-surface)'
            }
          }}
        >
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md transition-all"
            style={{
              background: jaPublicado ? '#FFFFFF' : 'transparent',
              border: jaPublicado
                ? '1px solid #FFFFFF'
                : '1.5px solid var(--border-strong)',
            }}
          >
            <Check
              size={13}
              strokeWidth={3}
              style={{
                color: '#000',
                opacity: jaPublicado ? 1 : 0,
                transition: 'opacity 0.18s',
              }}
            />
          </span>

          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{
              background: jaPublicado ? 'rgba(255,255,255,0.06)' : 'var(--bg-elevated)',
              border: '1px solid',
              borderColor: jaPublicado ? 'var(--border-medium)' : 'var(--border-subtle)',
            }}
          >
            <Store
              size={16}
              strokeWidth={1.75}
              style={{ color: jaPublicado ? 'var(--text-primary)' : 'var(--text-muted)' }}
            />
          </span>

          <span className="flex flex-1 flex-col gap-0.5">
            <span
              className="text-[14px] font-medium leading-tight"
              style={{ color: jaPublicado ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              Já publiquei esse beat em uma loja
            </span>
            <span
              className="text-[11.5px] leading-tight"
              style={{ color: 'var(--text-muted)' }}
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
              style={inputBase}
            >
              <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
              <input
                type="url"
                value={storeLink}
                onChange={(e) => setStoreLink(e.target.value)}
                disabled={uploading}
                placeholder="https://www.beatstars.com/beat/..."
                className="flex-1 bg-transparent text-[13.5px] outline-none disabled:opacity-50"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <p className="ml-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              Esse link vai aparecer na descrição do vídeo no YouTube.
            </p>
          </div>
        )}
      </div>

      {/* Audio */}
      <div>
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Arquivo de áudio <span style={{ color: 'var(--led-error)' }}>*</span>
        </label>
        <button
          type="button"
          onClick={() => audioRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            if (!uploading) setAudioDragOver(true)
          }}
          onDragLeave={() => setAudioDragOver(false)}
          onDrop={handleAudioDrop}
          disabled={uploading}
          className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor: audioDragOver
              ? '#FFFFFF'
              : audioFile
                ? 'var(--border-strong)'
                : 'var(--border-medium)',
            background: audioDragOver
              ? 'rgba(255,255,255,0.04)'
              : audioFile
                ? 'var(--bg-surface)'
                : 'var(--bg-base)',
          }}
        >
          {audioDragOver ? (
            <>
              <span
                className="led led-pulse"
                style={{ color: '#FFFFFF', width: 9, height: 9 }}
              />
              <div className="flex flex-col gap-1">
                <p
                  className="font-mono uppercase"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: '0.18em',
                    color: 'var(--text-primary)',
                  }}
                >
                  Solte o áudio aqui
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Aceitando MP3
                </p>
              </div>
            </>
          ) : audioFile ? (
            <>
              <Music className="h-8 w-8" style={{ color: 'var(--text-primary)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{audioFile.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8" style={{ color: 'var(--text-muted)' }} />
              <div className="flex flex-col gap-1">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Arraste o MP3 aqui ou <span style={{ color: 'var(--text-primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}>clique para escolher</span>
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Somente MP3 — com sua tag de produtor no áudio
                </p>
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

        {/* Preview player — confirma audialmente que o producer subiu o beat certo. */}
        {audioPreviewUrl && audioFile && (
          <div className="mt-3">
            <AudioPlayer src={audioPreviewUrl} fileName={audioFile.name} />
          </div>
        )}
      </div>

      {/* Progress bar */}
      {uploading && (
        <div>
          <div className="mb-1.5 flex justify-between font-mono text-[10.5px] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.16em' }}>
            <span>Enviando</span>
            <span className="tabular" style={{ color: 'var(--text-primary)' }}>{audioProgress}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${audioProgress}%`,
                background: 'var(--gradient-primary)',
                boxShadow: '0 0 12px rgba(65,0,255,0.45)',
              }}
            />
          </div>
        </div>
      )}

      {/* Capa: picker com 2 tabs (biblioteca + manual) */}
      <div>
        <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Capa do beat <span style={{ color: 'var(--led-error)' }}>*</span>
        </label>
        <CoverPicker
          manualFile={coverFile}
          selectedCoverId={selectedCoverId}
          onPickFile={setCoverFile}
          onPickLibrary={setSelectedCoverId}
          disabled={uploading}
        />
      </div>

      {/* Aviso transitório */}
      {dropAviso && (
        <div
          className="rise flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: '#FCD34D',
          }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {dropAviso}
        </div>
      )}

      {/* Error */}
      {status === 'error' && error && (
        <div className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'rgba(248, 113, 113, 0.08)',
            border: '1px solid rgba(248, 113, 113, 0.25)',
            color: '#FCA5A5',
          }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Submit — momento mágico: gradient + Sparkles */}
      <button
        type="submit"
        disabled={!canSubmit || uploading}
        className="btn-primary group justify-center disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          padding: '12px 20px',
          fontSize: 14,
        }}
      >
        <Sparkles size={15} strokeWidth={2} />
        {uploading ? 'Enviando…' : 'Gerar com IA'}
        {!uploading && (
          <ArrowRight
            size={14}
            strokeWidth={2.4}
            className="transition group-hover:translate-x-0.5"
          />
        )}
      </button>

    </form>
  )
}
