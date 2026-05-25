'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { CoverLibraryItem } from '@/lib/api'
import { CapasGrid } from './CapasGrid'

interface Props {
  open: boolean
  covers: CoverLibraryItem[]
  onClose: () => void
  // Handlers propagados pro CapasGrid (mesma assinatura)
  onDownload: (cover: CoverLibraryItem) => void
  onUseInBeat: (cover: CoverLibraryItem) => void
  onDiscard: (cover: CoverLibraryItem) => void
  onExpand: (cover: CoverLibraryItem) => void
  // Selecao multipla (estado global, passado pela page)
  selectionMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (cover: CoverLibraryItem) => void
  onEnterSelectionMode: () => void
  onCancelSelection: () => void
}

type StatusFilter = 'all' | 'available' | 'used'
type RatingFilter = 0 | 1 | 3 | 5
type DateFilter = 'all' | '7d' | '30d' | '90d'

/**
 * Biblioteca completa em modal fullscreen. Aparece quando produtor
 * clica "Ver mais" no grid principal de /capas.
 *
 * Filtros aplicaveis (estado local):
 * - Artista (extraido de brief_used.artista_primario das capas)
 * - Status (todas/disponiveis/usadas-em-beat)
 * - Rating minimo
 * - Data (todas/7d/30d/90d)
 *
 * z-index: [70] -- acima da page, abaixo da floating toolbar do bulk
 * delete (z-[75]) e do CapaModal expandido (z-[80]).
 *
 * Esc fecha. Click backdrop nao fecha (e' fullscreen, nao tem backdrop).
 */
