'use client'

import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Trash2, Check, ChevronRight } from 'lucide-react'
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
      className="group relative flex cursor-pointer items-center gap-4 px-4 py-3 transition-colors"
      style={{
        background: selecionado ? 'var(--accent-muted)' : 'transparent',
        borderBottom: '1px solid var(--border-muted)',
      }}
      onMouseEnter={(e) => {
        if (!selecionado) (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
      }}
      onMouseLeave={(e) => {
        if (!selecionado) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {/* Active accent strip */}
      {selecionado && (
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-[2px]"
          style={{ background: 'var(--accent)' }}
        />
      )}

      {/* Checkbox / seleção */}
      {modoSelecao && (
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition"
          style={{
            background: selecionado ? 'var(--accent)' : 'transparent',
            border: selecionado ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
            color: '#fff',
          }}
        >
          {selecionado && <Check className="h-3 w-3" strokeWidth={3} />}
        </div>
      )}

      {/* Thumbnail */}
      <div
        className="relative h-12 w-12 shrink-0 overflow-hidden"
        style={{ borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)' }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={titulo}
            className="h-full w-full object-cover"
            style={beat.youtube_deleted_at ? { filter: 'grayscale(0.8) opacity(0.55)' } : undefined}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay))' }}>
            <span className="font-display text-base font-semibold" style={{ color: 'var(--text-subtle)' }}>{inicial}</span>
          </div>
        )}
      </div>

      {/* Título + artista */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{titulo}</p>
        <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {beat.artista_nome ?? 'sem artista'}
        </p>
      </div>

      {/* BPM / Key — chips técnicos */}
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        {beat.bpm && (
          <span className="chip-tech" style={{ color: 'var(--text-secondary)' }}>
            {beat.bpm} BPM
          </span>
        )}
        {beat.music_key && (
          <span className="chip-tech" style={{ color: 'var(--text-secondary)' }}>
            {beat.music_key}
          </span>
        )}
      </div>

      {/* Status LED */}
      <div
        className="hidden shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 sm:flex"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)' }}
      >
        {estado.isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" style={{ color: estado.cor }} />
        ) : beat.status === 'failed' ? (
          <AlertCircle className="h-3 w-3" style={{ color: estado.cor }} />
        ) : (
          <span className="led" style={{ color: estado.cor }} />
        )}
        <span
          className="font-mono text-[9px] font-medium uppercase tracking-[0.1em]"
          style={{ color: estado.cor }}
        >
          {estado.label}
        </span>
      </div>

      {/* Data */}
      <div
        className="hidden shrink-0 font-mono text-[10px] uppercase tracking-wider lg:block"
        style={{ color: 'var(--text-subtle)' }}
      >
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
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--led-error)'
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <ChevronRight
              className="h-4 w-4 opacity-0 transition group-hover:opacity-100"
              style={{ color: 'var(--text-muted)' }}
            />
          </>
        )}
      </div>
    </div>
  )
}
