'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { FileEdit, Upload, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { BeatListItem } from '@/lib/api'

interface RascunhosPendentesListProps {
  drafts: BeatListItem[]
}

/**
 * Lista compacta de rascunhos prontos pra agendar. Sempre visível (empty state
 * amigável quando não há nada). Cada item é arrastável; ao soltar num dia do
 * calendário, o /agenda redireciona pra /review com a data pré-marcada via URL.
 */
export function RascunhosPendentesList({ drafts }: RascunhosPendentesListProps) {
  return (
    <section
      className="rise rise-2 overflow-hidden rounded-2xl transition-colors"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: '14px 22px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <FileEdit size={13} strokeWidth={1.75} style={{ color: 'var(--purple-soft)' }} />
          <p
            className="font-mono uppercase"
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: '0.22em',
              color: 'var(--text-secondary)',
            }}
          >
            Rascunhos prontos pra agendar
          </p>
          {drafts.length > 0 && (
            <span
              className="font-mono tabular"
              style={{
                fontSize: 10.5,
                color: 'var(--purple-soft)',
                background: 'rgba(199, 181, 255, 0.10)',
                border: '1px solid rgba(199, 181, 255, 0.25)',
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              {drafts.length}
            </span>
          )}
        </div>
        {drafts.length > 0 && (
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              color: 'var(--text-muted)',
            }}
          >
            Arraste pra um dia
          </span>
        )}
      </div>

      {drafts.length === 0 ? (
        <EmptyState />
      ) : (
        <ul style={{ padding: '6px 0' }}>
          {drafts.map((beat) => (
            <RascunhoItem key={beat.id} beat={beat} />
          ))}
        </ul>
      )}
    </section>
  )
}

function RascunhoItem({ beat }: { beat: BeatListItem }) {
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

  // Drag: identifica como rascunho via data.isRascunho — agenda/page.tsx
  // intercepta e redireciona pra /review?agendar_em=...
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `rascunho-${beat.id}`,
    data: { beat, isRascunho: true },
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
  }

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className="group flex items-center gap-3 transition-colors"
        style={{ padding: '10px 22px' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(199, 181, 255, 0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
        {...listeners}
        {...attributes}
      >
        {/* Thumb */}
        <span
          className="relative shrink-0 overflow-hidden"
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : null}
        </span>

        {/* Título + artista */}
        <div className="min-w-0 flex-1">
          <p
            className="line-clamp-1 text-[13.5px] font-medium leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {beat.titulo ?? 'Aguardando IA'}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="line-clamp-1 text-[11.5px] leading-tight"
              style={{ color: 'var(--text-muted)' }}
            >
              {beat.artista_nome ?? 'Sem artista'}
            </span>
            {(beat.bpm || beat.music_key) && (
              <>
                <span style={{ fontSize: 10, color: 'var(--text-subtle)' }}>·</span>
                <span
                  className="font-mono tabular"
                  style={{ fontSize: 10.5, color: 'var(--text-muted)' }}
                >
                  {beat.bpm ? `${beat.bpm} BPM` : ''}
                  {beat.bpm && beat.music_key ? ' · ' : ''}
                  {beat.music_key ?? ''}
                </span>
              </>
            )}
          </div>
        </div>

        {/* CTA "Revisar" — atalho direto pra quem não quer arrastar */}
        <Link
          href={`/beats/${beat.id}/review`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex shrink-0 items-center gap-1 font-mono uppercase transition-colors"
          style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            color: 'var(--purple-soft)',
            padding: '4px 10px',
            borderRadius: 999,
            border: '1px solid rgba(199, 181, 255, 0.30)',
            background: 'rgba(199, 181, 255, 0.06)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(199, 181, 255, 0.14)'
            e.currentTarget.style.borderColor = 'rgba(199, 181, 255, 0.50)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(199, 181, 255, 0.06)'
            e.currentTarget.style.borderColor = 'rgba(199, 181, 255, 0.30)'
          }}
        >
          Revisar
          <ArrowRight size={11} strokeWidth={2.2} />
        </Link>
      </div>
    </li>
  )
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center gap-3 text-center"
      style={{ padding: '32px 20px' }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <FileEdit size={16} strokeWidth={1.6} />
      </div>
      <div className="flex flex-col gap-1">
        <p style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500 }}>
          Nenhum rascunho aguardando.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 360 }}>
          Quando você subir um beat e a IA terminar de gerar, ele aparece aqui
          pronto pra você arrastar pro dia que quiser publicar.
        </p>
      </div>
      <Link
        href="/upload"
        className="font-mono uppercase transition-colors"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--text-secondary)',
          marginTop: 4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          borderBottom: '1px solid var(--border-medium)',
          paddingBottom: 2,
        }}
      >
        <Upload size={11} strokeWidth={2} />
        Subir um beat
      </Link>
    </div>
  )
}