export function CapasFullLibrary({
  open,
  covers,
  onClose,
  onDownload,
  onUseInBeat,
  onDiscard,
  onExpand,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onEnterSelectionMode,
  onCancelSelection,
}: Props) {
  const [filterArtist, setFilterArtist] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterRating, setFilterRating] = useState<RatingFilter>(0)
  const [filterDate, setFilterDate] = useState<DateFilter>('all')

  // Esc fecha
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Lista de artistas unicos extraida das capas (ordenada)
  const uniqueArtists = useMemo(() => {
    const set = new Set<string>()
    for (const c of covers) {
      const name = c.brief_used?.artista_primario ?? c.brief_used?.artista_nome
      if (name) set.add(name)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [covers])

  // Capas filtradas
  const filteredCovers = useMemo(() => {
    const now = Date.now()
    return covers.filter((c) => {
      // Artista
      if (filterArtist) {
        const a = c.brief_used?.artista_primario ?? c.brief_used?.artista_nome
        if (a !== filterArtist) return false
      }
      // Status
      const used = c.used_in_beats_count > 0
      if (filterStatus === 'available' && used) return false
      if (filterStatus === 'used' && !used) return false
      // Rating
      if (filterRating > 0 && (c.rating ?? 0) < filterRating) return false
      // Data
      if (filterDate !== 'all') {
        const days = filterDate === '7d' ? 7 : filterDate === '30d' ? 30 : 90
        const created = new Date(c.created_at).getTime()
        if (now - created > days * 24 * 60 * 60 * 1000) return false
      }
      return true
    })
  }, [covers, filterArtist, filterStatus, filterRating, filterDate])

  const hasActiveFilters =
    filterArtist !== null ||
    filterStatus !== 'all' ||
    filterRating !== 0 ||
    filterDate !== 'all'

  const handleClearFilters = () => {
    setFilterArtist(null)
    setFilterStatus('all')
    setFilterRating(0)
    setFilterDate('all')
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ background: 'var(--bg-canvas, #08080A)' }}
    >
      {/* HEADER -- title + count + selecionar + close */}
      <header
        className="shrink-0 px-6 py-5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-3">
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                color: 'var(--text-subtle)',
              }}
            >
              Biblioteca completa
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
              {hasActiveFilters && (
                <span style={{ color: 'var(--text-subtle)' }}>
                  {' '}/ {covers.length}
                </span>
              )}
            </span>
          </div>

          <span aria-hidden className="flex-1 hairline" />

          {covers.length > 0 && (
            <button
              type="button"
              onClick={
                selectionMode ? onCancelSelection : onEnterSelectionMode
              }
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono uppercase transition-colors"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.18em',
                color: 'var(--text-primary)',
                border: '1px solid',
                borderColor: selectionMode
                  ? 'var(--border-purple)'
                  : 'var(--border-medium, var(--border-subtle))',
                background: selectionMode
                  ? 'rgba(199,181,255,0.08)'
                  : 'rgba(255,255,255,0.03)',
              }}
              onMouseEnter={(e) => {
                if (!selectionMode) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.borderColor = 'var(--border-purple)'
                }
              }}
              onMouseLeave={(e) => {
                if (!selectionMode) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.borderColor =
                    'var(--border-medium, var(--border-subtle))'
                }
              }}
            >
              {selectionMode ? 'Cancelar' : 'Selecionar'}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar biblioteca"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors"
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
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* FILTROS -- pills clicaveis horizontais */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          {/* Artista */}
          {uniqueArtists.length > 0 && (
            <FilterGroup
              label="Artista"
              options={[
                { value: null, label: 'Todos' },
                ...uniqueArtists.map((a) => ({ value: a, label: a })),
              ]}
              value={filterArtist}
              onChange={setFilterArtist}
            />
          )}

          {/* Status */}
          <FilterGroup
            label="Status"
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'available', label: 'Disponíveis' },
              { value: 'used', label: 'Usadas em beat' },
            ]}
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as StatusFilter)}
          />

          {/* Rating */}
          <FilterGroup
            label="Rating"
            options={[
              { value: 0, label: 'Todas' },
              { value: 1, label: '★ 1+' },
              { value: 3, label: '★ 3+' },
              { value: 5, label: '★ 5' },
            ]}
            value={filterRating}
            onChange={(v) => setFilterRating(v as RatingFilter)}
          />

          {/* Data */}
          <FilterGroup
            label="Data"
            options={[
              { value: 'all', label: 'Todas' },
              { value: '7d', label: '7 dias' },
              { value: '30d', label: '30 dias' },
              { value: '90d', label: '90 dias' },
            ]}
            value={filterDate}
            onChange={(v) => setFilterDate(v as DateFilter)}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="ml-auto font-mono uppercase transition-colors"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                color: 'var(--purple-soft)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = 'var(--purple-light)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = 'var(--purple-soft)')
              }
            >
              Limpar filtros
            </button>
          )}
        </div>
      </header>

      {/* GRID scrollavel */}
      <div className="flex-1 overflow-y-auto px-6 py-7">
        {filteredCovers.length === 0 ? (
          <EmptyState hasActiveFilters={hasActiveFilters} onClear={handleClearFilters} />
        ) : (
          <CapasGrid
            covers={filteredCovers}
            loading={false}
            onDownload={onDownload}
            onUseInBeat={onUseInBeat}
            onDiscard={onDiscard}
            onExpand={onExpand}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// FilterGroup -- label + pills clicaveis horizontal
// ─────────────────────────────────────────────────────────────────────

interface FilterOption<T> {
  value: T
  label: string
}

interface FilterGroupProps<T> {
  label: string
  options: FilterOption<T>[]
  value: T
  onChange: (v: T) => void
}

function FilterGroup<T extends string | number | null>({
  label,
  options,
  value,
  onChange,
}: FilterGroupProps<T>) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="font-mono uppercase shrink-0"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.22em',
          color: 'var(--text-subtle)',
        }}
      >
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((opt, i) => {
          const active = opt.value === value
          return (
            <button
              key={`${label}-${i}`}
              type="button"
              onClick={() => onChange(opt.value)}
              className="rounded-md px-2.5 py-1 transition-colors"
              style={{
                fontSize: 11.5,
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: active
                  ? 'var(--border-purple)'
                  : 'transparent',
                background: active
                  ? 'rgba(199,181,255,0.08)'
                  : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// EmptyState (quando filtros nao casam com nenhuma capa)
// ─────────────────────────────────────────────────────────────────────

function EmptyState({
  hasActiveFilters,
  onClear,
}: {
  hasActiveFilters: boolean
  onClear: () => void
}) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center px-6 text-center">
      <p
        className="font-mono uppercase mb-2"
        style={{
          fontSize: 10.5,
          letterSpacing: '0.22em',
          color: 'var(--text-subtle)',
        }}
      >
        Nenhuma capa encontrada
      </p>
      <p
        className="text-[13.5px] leading-relaxed"
        style={{ color: 'var(--text-muted)', maxWidth: 380 }}
      >
        {hasActiveFilters
          ? 'Os filtros aplicados não bateram com nenhuma capa.'
          : 'Sua biblioteca está vazia. Gere capas usando os botões no header.'}
      </p>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-md border px-4 py-2 font-mono uppercase transition-colors"
          style={{
            fontSize: 10.5,
            letterSpacing: '0.18em',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-medium, var(--border-subtle))',
            background: 'rgba(255,255,255,0.03)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-purple)'
            e.currentTarget.style.background = 'rgba(199,181,255,0.06)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor =
              'var(--border-medium, var(--border-subtle))'
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
          }}
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}
