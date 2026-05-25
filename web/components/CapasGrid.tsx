'use client'

import { ImageOff } from 'lucide-react'
import type { CoverLibraryItem } from '@/lib/api'
import { CapaCard } from './CapaCard'

type Props = {
  covers: CoverLibraryItem[]
  loading: boolean
  /** Skeletons "fantasma" temporários (entre click e INSERT real). */
  ghostPendingCount?: number
  onDownload: (cover: CoverLibraryItem) => void
  onUseInBeat: (cover: CoverLibraryItem) => void
  onDiscard: (cover: CoverLibraryItem) => void
  /** Click no card em modo normal abre o modal expandido. */
  onExpand?: (cover: CoverLibraryItem) => void
  /** Modo selecao multipla: cards viram checkbox-clicaveis. */
  selectionMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (cover: CoverLibraryItem) => void
}

/**
 * Grid responsivo da biblioteca de capas.
 * Status pending/ready/failed vem do DB. Ghosts opcionais aparecem
 * imediatamente após o click "Gerar" (feedback instantâneo) e somem
 * assim que o INSERT real chega via Realtime.
 */
export function CapasGrid({
  covers,
  loading,
  ghostPendingCount = 0,
  onDownload,
  onUseInBeat,
  onDiscard,
  onExpand,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: Props) {
  // Estado inicial: loading (sem dados ainda)
  if (loading && covers.length === 0 && ghostPendingCount === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CapaCardSkeleton key={`s-${i}`} numLabel={String(i + 1).padStart(2, '0')} />
        ))}
      </div>
    )
  }

  // Biblioteca vazia (nenhuma row em cover_library) e sem fantasmas
  if (covers.length === 0 && ghostPendingCount === 0) {
    return <EmptyLibrary />
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Skeletons "fantasma" aparecem PRIMEIRO no grid (UX: feedback imediato) */}
      {Array.from({ length: ghostPendingCount }).map((_, i) => (
        <GhostPendingCard key={`ghost-${i}`} index={i} />
      ))}

      {covers.map((cover, index) => (
        <div
          key={cover.id}
          className="rise"
          style={{ animationDelay: `${Math.min(index * 0.04, 0.4)}s` }}
        >
          <CapaCard
            cover={cover}
            index={ghostPendingCount + index}
            onDownload={onDownload}
            onUseInBeat={onUseInBeat}
            onDiscard={onDiscard}
            onExpand={onExpand}
            selectionMode={selectionMode}
            selected={selectedIds?.has(cover.id) ?? false}
            onToggleSelect={onToggleSelect}
          />
        </div>
      ))}
    </div>
  )
}

/** Skeleton "fantasma" — feedback imediato pre-Realtime. Visual igual ao
 * PendingCard real (pulse roxo + label "Gerando"). */
function GhostPendingCard({ index }: { index: number }) {
  const numLabel = String(index + 1).padStart(2, '0')
  return (
    <div
      className="relative overflow-hidden rounded-lg rise"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-purple)',
        aspectRatio: '1 / 1',
      }}
    >
      <div className="absolute inset-0 shimmer" style={{ background: 'var(--bg-elevated)' }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(65,0,255,0.18), transparent 60%)',
        }}
      />

      {/* Mini orb central -- mesma versao escalada do PendingCard real */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[44%] w-[44%] flex items-center justify-center">
          <div
            aria-hidden
            className="absolute inset-0 animate-pulse-slow"
            style={{
              background: 'radial-gradient(circle, rgba(65,0,255,0.55), transparent 62%)',
              filter: 'blur(10px)',
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 68% 38%, rgba(255,26,190,0.45), transparent 58%)',
              filter: 'blur(14px)',
              animation: 'pulse-slow 3.4s ease-in-out infinite',
              animationDelay: '-1.2s',
            }}
          />
          <span
            aria-hidden
            className="absolute"
            style={{
              width: '92%',
              height: '92%',
              borderRadius: '50%',
              border: '1px dashed rgba(199, 181, 255, 0.28)',
              animation: 'rotate-slow 14s linear infinite',
            }}
          />
          <div
            className="relative h-[58%] w-[58%] animate-orb-morph"
            style={{
              background:
                'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, transparent 28%), linear-gradient(135deg, #4100FF 0%, #FF1ABE 100%)',
              boxShadow:
                '0 0 24px rgba(65,0,255,0.55), 0 0 40px rgba(255,26,190,0.32), inset 0 0 14px rgba(255,255,255,0.20), inset -8px -12px 22px rgba(0,0,0,0.34)',
              borderRadius: '50%',
            }}
          >
            <span
              aria-hidden
              className="absolute"
              style={{
                top: '18%',
                left: '22%',
                width: '24%',
                height: '24%',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.75)',
                filter: 'blur(4px)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Label "Gerando" mais visivel */}
      <div
        className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          border: '1px solid var(--border-purple)',
        }}
      >
        <span className="led led-pulse" style={{ color: 'var(--purple-light)' }} />
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.18em',
            color: '#FFFFFF',
          }}
        >
          Gerando
        </span>
      </div>
      <span
        className="pointer-events-none absolute bottom-2.5 left-3 font-mono tabular"
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.18em',
          color: 'var(--text-subtle)',
        }}
      >
        [{numLabel}]
      </span>
    </div>
  )
}

/** Estado de biblioteca vazia mas com brief configurado (pode gerar). */
function EmptyLibrary() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl px-8 py-20 text-center"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <ImageOff size={20} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h3
        className="font-display text-[18px] font-semibold"
        style={{ color: 'var(--text-primary)', letterSpacing: '-0.018em' }}
      >
        Sua biblioteca está vazia
      </h3>
      <p
        className="mt-2 max-w-sm text-[13.5px] leading-relaxed"
        style={{ color: 'var(--text-muted)' }}
      >
        Gere sua primeira capa pra começar — use os botões acima.
      </p>
    </div>
  )
}

/** Skeleton de card individual (apenas pra loading inicial da biblioteca). */
function CapaCardSkeleton({ numLabel }: { numLabel: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        aspectRatio: '1 / 1',
      }}
    >
      <div className="absolute inset-0 shimmer" style={{ background: 'var(--bg-elevated)' }} />
      <span
        className="pointer-events-none absolute bottom-2.5 left-3 font-mono tabular"
        style={{
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.18em',
          color: 'var(--text-subtle)',
        }}
      >
        [{numLabel}]
      </span>
    </div>
  )
}
