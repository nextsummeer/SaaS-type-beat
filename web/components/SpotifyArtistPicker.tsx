'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X, ArrowRight, Loader2, Pencil, Plus, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface SelectedArtist {
  id: string
  name: string
  imageUrl: string | null
  followers: number
  genres: string[]
  custom: boolean
}

interface SpotifyArtistResult {
  id: string
  name: string
  image_url: string | null
  followers: number
  genres: string[]
}

type PickerProps = {
  open: boolean
  onClose: () => void
  onConfirm: (artists: SelectedArtist[]) => void
  initialSelection?: SelectedArtist[]
  maxSelect: number
}

function formatFollowers(n: number): string {
  if (!n) return '0'
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const v = n / 1000
    return `${v.toFixed(v < 10 ? 1 : 0).replace(/\.0$/, '')}K`
  }
  const v = n / 1_000_000
  return `${v.toFixed(v < 10 ? 1 : 0).replace(/\.0$/, '')}M`
}

function initialOf(name: string): string {
  return (name.trim()[0] || '?').toUpperCase()
}

// ─────────────────────────────────────────────────────────────────────────
// MODAL — busca + selecao
// ─────────────────────────────────────────────────────────────────────────

export function SpotifyArtistPicker({
  open,
  onClose,
  onConfirm,
  initialSelection = [],
  maxSelect,
}: PickerProps) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<SpotifyArtistResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<SelectedArtist[]>(initialSelection)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    setSelected(initialSelection)
    setQuery('')
    setDebouncedQuery('')
    setResults([])
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      return
    }
    let cancelled = false
    async function fetchArtists() {
      setLoading(true)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
        const url = `${apiUrl}/artists/search?q=${encodeURIComponent(
          debouncedQuery,
        )}&limit=12`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) throw new Error('search failed')
        const data = await res.json()
        if (!cancelled) setResults(data.items || [])
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchArtists()
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, supabase])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const toggle = useCallback(
    (artist: SpotifyArtistResult) => {
      setSelected((prev) => {
        const idx = prev.findIndex((s) => s.id === artist.id)
        if (idx >= 0) return prev.filter((_, i) => i !== idx)
        if (prev.length >= maxSelect) return prev
        return [
          ...prev,
          {
            id: artist.id,
            name: artist.name,
            imageUrl: artist.image_url,
            followers: artist.followers,
            genres: artist.genres,
            custom: false,
          },
        ]
      })
    },
    [maxSelect],
  )

  const removeSelected = useCallback((id: string) => {
    setSelected((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const selectCustom = useCallback(() => {
    const name = debouncedQuery.trim()
    if (!name) return
    setSelected((prev) => {
      if (prev.length >= maxSelect) return prev
      if (prev.some((s) => s.name.toLowerCase() === name.toLowerCase())) return prev
      return [
        ...prev,
        {
          id: `custom:${name.toLowerCase()}`,
          name,
          imageUrl: null,
          followers: 0,
          genres: [],
          custom: true,
        },
      ]
    })
  }, [debouncedQuery, maxSelect])

  function indexOfSelected(id: string): number {
    return selected.findIndex((s) => s.id === id)
  }

  function handleConfirm() {
    if (selected.length === 0) return
    onConfirm(selected)
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  if (!open) return null

  const fullCustom =
    debouncedQuery.length > 0 &&
    !loading &&
    results.length === 0 &&
    !selected.some((s) => s.name.toLowerCase() === debouncedQuery.toLowerCase())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(10px)',
        animation: 'sap-fade 180ms ease-out',
      }}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar artistas"
    >
      <style>{`
        @keyframes sap-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sap-rise { from { opacity: 0; transform: translateY(8px) scale(0.985) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes sap-stagger { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes sap-shimmer {
          0% { background-position: -200px 0 }
          100% { background-position: 200px 0 }
        }
        .sap-card { animation: sap-stagger 220ms ease-out backwards }
        .sap-scroll::-webkit-scrollbar { width: 6px }
        .sap-scroll::-webkit-scrollbar-track { background: transparent }
        .sap-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px }
        .sap-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14) }
      `}</style>

      <div
        className="relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl"
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          animation: 'sap-rise 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.24em',
                color: 'var(--text-subtle)',
              }}
            >
              /
            </span>
            <h2
              className="font-mono uppercase"
              style={{
                fontSize: 11.5,
                letterSpacing: '0.22em',
                color: 'var(--text-primary)',
                fontWeight: 600,
              }}
            >
              Select Artists
            </h2>
            <span
              className="rounded-md px-2 py-0.5 font-mono uppercase tabular-nums"
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                color: selected.length === maxSelect ? 'var(--accent)' : 'var(--text-muted)',
                background: 'var(--bg-surface)',
                border: `1px solid ${selected.length === maxSelect ? 'var(--border-purple, var(--accent))' : 'var(--border-subtle)'}`,
              }}
            >
              {selected.length} / {maxSelect}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* SEARCH — hairline so embaixo, editorial */}
        <div
          className="relative flex items-center gap-3 px-5"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            paddingTop: 16,
            paddingBottom: 16,
          }}
        >
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="artist name..."
            className="flex-1 bg-transparent font-mono outline-none placeholder:lowercase"
            style={{
              fontSize: 13,
              letterSpacing: '0.04em',
              color: 'var(--text-primary)',
            }}
          />
          {loading && (
            <Loader2
              size={14}
              className="animate-spin"
              style={{ color: 'var(--text-muted)' }}
            />
          )}
        </div>

        {/* LIST */}
        <div
          className="sap-scroll flex-1 overflow-y-auto"
          style={{ minHeight: 280, maxHeight: '55vh' }}
        >
          {/* IDLE — sem query */}
          {!debouncedQuery && results.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <Search
                size={20}
                strokeWidth={1.5}
                style={{ color: 'var(--text-subtle)' }}
              />
              <p
                className="font-mono uppercase"
                style={{
                  fontSize: 10.5,
                  letterSpacing: '0.24em',
                  color: 'var(--text-subtle)',
                }}
              >
                Digite pra buscar artistas no spotify
              </p>
            </div>
          )}

          {/* LOADING — skeleton */}
          {loading && results.length === 0 && (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <div
                    className="w-6 shrink-0 font-mono tabular-nums"
                    style={{ fontSize: 10, color: 'var(--text-subtle)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div
                    className="h-11 w-11 shrink-0 rounded-full"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
                      backgroundSize: '400px 100%',
                      animation: 'sap-shimmer 1.4s linear infinite',
                    }}
                  />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div
                      className="h-3 w-32 rounded"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
                        backgroundSize: '400px 100%',
                        animation: 'sap-shimmer 1.4s linear infinite',
                      }}
                    />
                    <div
                      className="h-2 w-48 rounded"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
                        backgroundSize: '400px 100%',
                        animation: 'sap-shimmer 1.4s linear infinite',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RESULTS */}
          {!loading && results.length > 0 && (
            <div>
              {results.map((artist, idx) => {
                const selIdx = indexOfSelected(artist.id)
                const isSelected = selIdx >= 0
                const orderLabel = isSelected ? String(selIdx + 1).padStart(2, '0') : ''
                return (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => toggle(artist)}
                    disabled={!isSelected && selected.length >= maxSelect}
                    className="sap-card group relative flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: isSelected ? 'var(--bg-surface)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                      borderLeft: isSelected
                        ? '2px solid var(--accent)'
                        : '2px solid transparent',
                      animationDelay: `${Math.min(idx * 28, 240)}ms`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.background = 'var(--bg-surface)'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {/* ORDER SLOT — so aparece quando selecionado */}
                    <div
                      className="w-6 shrink-0 font-mono tabular-nums"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.16em',
                        color: isSelected ? 'var(--accent)' : 'var(--text-subtle)',
                      }}
                    >
                      {orderLabel}
                    </div>

                    {/* AVATAR */}
                    <div
                      className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {artist.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={artist.image_url}
                          alt={artist.name}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center font-mono uppercase"
                          style={{
                            fontSize: 14,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {initialOf(artist.name)}
                        </div>
                      )}
                    </div>

                    {/* INFO */}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span
                        className="truncate"
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {artist.name}
                      </span>
                      {artist.genres.length > 0 && (
                        <span
                          className="mt-0.5 truncate font-mono"
                          style={{
                            fontSize: 10.5,
                            color: 'var(--text-subtle)',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {artist.genres.slice(0, 3).join(' · ')}
                        </span>
                      )}
                    </div>

                    {/* FOLLOWERS */}
                    <div
                      className="shrink-0 text-right font-mono tabular-nums"
                      style={{
                        fontSize: 11.5,
                        letterSpacing: '0.04em',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {formatFollowers(artist.followers)}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* FALLBACK CUSTOM — sem resultados, oferece adicionar como texto livre */}
          {fullCustom && (
            <button
              type="button"
              onClick={selectCustom}
              disabled={selected.length >= maxSelect}
              className="sap-card group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: 'transparent',
                borderBottom: '1px solid var(--border-subtle)',
                borderLeft: '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-surface)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div className="w-6 shrink-0" />
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px dashed var(--border-medium)',
                  color: 'var(--text-muted)',
                }}
              >
                <Plus size={16} strokeWidth={1.75} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className="truncate"
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {debouncedQuery}
                </span>
                <span
                  className="mt-0.5 truncate font-mono uppercase"
                  style={{
                    fontSize: 10,
                    color: 'var(--text-subtle)',
                    letterSpacing: '0.22em',
                  }}
                >
                  Usar como texto livre
                </span>
              </div>
              <div
                className="shrink-0 font-mono uppercase"
                style={{
                  fontSize: 9.5,
                  color: 'var(--text-subtle)',
                  letterSpacing: '0.22em',
                }}
              >
                Custom
              </div>
            </button>
          )}

          {/* SEM RESULTADOS sem fallback (quando ja existe selecionado com mesmo nome) */}
          {!loading &&
            debouncedQuery.length > 0 &&
            results.length === 0 &&
            !fullCustom && (
              <div className="px-6 py-12 text-center">
                <p
                  className="font-mono uppercase"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: '0.22em',
                    color: 'var(--text-subtle)',
                  }}
                >
                  Ja na sua selecao
                </p>
              </div>
            )}
        </div>

        {/* FOOTER */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-3.5"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="font-mono uppercase transition-colors"
            style={{
              fontSize: 10.5,
              letterSpacing: '0.22em',
              color: 'var(--text-muted)',
              padding: '8px 4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.length === 0}
            className="inline-flex items-center gap-2 rounded-lg font-mono uppercase transition-all disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              fontSize: 10.5,
              letterSpacing: '0.22em',
              color: 'var(--bg-base)',
              background: 'var(--text-primary)',
              padding: '10px 16px',
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              if (selected.length > 0)
                e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <Sparkles size={11} strokeWidth={2} />
            Confirm {selected.length || ''}{' '}
            {selected.length === 1 ? 'artist' : 'artists'}
            <ArrowRight size={11} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// DISPLAY — chips/cards no form apos confirmar
// ─────────────────────────────────────────────────────────────────────────

type DisplayProps = {
  artists: SelectedArtist[]
  maxSelect: number
  onEdit: () => void
  onRemove?: (id: string) => void
  disabled?: boolean
  label?: string
}

export function SelectedArtistsDisplay({
  artists,
  maxSelect,
  onEdit,
  onRemove,
  disabled = false,
  label = 'Artistas',
}: DisplayProps) {
  if (artists.length === 0) {
    return (
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-5 py-4 transition-all disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          borderColor: 'var(--border-medium)',
          background: 'var(--bg-base)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-strong)'
          e.currentTarget.style.background = 'var(--bg-surface)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-medium)'
          e.currentTarget.style.background = 'var(--bg-base)'
        }}
      >
        <Plus size={14} style={{ color: 'var(--text-muted)' }} />
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 11,
            letterSpacing: '0.22em',
            color: 'var(--text-muted)',
          }}
        >
          Selecionar artistas
        </span>
      </button>
    )
  }

  return (
    <div
      className="rounded-xl"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="flex items-center justify-between px-3.5 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          / {label}
        </span>
        <div className="flex items-center gap-3">
          <span
            className="font-mono uppercase tabular-nums"
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              color: 'var(--text-subtle)',
            }}
          >
            {artists.length} / {maxSelect}
          </span>
          <button
            type="button"
            onClick={onEdit}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 font-mono uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <Pencil size={10} strokeWidth={2} />
            Editar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-3.5 py-3">
        {artists.map((a, idx) => (
          <div
            key={a.id}
            className="group flex items-center gap-2.5 rounded-md py-1.5 pl-1.5 pr-2.5"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span
              className="font-mono uppercase tabular-nums"
              style={{
                fontSize: 9.5,
                letterSpacing: '0.16em',
                color: 'var(--accent)',
                minWidth: 16,
              }}
            >
              {String(idx + 1).padStart(2, '0')}
            </span>
            <div
              className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full"
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.imageUrl}
                  alt={a.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center font-mono uppercase"
                  style={{
                    fontSize: 9,
                    color: 'var(--text-subtle)',
                  }}
                >
                  {initialOf(a.name)}
                </div>
              )}
            </div>
            <span
              className="truncate"
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: 'var(--text-primary)',
                maxWidth: 140,
              }}
            >
              {a.name}
            </span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(a.id)}
                disabled={disabled}
                aria-label={`Remover ${a.name}`}
                className="flex h-4 w-4 items-center justify-center rounded-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: 'var(--text-subtle)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--led-error)'
                  e.currentTarget.style.background = 'rgba(248,113,113,0.10)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-subtle)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <X size={10} strokeWidth={2.4} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
