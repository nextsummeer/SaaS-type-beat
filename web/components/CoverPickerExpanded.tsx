'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { X, Check } from 'lucide-react'
import type { CoverLibraryItem } from '@/lib/api'
import {
  CoverFilterBar,
  EMPTY_COVER_FILTERS,
  applyCoverFilters,
  type CoverFilters,
} from './CoverFilterBar'

interface Props {
  open: boolean
  /** Lista TOTAL da biblioteca do user (ready only). */
  covers: CoverLibraryItem[]
  /** ID atualmente selecionado (pra destacar no grid). */
  selectedCoverId: string | null
  onSelect: (cover: CoverLibraryItem) => void
  onClose: () => void
}

/**
 * Modal expansivel (NAO fullscreen) pra escolher 1 capa da biblioteca
 * no fluxo de /upload. Header com filtros + grid scrollavel com TODAS
 * as capas filtradas. Click numa capa SELECIONA e fecha o modal.
 *
 * Diferente do CapaModal (que mostra detalhes de 1 capa), este e
 * picker -- foco em escolher, nao em ver/editar.
 *
 * z-index: [70] (acima da page, abaixo de CapaModal expandido).
 */
export function CoverPickerExpanded({
  open,
  covers,
  selectedCoverId,
  onSelect,
  onClose,
}: Props) {
  const mouseDownOnBackdropRef = useRef(false)
  const gridScrollRef = useRef<HTMLDivElement | null>(null)
  const [filters, setFilters] = useState<CoverFilters>(EMPTY_COVER_FILTERS)

  // Esc fecha
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll quando aberto
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Reseta o scroll do grid pra 0 quando o modal abre OU quando filtros
  // mudam. Aplica em 3 momentos (defesa em profundidade): imediato no
  // commit, no proximo frame apos paint, e via setTimeout(50ms) como
  // fallback caso o layout assincrono (imagens carregando, etc) mude
  // a posicao depois.
  useEffect(() => {
    if (!open) return
    function reset() {
      const grid = gridScrollRef.current
      if (grid) grid.scrollTop = 0
    }
    reset()
    const raf = requestAnimationFrame(reset)
    const timeout = setTimeout(reset, 50)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timeout)
    }
  }, [open, filters])

  const filteredCovers = useMemo(
    () => applyCoverFilters(covers, filters),
    [covers, filters],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-6 pb-4 sm:px-6 sm:pt-8 sm:pb-6"
      style={{
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(10px)',
      }}
      onMouseDown={(e) => {
        mouseDownOnBackdropRef.current = e.target === e.currentTarget
      }}
      onMouseUp={(e) => {
        if (mouseDownOnBackdropRef.current && e.target === e.currentTarget) {
          onClose()
        }
        mouseDownOnBackdropRef.current = false
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Escolher capa da biblioteca"
        className="relative flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium, var(--border-subtle))',
          boxShadow: 'var(--shadow-lg, 0 24px 64px rgba(0,0,0,0.5))',
          // Encostado no topo (items-start no overlay), usa quase toda
          // viewport disponivel. Em qualquer altura de tela, sempre o
          // mesmo respiro top/bottom = previsivel e premium.
          maxHeight: 'calc(100vh - 3.5rem)',
          minHeight: 'min(540px, calc(100vh - 3.5rem))',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* HEADER -- titulo + contagem + close */}
        <header
          className="shrink-0 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-3">
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  color: 'var(--text-subtle)',
                }}
              >
                Escolher capa
              </span>
              <span
                className="font-mono tabular"
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.10em',
                }}
              >
                {filteredCovers.length}
                {filteredCovers.length !== covers.length && (
                  <span style={{ color: 'var(--text-subtle)' }}>
                    {' '}/ {covers.length}
                  </span>
                )}
              </span>
            </div>

            <span aria-hidden className="flex-1 hairline" />

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors"
              style={{
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Filtros compactos */}
          {covers.length >= 2 && (
            <div className="mt-4">
              <CoverFilterBar
                covers={covers}
                filters={filters}
                onChange={setFilters}
                compact
              />
            </div>
          )}
        </header>

        {/* GRID scrollavel -- capas selecionaveis */}
        <div ref={gridScrollRef} className="flex-1 overflow-y-auto px-5 py-5">
          {filteredCovers.length === 0 ? (
            <EmptyState
              hasFilters={filters !== EMPTY_COVER_FILTERS}
              onClear={() => setFilters(EMPTY_COVER_FILTERS)}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredCovers.map((cover) => (
                <PickerCard
                  key={cover.id}
                  cover={cover}
                  selected={cover.id === selectedCoverId}
                  onClick={() => {
                    onSelect(cover)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PickerCard -- card individual da grid de selecao (menor que CapaCard)
// ─────────────────────────────────────────────────────────────────────

function PickerCard({
  cover,
  selected,
  onClick,
}: {
  cover: CoverLibraryItem
  selected: boolean
  onClick: () => void
}) {
  const wasUsed = cover.used_in_beats_count > 0
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block overflow-hidden rounded-md transition-all"
      style={{
        background: 'var(--bg-elevated)',
        border: selected
          ? '1.5px solid var(--purple-light)'
          : '1px solid var(--border-subtle)',
        aspectRatio: '1 / 1',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 0 0 3px rgba(199,181,255,0.20), 0 4px 16px rgba(65,0,255,0.15)'
          : 'none',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.borderColor = 'var(--purple-soft)'
      }}
      onMouseLeave={(e) => {
        if (!selected)
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
      }}
    >
      {cover.image_url && (
        <Image
          src={cover.image_url}
          alt="Capa"
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover"
          unoptimized
        />
      )}

      {/* Badge "Usada" no canto inferior esquerdo, sutil */}
      {wasUsed && (
        <span
          className="absolute bottom-1.5 left-1.5 inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono uppercase"
          style={{
            fontSize: 8.5,
            fontWeight: 500,
            letterSpacing: '0.16em',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          Usada
        </span>
      )}

      {/* Check no canto superior direito quando selecionada */}
      {selected && (
        <div
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md"
          style={{
            background: 'var(--purple-light)',
            border: '1.5px solid var(--purple-light)',
          }}
        >
          <Check size={14} strokeWidth={3} style={{ color: '#0A0A0C' }} />
        </div>
      )}
    </button>
  )
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean
  onClear: () => void
}) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <p
        className="font-mono uppercase mb-2"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.22em',
          color: 'var(--text-subtle)',
        }}
      >
        Nenhuma capa
      </p>
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: 'var(--text-muted)', maxWidth: 360 }}
      >
        {hasFilters
          ? 'Os filtros aplicados não bateram com nenhuma capa.'
          : 'Sua biblioteca está vazia. Gere capas em /capas primeiro.'}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-md border px-3.5 py-1.5 font-mono uppercase transition-colors"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-medium, var(--border-subtle))',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}
