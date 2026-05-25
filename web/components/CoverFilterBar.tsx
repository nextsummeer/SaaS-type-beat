'use client'

import { useMemo } from 'react'
import type { CoverLibraryItem } from '@/lib/api'

export type CoverStatusFilter = 'all' | 'available' | 'used'
export type CoverRatingFilter = 0 | 1 | 3 | 5
export type CoverDateFilter = 'all' | '7d' | '30d' | '90d'

export interface CoverFilters {
  artist: string | null
  status: CoverStatusFilter
  rating: CoverRatingFilter
  date: CoverDateFilter
}

export const EMPTY_COVER_FILTERS: CoverFilters = {
  artist: null,
  status: 'all',
  rating: 0,
  date: 'all',
}

interface Props {
  /** Lista TOTAL de capas (sem filtro) -- pra extrair artistas unicos. */
  covers: CoverLibraryItem[]
  filters: CoverFilters
  onChange: (next: CoverFilters) => void
  /** Renderizacao compacta -- pills menores, sem labels (pra modais menores). */
  compact?: boolean
}

/**
 * Barra de filtros reutilizavel pra biblioteca de capas.
 * 4 filtros (Artista / Status / Rating / Data) como pills clicaveis.
 *
 * Usado em /capas/page.tsx (inline acima do grid) e em
 * CoverPickerExpanded (header do modal de selecao no /upload).
 */
export function CoverFilterBar({ covers, filters, onChange, compact = false }: Props) {
  // Artistas unicos extraidos dinamicamente das capas
  const uniqueArtists = useMemo(() => {
    const set = new Set<string>()
    for (const c of covers) {
      const name = c.brief_used?.artista_primario ?? c.brief_used?.artista_nome
      if (name) set.add(name)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [covers])

  const hasActiveFilters =
    filters.artist !== null ||
    filters.status !== 'all' ||
    filters.rating !== 0 ||
    filters.date !== 'all'

  const handleClear = () => onChange(EMPTY_COVER_FILTERS)

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-x-4 gap-y-2.5' : 'flex flex-wrap items-center gap-x-5 gap-y-3'}>
      {uniqueArtists.length > 0 && (
        <FilterGroup
          label="Artista"
          compact={compact}
          options={[
            { value: null, label: 'Todos' },
            ...uniqueArtists.map((a) => ({ value: a, label: a })),
          ]}
          value={filters.artist}
          onChange={(v) => onChange({ ...filters, artist: v })}
        />
      )}
      <FilterGroup
        label="Status"
        compact={compact}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'available', label: 'Disponíveis' },
          { value: 'used', label: 'Usadas' },
        ]}
        value={filters.status}
        onChange={(v) => onChange({ ...filters, status: v as CoverStatusFilter })}
      />
      <FilterGroup
        label="Rating"
        compact={compact}
        options={[
          { value: 0, label: 'Todas' },
          { value: 1, label: '★ 1+' },
          { value: 3, label: '★ 3+' },
          { value: 5, label: '★ 5' },
        ]}
        value={filters.rating}
        onChange={(v) => onChange({ ...filters, rating: v as CoverRatingFilter })}
      />
      <FilterGroup
        label="Data"
        compact={compact}
        options={[
          { value: 'all', label: 'Todas' },
          { value: '7d', label: '7 dias' },
          { value: '30d', label: '30 dias' },
          { value: '90d', label: '90 dias' },
        ]}
        value={filters.date}
        onChange={(v) => onChange({ ...filters, date: v as CoverDateFilter })}
      />
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto font-mono uppercase transition-colors"
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--purple-soft)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--purple-light)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--purple-soft)')}
        >
          Limpar
        </button>
      )}
    </div>
  )
}

/**
 * Aplica os filtros sobre uma lista de capas. Funcao pura -- usar em
 * `useMemo` no caller pra evitar re-calculo desnecessario.
 */
export function applyCoverFilters(
  covers: CoverLibraryItem[],
  filters: CoverFilters,
): CoverLibraryItem[] {
  const now = Date.now()
  return covers.filter((c) => {
    if (filters.artist) {
      const a = c.brief_used?.artista_primario ?? c.brief_used?.artista_nome
      if (a !== filters.artist) return false
    }
    const used = c.used_in_beats_count > 0
    if (filters.status === 'available' && used) return false
    if (filters.status === 'used' && !used) return false
    if (filters.rating > 0 && (c.rating ?? 0) < filters.rating) return false
    if (filters.date !== 'all') {
      const days = filters.date === '7d' ? 7 : filters.date === '30d' ? 30 : 90
      const created = new Date(c.created_at).getTime()
      if (now - created > days * 24 * 60 * 60 * 1000) return false
    }
    return true
  })
}

// ─────────────────────────────────────────────────────────────────────
// FilterGroup -- label + pills clicaveis
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
  compact?: boolean
}

function FilterGroup<T extends string | number | null>({
  label,
  options,
  value,
  onChange,
  compact = false,
}: FilterGroupProps<T>) {
  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex items-center gap-2.5'}>
      <span
        className="font-mono uppercase shrink-0"
        style={{
          fontSize: compact ? 9 : 9.5,
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
              className="rounded-md transition-colors"
              style={{
                fontSize: compact ? 11 : 11.5,
                padding: compact ? '3px 8px' : '4px 10px',
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: active ? 'var(--border-purple)' : 'transparent',
                background: active ? 'rgba(199,181,255,0.08)' : 'transparent',
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
