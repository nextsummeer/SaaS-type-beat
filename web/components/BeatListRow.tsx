'use client'

import { useRouter } from 'next/navigation'
import { Music, Loader2, AlertCircle, Trash2, Check, ExternalLink } from 'lucide-react'
import type { BeatListItem } from '@/lib/api'
import { estadoVisual, destino, formataData, useCoverUrl } from '@/components/BeatCard'

interface Props {
  beat: BeatListItem
  modoSelecao: boolean
  selecionado: boolean
  onToggleSelecionado: (id: string) => void
  onPedirDelete: (beat: BeatListItem) => void
}

export function BeatListRow({ beat, modoSelecao, selecionado, onToggleSelecionado, onPedirDelete }: Props) {
  const router = useRouter()
  const coverUrl = useCoverUrl(beat.cover_path)
  const estado = estadoVisual(beat)
  const href = destino(beat)

  const titulo = beat.titulo ?? '[Aguardando IA]'
  const inicial = (beat.artista_nome ?? '?').trim().charAt(0).toUpperCase() || '?'

  function handleRowClick() {
    if (modoSelecao) onToggleSelecionado(beat.id)
    else router.push(href)
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    onPedirDelete(beat)
  }

  return (
    <div
      onClick={handleRowClick}
      className="group flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors"
      style={{
        background: selecionado ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
        borderBottom: '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => {
        if (!selecionado) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
      }}
      onMouseLeave={(e) => {
        if (!selecionado) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {/* Checkbox / seleção */}
      {modoSelecao && (
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
            selecionado ? 'border-violet-400 bg-violet-600 text-white' : 'border-zinc-600'
          }`}
        >
          {selecionado && <Check className="h-3 w-3" strokeWidth={3} />}
        </div>
      )}

      {/* Thumbnail */}
      <div
        className="h-12 w-12 shrink-0 overflow-hidden"
        style={{ borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)' }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={titulo} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-sm font-bold" style={{ color: 'var(--text-subtle)' }}>{inicial}</span>
          </div>
        )}
      </div>

      {/* Título + metadados */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{titulo}</p>
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Music className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {beat.artista_nome ?? 'sem artista'}
            {beat.bpm ? ` · ${beat.bpm} BPM` : ''}
            {beat.music_key ? ` · ${beat.music_key}` : ''}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className={`hidden shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium sm:flex ${estado.cor}`}>
        {estado.isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        {beat.status === 'failed' && <AlertCircle className="h-3 w-3" />}
        {estado.label}
      </div>

      {/* Data */}
      <div className="hidden shrink-0 text-xs lg:block" style={{ color: 'var(--text-subtle)' }}>
        {formataData(beat.created_at)}
      </div>

      {/* Ações */}
      <div className="flex shrink-0 items-center gap-1">
        {!modoSelecao && (
          <>
            <button
              type="button"
              onClick={handleDeleteClick}
              title="Deletar"
              className="flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition group-hover:opacity-100"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); router.push(href) }}
              className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium opacity-0 transition group-hover:opacity-100"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
            >
              <ExternalLink className="h-3 w-3" />
              Abrir
            </button>
          </>
        )}
      </div>
    </div>
  )
}
