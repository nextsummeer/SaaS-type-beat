'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Trash2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { BeatListItem } from '@/lib/api'

interface Props {
  beat: BeatListItem
  modoSelecao: boolean
  selecionado: boolean
  onToggleSelecionado: (id: string) => void
  onPedirDelete: (beat: BeatListItem) => void
}

export type EstadoVisual = {
  label: string
  cor: string          /* token CSS pro LED (color) */
  isLoading?: boolean
}

export function estadoVisual(beat: BeatListItem): EstadoVisual {
  if (beat.status === 'failed')
    return { label: 'FALHOU', cor: 'var(--led-error)' }
  if (beat.post_status === 'published')
    return { label: 'POSTADO', cor: 'var(--led-success)' }
  if (beat.post_status === 'scheduled') {
    if (beat.scheduled_at && new Date(beat.scheduled_at) <= new Date())
      return { label: 'POSTADO', cor: 'var(--led-success)' }
    return { label: 'AGENDADO', cor: 'var(--led-info)' }
  }
  if (beat.status === 'ready_for_review')
    return { label: 'RASCUNHO', cor: 'var(--led-draft)' }
  return { label: 'PROCESSANDO', cor: 'var(--led-warning)', isLoading: true }
}

export function destino(beat: BeatListItem): string {
  if (
    beat.status === 'ready_for_review' ||
    beat.post_status === 'scheduled' ||
    beat.post_status === 'published'
  ) return `/beats/${beat.id}/review`
  return `/beats/${beat.id}`
}

export function formataData(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
      + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export function useCoverUrl(coverPath: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null)
  const supabase = createClient()
  useEffect(() => {
    let cancelado = false
    async function carrega() {
      if (!coverPath) return
      const { data } = await supabase.storage.from('covers').createSignedUrl(coverPath, 3600)
      if (!cancelado && data?.signedUrl) setUrl(data.signedUrl)
    }
    carrega()
    return () => { cancelado = true }
  }, [coverPath])
  return url
}

export function BeatCard({ beat, modoSelecao, selecionado, onToggleSelecionado, onPedirDelete }: Props) {
  const router = useRouter()
  const coverUrl = useCoverUrl(beat.cover_path)
  const estado = estadoVisual(beat)
  const href = destino(beat)

  const titulo = beat.titulo ?? 'Aguardando IA'
  const inicial = (beat.artista_nome ?? '?').trim().charAt(0).toUpperCase() || '?'

  function handleCardClick() {
    if (modoSelecao) onToggleSelecionado(beat.id)
    else router.push(href)
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    onPedirDelete(beat)
  }

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex cursor-pointer flex-col gap-3 transition-transform"
      style={{
        transition: 'transform 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!selecionado) e.currentTarget.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={(e) => {
        if (!selecionado) e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* COVER — herói */}
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{
          background: 'var(--bg-elevated)',
          borderRadius: 12,
          border: selecionado ? '2px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: selecionado ? '0 0 0 3px var(--accent-muted)' : 'var(--shadow-card)',
        }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={titulo}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay))' }}
          >
            <span
              className="font-display text-5xl font-semibold"
              style={{ color: 'var(--text-subtle)', letterSpacing: '-0.04em' }}
            >
              {inicial}
            </span>
          </div>
        )}

        {/* Overlay seleção */}
        {modoSelecao && selecionado && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'rgba(255,90,31,0.18)' }}
          />
        )}

        {/* Overlay hover sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 100%)' }}
        />

        {/* Checkbox seleção */}
        {modoSelecao && (
          <div
            className="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-md transition"
            style={{
              background: selecionado ? 'var(--accent)' : 'rgba(0,0,0,0.55)',
              border: selecionado ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.35)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
            }}
          >
            {selecionado && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </div>
        )}

        {/* Botão deletar */}
        {!modoSelecao && (
          <button
            type="button"
            onClick={handleDeleteClick}
            title="Deletar beat"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg opacity-0 transition group-hover:opacity-100"
            style={{
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.25)'
              e.currentTarget.style.color = '#fca5a5'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.55)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* INFO — clean abaixo da cover (estilo Splice) */}
      <div className="flex flex-col gap-1 px-0.5">
        <h3
          className="line-clamp-1 text-[14.5px] font-medium leading-tight"
          style={{ color: 'var(--text-primary)' }}
          title={titulo}
        >
          {titulo}
        </h3>
        <p
          className="line-clamp-1 text-[12.5px] leading-tight"
          style={{ color: 'var(--text-muted)' }}
        >
          {beat.artista_nome ?? 'Sem artista'}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {/* Status discreto */}
          <div className="flex min-w-0 items-center gap-1.5">
            {estado.isLoading ? (
              <Loader2 className="h-3 w-3 shrink-0 animate-spin" style={{ color: estado.cor }} />
            ) : beat.status === 'failed' ? (
              <AlertCircle className="h-3 w-3 shrink-0" style={{ color: estado.cor }} />
            ) : (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: estado.cor }}
              />
            )}
            <span
              className="truncate text-[11.5px] font-medium"
              style={{ color: estado.cor }}
            >
              {estado.label.charAt(0) + estado.label.slice(1).toLowerCase()}
            </span>
          </div>

          {/* BPM / Key sutis */}
          {(beat.bpm || beat.music_key) && (
            <span
              className="shrink-0 text-[11px] tabular"
              style={{ color: 'var(--text-subtle)' }}
            >
              {beat.bpm ? `${beat.bpm} BPM` : ''}
              {beat.bpm && beat.music_key ? ' · ' : ''}
              {beat.music_key ?? ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
