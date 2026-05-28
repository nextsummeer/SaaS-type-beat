'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  CalendarDays,
  Check,
  ChevronDown,
  Mic,
  Star,
} from 'lucide-react'
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
  covers: CoverLibraryItem[]
  filters: CoverFilters
  onChange: (next: CoverFilters) => void
  /** Versao compacta -- usada em modais menores (CoverPickerExpanded). */
  compact?: boolean
  /** Conteudo alinhado a direita na linha dos dropdowns (ex: botao Selecionar). */
  trailing?: React.ReactNode
}

// ─────────────────────────────────────────────────────────────────────
// Cores por categoria (quando filtro esta ativo).
// "Todas/0/all" = neutro (cinza); valores reais = cor tematica.
// ─────────────────────────────────────────────────────────────────────

const COLORS = {
  neutral: 'var(--text-muted)',
  artist: '#C7B5FF', // purple-light
  statusAvailable: '#4ADE80', // green (led-success)
  statusUsed: '#FCD34D', // amber
  rating: '#FBBF24', // gold
  date: '#60A5FA', // blue-400
}

function statusColor(v: CoverStatusFilter) {
  if (v === 'available') return COLORS.statusAvailable
  if (v === 'used') return COLORS.statusUsed
  return COLORS.neutral
}

function ratingColor(v: CoverRatingFilter) {
  return v > 0 ? COLORS.rating : COLORS.neutral
}

function dateColor(v: CoverDateFilter) {
  return v !== 'all' ? COLORS.date : COLORS.neutral
}

// ─────────────────────────────────────────────────────────────────────
// CoverFilterBar -- principal
// ─────────────────────────────────────────────────────────────────────

export function CoverFilterBar({
  covers,
  filters,
  onChange,
  compact = false,
  trailing,
}: Props) {
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
    <div className={compact ? 'space-y-2.5' : 'space-y-3.5'}>
      {/* ARTISTA -- bloco proprio com pills horizontais */}
      {uniqueArtists.length > 0 && (
        <ArtistPills
          icon={Mic}
          label="Artista"
          options={[
            { value: null, label: 'Todos' },
            ...uniqueArtists.map((a) => ({ value: a, label: a })),
          ]}
          value={filters.artist}
          onChange={(v) => onChange({ ...filters, artist: v })}
          activeColor={filters.artist !== null ? COLORS.artist : COLORS.neutral}
          compact={compact}
        />
      )}

      {/* STATUS + RATING + DATA -- 3 dropdowns em linha */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown
          icon={Activity}
          label="Status"
          activeColor={statusColor(filters.status)}
          value={filters.status}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'available', label: 'Disponíveis' },
            { value: 'used', label: 'Usadas em beat' },
          ]}
          onChange={(v) => onChange({ ...filters, status: v as CoverStatusFilter })}
          compact={compact}
          displayLabelFor={(v) =>
            v === 'available' ? 'Disponíveis' : v === 'used' ? 'Usadas' : 'Todas'
          }
        />
        <FilterDropdown
          icon={Star}
          label="Rating"
          activeColor={ratingColor(filters.rating)}
          value={filters.rating}
          options={[
            { value: 0, label: 'Todas' },
            { value: 1, label: '★ 1 ou mais' },
            { value: 3, label: '★ 3 ou mais' },
            { value: 5, label: '★ 5 (favoritas)' },
          ]}
          onChange={(v) => onChange({ ...filters, rating: v as CoverRatingFilter })}
          compact={compact}
          displayLabelFor={(v) =>
            v === 0 ? 'Todas' : v === 5 ? '★ 5' : `★ ${v}+`
          }
        />
        <FilterDropdown
          icon={CalendarDays}
          label="Data"
          activeColor={dateColor(filters.date)}
          value={filters.date}
          options={[
            { value: 'all', label: 'Todas' },
            { value: '7d', label: 'Últimos 7 dias' },
            { value: '30d', label: 'Últimos 30 dias' },
            { value: '90d', label: 'Últimos 90 dias' },
          ]}
          onChange={(v) => onChange({ ...filters, date: v as CoverDateFilter })}
          compact={compact}
          displayLabelFor={(v) =>
            v === 'all'
              ? 'Todas'
              : v === '7d'
                ? '7 dias'
                : v === '30d'
                  ? '30 dias'
                  : '90 dias'
          }
        />
        {(hasActiveFilters || trailing) && (
          <div className="ml-auto flex items-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClear}
                className="font-mono uppercase transition-colors"
                style={{
                  fontSize: compact ? 9.5 : 10,
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
                Limpar
              </button>
            )}
            {trailing}
          </div>
        )}
      </div>
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
// ArtistPills -- bloco do filtro Artista (pills horizontais)
// Layout estavel (sem shift): fontWeight 500 sempre, padding fixo,
// border sempre presente (transparent quando inativo).
// ─────────────────────────────────────────────────────────────────────

