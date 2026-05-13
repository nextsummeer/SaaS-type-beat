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

  const titulo = beat.titulo ?? '[Aguardando IA]'
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
      className="group relative flex cursor-pointer flex-col overflow-hidden transition"
      style={{
        background: 'var(--bg-surface)',
        border: selecionado ? '1px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: selecionado ? '0 0 0 2px var(--accent-muted)' : 'var(--shadow-card)',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!selecionado) {
          e.currentTarget.style.borderColor = 'var(--border-strong)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }
      }}
      onMouseLeave={(e) => {
        if (!selecionado) {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square w-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={titulo}
            className={`h-full w-full object-cover transition ${modoSelecao ? '' : 'group-hover:scale-105'}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay))' }}>
            <span
              className="font-display text-4xl font-semibold"
              style={{ color: 'var(--text-subtle)', letterSpacing: '-0.04em' }}
            >
              {inicial}
            </span>
          </div>
        )}

        {/* Overlay de hover discreto */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
          style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.5))' }}
        />

        {modoSelecao && selecionado && (
          <div className="absolute inset-0" style={{ background: 'var(--accent-muted)' }} />
        )}

        {/* Checkbox seleção */}
        {modoSelecao && (
          <div
            className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-md transition"
            style={{
              background: selecionado ? 'var(--accent)' : 'rgba(0,0,0,0.6)',
              border: selecionado ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
            }}
          >
            {selecionado && <Check className="h-3 w-3" strokeWidth={3} />}
          </div>
        )}

        {/* Botão deletar */}
        {!modoSelecao && (
          <button
            type="button"
            onClick={handleDeleteClick}
            title="Deletar beat"
            className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition group-hover:opacity-100"
            style={{
              background: 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.25)'
              e.currentTarget.style.color = '#fca5a5'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.65)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}

        {/* Status LED badge */}
        <div
          className="absolute right-2 top-2 flex items-center gap-1.5 rounded-md px-2 py-1"
          style={{
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {estado.isLoading ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" style={{ color: estado.cor }} />
          ) : beat.status === 'failed' ? (
            <AlertCircle className="h-2.5 w-2.5" style={{ color: estado.cor }} />
          ) : (
            <span className="led" style={{ color: estado.cor }} />
          )}
          <span
            className="font-mono text-[9px] font-medium tracking-[0.1em]"
            style={{ color: estado.cor }}
          >
            {estado.label}
          </span>
        </div>

        {/* BPM/Key floating bottom-left */}
        {(beat.bpm || beat.music_key) && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {beat.bpm && (
              <span
                className="font-mono text-[9px] font-semibold uppercase tracking-wider"
                style={{
                  color: 'rgba(255,255,255,0.95)',
                  background: 'rgba(0,0,0,0.65)',
                  padding: '2px 6px',
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {beat.bpm} BPM
              </span>
            )}
            {beat.music_key && (
              <span
                className="font-mono text-[9px] font-semibold uppercase tracking-wider"
                style={{
                  color: 'rgba(255,255,255,0.95)',
                  background: 'rgba(0,0,0,0.65)',
                  padding: '2px 6px',
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {beat.music_key}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3
          className="line-clamp-2 text-[12px] font-semibold leading-snug"
          style={{ color: 'var(--text-primary)' }}
          title={titulo}
        >
          {titulo}
        </h3>
        <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {beat.artista_nome ?? 'sem artista'}
        </p>
        <div
          className="mt-auto flex items-center justify-between pt-1.5 font-mono text-[9px] uppercase tracking-wider"
          style={{ color: 'var(--text-subtle)', borderTop: '1px solid var(--border-muted)' }}
        >
          <span className="truncate">{formataData(beat.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
