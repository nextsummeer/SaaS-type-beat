'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Music, Loader2, AlertCircle, Calendar, Trash2, Check } from 'lucide-react'
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
  cor: string
  isLoading?: boolean
}

export function estadoVisual(beat: BeatListItem): EstadoVisual {
  if (beat.status === 'failed')
    return { label: 'Falhou', cor: 'bg-red-500/10 text-red-400 border-red-500/30' }
  if (beat.post_status === 'published')
    return { label: 'Postado', cor: 'bg-green-500/10 text-green-400 border-green-500/30' }
  if (beat.post_status === 'scheduled') {
    if (beat.scheduled_at && new Date(beat.scheduled_at) <= new Date())
      return { label: 'Postado', cor: 'bg-green-500/10 text-green-400 border-green-500/30' }
    return { label: 'Agendado', cor: 'bg-blue-500/10 text-blue-400 border-blue-500/30' }
  }
  if (beat.status === 'ready_for_review')
    return { label: 'Rascunho', cor: 'bg-violet-500/10 text-violet-300 border-violet-500/30' }
  return { label: 'Processando', cor: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40', isLoading: true }
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
      className={`group relative flex cursor-pointer flex-col overflow-hidden transition`}
      style={{
        background: 'var(--bg-surface)',
        border: selecionado
          ? '1px solid var(--accent)'
          : '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: selecionado ? '0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent)' : 'none',
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
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/30 to-transparent">
            <span className="text-3xl font-bold" style={{ color: 'var(--text-subtle)' }}>{inicial}</span>
          </div>
        )}

        {modoSelecao && selecionado && (
          <div className="absolute inset-0 bg-violet-600/15" />
        )}

        {modoSelecao && (
          <div
            className={`absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
              selecionado ? 'border-violet-400 bg-violet-600 text-white' : 'border-white/50 bg-black/40 backdrop-blur-sm'
            }`}
          >
            {selecionado && <Check className="h-3 w-3" strokeWidth={3} />}
          </div>
        )}

        {!modoSelecao && (
          <button
            type="button"
            onClick={handleDeleteClick}
            title="Deletar beat"
            className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-300 opacity-0 backdrop-blur-sm transition hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}

        <div className={`absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${estado.cor}`}>
          {estado.isLoading && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
          {beat.status === 'failed' && <AlertCircle className="h-2.5 w-2.5" />}
          {estado.label}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug" style={{ color: 'var(--text-primary)' }} title={titulo}>
          {titulo}
        </h3>
        <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <Music className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {beat.artista_nome ?? 'sem artista'}
            {beat.bpm ? ` · ${beat.bpm}` : ''}
            {beat.music_key ? ` · ${beat.music_key}` : ''}
          </span>
        </div>
        <div className="mt-auto flex items-center gap-1 pt-2 text-[10px]" style={{ color: 'var(--text-subtle)', borderTop: '1px solid var(--border-muted)' }}>
          <Calendar className="h-2.5 w-2.5" />
          <span className="truncate">{formataData(beat.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
