'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { estadoVisual } from '@/components/BeatCard'
import { ehPublicadoEfetivo, ehDeletadoYoutube, podeReagendarLivremente } from '@/lib/agenda'
import type { BeatListItem } from '@/lib/api'

interface BeatChipProps {
  beat: BeatListItem
  onClick?: () => void
}

/** Chip arrastavel exibido dentro de uma celula do calendario. */
export function BeatChip({ beat, onClick }: BeatChipProps) {
  const estado = estadoVisual(beat)
  const removido = ehDeletadoYoutube(beat)
  const publicado = ehPublicadoEfetivo(beat)
  const noYoutube = !!beat.youtube_video_id
  // Drag permitido apenas pra beats que ainda nao foram pro YouTube — assim
  // a atualizacao e DB-only e nao precisa de scope OAuth full.
  const desabilitado = removido || !podeReagendarLivremente(beat)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `beat-${beat.id}`,
    data: { beat },
    disabled: desabilitado,
  })

  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!beat.cover_path) return
    let cancelado = false
    const supabase = createClient()
    supabase.storage
      .from('covers')
      .createSignedUrl(beat.cover_path, 3600)
      .then(({ data }) => {
        if (!cancelado && data?.signedUrl) setCoverUrl(data.signedUrl)
      })
    return () => {
      cancelado = true
    }
  }, [beat.cover_path])

  const tituloTooltip = publicado
    ? `${beat.titulo ?? 'Beat'} · Publicado · edite pelo YouTube Studio`
    : noYoutube
      ? `${beat.titulo ?? 'Beat'} · Já no YouTube · edite pelo YouTube Studio`
      : removido
        ? `${beat.titulo ?? 'Beat'} · Removido do YouTube`
        : `${beat.titulo ?? 'Aguardando IA'} · ${estado.label} · arraste para reagendar`

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : desabilitado ? 0.72 : 1,
    cursor: desabilitado ? 'pointer' : isDragging ? 'grabbing' : 'grab',
    background: noYoutube ? 'var(--bg-surface)' : 'var(--bg-elevated)',
    border: `1px ${noYoutube ? 'dashed' : 'solid'} var(--border)`,
    borderRadius: 6,
    padding: '4px 6px 4px 4px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1.1,
    width: '100%',
    color: 'var(--text-secondary)',
    transition: 'background 0.15s ease, border-color 0.15s ease',
    touchAction: 'none',
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      onClick={(e) => {
        if (isDragging) return
        e.stopPropagation()
        onClick?.()
      }}
      onMouseEnter={(e) => {
        if (desabilitado) {
          e.currentTarget.style.borderColor = 'var(--border-strong)'
          return
        }
        e.currentTarget.style.borderColor = 'var(--border-strong)'
        e.currentTarget.style.background = 'var(--bg-overlay)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        if (!desabilitado) e.currentTarget.style.background = 'var(--bg-elevated)'
      }}
      title={tituloTooltip}
      {...listeners}
      {...attributes}
    >
      {/* Thumb */}
      <span
        className="relative shrink-0 overflow-hidden"
        style={{
          width: 18,
          height: 18,
          borderRadius: 3,
          background: 'var(--bg-overlay)',
        }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            style={beat.youtube_deleted_at ? { filter: 'grayscale(1) opacity(0.5)' } : undefined}
          />
        ) : null}
      </span>

      {/* Titulo */}
      <span
        className="line-clamp-1 min-w-0 flex-1 text-left"
        style={{
          color: noYoutube ? 'var(--text-secondary)' : 'var(--text-primary)',
        }}
      >
        {beat.titulo ?? 'Aguardando IA'}
      </span>

      {/* Cadeado em beats que ja foram pro YouTube (deixa claro que e read-only) */}
      {noYoutube && (
        <Lock
          size={9}
          strokeWidth={2.4}
          className="shrink-0"
          style={{ color: 'var(--text-subtle)' }}
          aria-hidden
        />
      )}

      {/* LED de status */}
      <span
        className="led shrink-0"
        style={{ color: estado.cor, width: 5, height: 5 }}
        aria-label={estado.label}
      />
    </button>
  )
}

/** Chip "fantasma" usado pelo DragOverlay (sem listeners, com glow). */
export function BeatChipOverlay({ beat }: { beat: BeatListItem }) {
  const estado = estadoVisual(beat)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!beat.cover_path) return
    let cancelado = false
    const supabase = createClient()
    supabase.storage
      .from('covers')
      .createSignedUrl(beat.cover_path, 3600)
      .then(({ data }) => {
        if (!cancelado && data?.signedUrl) setCoverUrl(data.signedUrl)
      })
    return () => {
      cancelado = true
    }
  }, [beat.cover_path])

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--accent-line)',
        borderRadius: 6,
        padding: '4px 6px 4px 4px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.1,
        minWidth: 140,
        maxWidth: 220,
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-glow-accent), 0 8px 24px rgba(0,0,0,0.6)',
        transform: 'rotate(-1.5deg) scale(1.05)',
        cursor: 'grabbing',
      }}
    >
      <span
        className="relative shrink-0 overflow-hidden"
        style={{ width: 18, height: 18, borderRadius: 3, background: 'var(--bg-overlay)' }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : null}
      </span>
      <span className="line-clamp-1 min-w-0 flex-1 text-left">
        {beat.titulo ?? 'Aguardando IA'}
      </span>
      <span className="led shrink-0" style={{ color: estado.cor, width: 5, height: 5 }} />
    </div>
  )
}