interface PillOption {
  value: string | null
  label: string
}

interface ArtistPillsProps {
  icon: typeof Mic
  label: string
  options: PillOption[]
  value: string | null
  onChange: (v: string | null) => void
  activeColor: string
  compact: boolean
}

function ArtistPills({
  icon: Icon,
  label,
  options,
  value,
  onChange,
  activeColor,
  compact,
}: ArtistPillsProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon
          size={compact ? 11 : 12}
          strokeWidth={2}
          style={{ color: 'var(--text-subtle)' }}
        />
        <span
          className="font-mono uppercase"
          style={{
            fontSize: compact ? 9.5 : 10,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          {label}
        </span>
        <span aria-hidden className="flex-1 hairline" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((opt) => {
          const active = opt.value === value
          const isAllOption = opt.value === null
          return (
            <button
              key={opt.value ?? '__all__'}
              type="button"
              onClick={() => onChange(opt.value)}
              className="rounded-md transition-colors"
              style={{
                fontSize: compact ? 11 : 11.5,
                padding: compact ? '3px 9px' : '4px 11px',
                // CRITICAL: fontWeight sempre 500 -- nao muda entre estados
                // (era o que causava layout shift na versao anterior)
                fontWeight: 500,
                color: active
                  ? isAllOption
                    ? 'var(--text-primary)'
                    : activeColor
                  : 'var(--text-muted)',
                border: '1px solid',
                borderColor: active
                  ? isAllOption
                    ? 'var(--border-purple)'
                    : activeColor
                  : 'transparent',
                background: active
                  ? isAllOption
                    ? 'rgba(199,181,255,0.08)'
                    : `${activeColor}15` // 8% opacity hex
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
// FilterDropdown -- trigger + popover menu (usado em Status/Rating/Data)
// ─────────────────────────────────────────────────────────────────────

interface FilterDropdownProps<T> {
  icon: typeof Activity
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  activeColor: string
  /** Como mostrar o valor atual no trigger (formato curto, ex "★ 3+"). */
  displayLabelFor: (v: T) => string
  compact?: boolean
}

function FilterDropdown<T extends string | number>({
  icon: Icon,
  label,
  options,
  value,
  onChange,
  activeColor,
  displayLabelFor,
  compact = false,
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click outside fecha
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isActive = activeColor !== COLORS.neutral
  const triggerHeight = compact ? 28 : 30

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md transition-colors"
        style={{
          height: triggerHeight,
          padding: compact ? '0 9px' : '0 11px',
          fontSize: compact ? 11 : 11.5,
          fontWeight: 500,
          color: isActive ? activeColor : 'var(--text-muted)',
          border: '1px solid',
          borderColor: isActive ? activeColor : 'var(--border-subtle)',
          background: isActive
            ? `${activeColor}10`
            : 'rgba(255,255,255,0.02)',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            e.currentTarget.style.borderColor = 'var(--border-medium, var(--border-subtle))'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }
        }}
      >
        <Icon
          size={compact ? 11 : 12}
          strokeWidth={2.2}
          style={{ color: isActive ? activeColor : 'var(--text-subtle)' }}
        />
        <span
          className="font-mono uppercase"
          style={{
            fontSize: compact ? 9 : 9.5,
            letterSpacing: '0.18em',
            color: 'var(--text-subtle)',
          }}
        >
          {label}
        </span>
        <span style={{ color: 'inherit' }}>{displayLabelFor(value)}</span>
        <ChevronDown
          size={compact ? 11 : 12}
          strokeWidth={2}
          style={{
            color: isActive ? activeColor : 'var(--text-subtle)',
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-1 min-w-[180px] overflow-hidden rounded-lg"
          style={{
            top: triggerHeight,
            background: 'var(--bg-overlay, var(--bg-elevated))',
            border: '1px solid var(--border-medium, var(--border-subtle))',
            boxShadow: 'var(--shadow-lg, 0 12px 32px rgba(0,0,0,0.5))',
          }}
        >
          {options.map((opt) => {
            const selected = opt.value === value
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-3 transition-colors"
                style={{
                  padding: '8px 12px',
                  fontSize: 12.5,
                  color: selected
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                  background: selected
                    ? `${activeColor}10`
                    : 'transparent',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!selected) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selected) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span>{opt.label}</span>
                {selected && (
                  <Check size={13} strokeWidth={2.5} style={{ color: activeColor }} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
