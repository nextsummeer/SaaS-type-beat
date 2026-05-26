'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X, Loader2, Plus, AlertCircle, Clock } from 'lucide-react'
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

type ComboProps = {
  value: SelectedArtist | null
  onChange: (artist: SelectedArtist | null) => void
  placeholder?: string
  disabled?: boolean
  /** Artistas recentes do producer (so faz sentido no /upload). */
  recentArtists?: SelectedArtist[]
  /** Nomes ja selecionados em outros slots -- filtrados do dropdown. */
  excludeNames?: string[]
  autoFocus?: boolean
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

/**
 * Combo de busca de artista (singular). Inline -- dropdown abre abaixo do
 * input, NAO modal. UploadForm e CapasWizard compoem multiplos.
 *
 * Estados:
 *   value=null  -> input aberto pra buscar
 *   value setado -> chip com avatar+nome+X (input some)
 *
 * Dropdown mostra: recentes (se input vazio + recentArtists passados),
 * resultados Spotify (debounced), fallback "Usar como texto livre" se
 * nada bate.
 */
export function ArtistComboBox({
  value,
  onChange,
  placeholder = 'ex: Drake, Travis Scott…',
  disabled = false,
  recentArtists = [],
  excludeNames = [],
  autoFocus = false,
}: ComboProps) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<SpotifyArtistResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 280)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      setError(null)
      return
    }
    let cancelled = false
    async function fetchArtists() {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) throw new Error('Sessao expirada')
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
        const url = `${apiUrl}/artists/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) {
          throw new Error(`Busca Spotify indisponivel (${res.status})`)
        }
        const data = await res.json()
        if (!cancelled) {
          setResults(data.items || [])
        }
      } catch (e) {
        if (!cancelled) {
          setResults([])
          setError(
            e instanceof Error
              ? e.message
              : 'Erro na busca Spotify -- use texto livre',
          )
        }
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
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selectArtist = useCallback(
    (artist: SpotifyArtistResult | SelectedArtist) => {
      const selected: SelectedArtist =
        'image_url' in artist
          ? {
              id: artist.id,
              name: artist.name,
              imageUrl: artist.image_url,
              followers: artist.followers,
              genres: artist.genres,
              custom: false,
            }
          : artist
      onChange(selected)
      setQuery('')
      setOpen(false)
    },
    [onChange],
  )

  const selectCustom = useCallback(() => {
    const name = (query || debouncedQuery).trim()
    if (!name) return
    onChange({
      id: `custom:${name.toLowerCase()}`,
      name,
      imageUrl: null,
      followers: 0,
      genres: [],
      custom: true,
    })
    setQuery('')
    setOpen(false)
  }, [query, debouncedQuery, onChange])

  function clear() {
    onChange(null)
    setQuery('')
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (results.length > 0) selectArtist(results[0])
      else if (query.trim()) selectCustom()
    }
  }

  const filteredResults = results.filter(
    (r) => !excludeNames.some((n) => n.toLowerCase() === r.name.toLowerCase()),
  )
  const filteredRecent = recentArtists.filter(
    (r) => !excludeNames.some((n) => n.toLowerCase() === r.name.toLowerCase()),
  )

  // CHIP MODE (artista selecionado)
  if (value) {
    return (
      <div
        ref={wrapperRef}
        className="flex h-[50px] items-center gap-2.5 rounded-lg px-2.5"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <ArtistAvatar
          name={value.name}
          imageUrl={value.imageUrl}
          size={32}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className="truncate"
            style={{
              fontSize: 13.5,
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            {value.name}
          </span>
          {value.followers > 0 && (
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: 10, color: 'var(--text-subtle)' }}
            >
              {formatFollowers(value.followers)} followers
            </span>
          )}
          {value.custom && (
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 9,
                letterSpacing: '0.2em',
                color: 'var(--text-subtle)',
              }}
            >
              texto livre
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          aria-label={`Remover ${value.name}`}
          className="flex h-6 w-6 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(248,113,113,0.10)'
            e.currentTarget.style.color = 'var(--led-error)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <X size={13} strokeWidth={2.2} />
        </button>
      </div>
    )
  }

  // INPUT MODE (vazio, busca)
  const showRecents = !debouncedQuery && filteredRecent.length > 0
  const showEmptyIdle = !debouncedQuery && filteredRecent.length === 0
  const fullCustom =
    debouncedQuery.length > 0 && !loading && filteredResults.length === 0

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="flex h-[50px] items-center gap-2.5 rounded-lg px-3 transition-colors"
        style={{
          background: open ? 'var(--bg-surface)' : 'var(--bg-base)',
          border: `1px solid ${open ? 'var(--border-strong)' : 'var(--border-medium)'}`,
        }}
      >
        <Search size={14} style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--text-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ color: 'var(--text-primary)' }}
        />
        {loading && (
          <Loader2
            size={13}
            className="animate-spin"
            style={{ color: 'var(--text-muted)' }}
          />
        )}
      </div>

      {open && !disabled && (
        <div
          className="absolute left-0 right-0 z-30 mt-1 max-h-[320px] overflow-y-auto rounded-lg"
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            animation: 'acb-rise 160ms ease-out',
          }}
        >
          <style>{`
            @keyframes acb-rise { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: translateY(0) } }
            .acb-scroll::-webkit-scrollbar { width: 5px }
            .acb-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 3px }
          `}</style>

          {/* IDLE state -- sem query e sem recentes */}
          {showEmptyIdle && (
            <div className="flex items-center gap-2 px-4 py-3">
              <Search
                size={12}
                style={{ color: 'var(--text-subtle)' }}
              />
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: 'var(--text-subtle)',
                }}
              >
                digite pra buscar artistas
              </span>
            </div>
          )}

          {/* RECENT state */}
          {showRecents && (
            <>
              <div
                className="flex items-center gap-1.5 px-4 py-2"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <Clock
                  size={10}
                  style={{ color: 'var(--text-subtle)' }}
                />
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '0.22em',
                    color: 'var(--text-subtle)',
                  }}
                >
                  recentes
                </span>
              </div>
              {filteredRecent.slice(0, 5).map((artist) => (
                <DropdownRow
                  key={artist.id}
                  name={artist.name}
                  imageUrl={artist.imageUrl}
                  followers={artist.followers}
                  genres={artist.genres}
                  onClick={() => selectArtist(artist)}
                />
              ))}
            </>
          )}

          {/* ERROR */}
          {error && debouncedQuery && (
            <div
              className="flex items-start gap-2 px-4 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <AlertCircle
                size={12}
                style={{ color: '#FCD34D', marginTop: 2 }}
              />
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: '#FCD34D',
                  lineHeight: 1.4,
                }}
              >
                {error}
              </span>
            </div>
          )}

          {/* LOADING */}
          {loading && filteredResults.length === 0 && !error && (
            <div className="flex items-center gap-2 px-4 py-3">
              <Loader2
                size={12}
                className="animate-spin"
                style={{ color: 'var(--text-muted)' }}
              />
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: 'var(--text-muted)',
                }}
              >
                buscando…
              </span>
            </div>
          )}

          {/* RESULTS Spotify */}
          {!loading && filteredResults.length > 0 && (
            <>
              {filteredResults.map((artist) => (
                <DropdownRow
                  key={artist.id}
                  name={artist.name}
                  imageUrl={artist.image_url}
                  followers={artist.followers}
                  genres={artist.genres}
                  onClick={() => selectArtist(artist)}
                />
              ))}
            </>
          )}

          {/* FALLBACK CUSTOM */}
          {fullCustom && (
            <button
              type="button"
              onClick={selectCustom}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
              style={{
                background: 'transparent',
                borderTop:
                  filteredResults.length > 0
                    ? '1px solid var(--border-subtle)'
                    : 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-surface)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px dashed var(--border-medium)',
                  color: 'var(--text-muted)',
                }}
              >
                <Plus size={13} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                  }}
                >
                  {debouncedQuery}
                </p>
                <p
                  className="font-mono uppercase"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '0.2em',
                    color: 'var(--text-subtle)',
                  }}
                >
                  usar como texto livre
                </p>
              </div>
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.22em',
                  color: 'var(--text-subtle)',
                }}
              >
                custom
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────

function ArtistAvatar({
  name,
  imageUrl,
  size,
}: {
  name: string
  imageUrl: string | null
  size: number
}) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center font-mono uppercase"
          style={{
            fontSize: size * 0.36,
            color: 'var(--text-muted)',
          }}
        >
          {initialOf(name)}
        </div>
      )}
    </div>
  )
}

function DropdownRow({
  name,
  imageUrl,
  followers,
  genres,
  onClick,
}: {
  name: string
  imageUrl: string | null
  followers: number
  genres: string[]
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-surface)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <ArtistAvatar name={name} imageUrl={imageUrl} size={32} />
      <div className="min-w-0 flex-1">
        <p
          className="truncate"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {name}
        </p>
        {genres.length > 0 && (
          <p
            className="truncate font-mono"
            style={{
              fontSize: 10,
              color: 'var(--text-subtle)',
            }}
          >
            {genres.slice(0, 2).join(' · ')}
          </p>
        )}
      </div>
      {followers > 0 && (
        <div
          className="shrink-0 font-mono tabular-nums"
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          {formatFollowers(followers)}
        </div>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────
// localStorage helpers pra recent artists (so usado no /upload)
// ─────────────────────────────────────────────────────────────────────

const RECENT_KEY = 'beatpost:recent_artists'
const RECENT_MAX = 5

export function loadRecentArtists(): SelectedArtist[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

export function saveRecentArtists(artists: SelectedArtist[]): void {
  if (typeof window === 'undefined') return
  try {
    const current = loadRecentArtists()
    const merged: SelectedArtist[] = [...artists]
    for (const r of current) {
      if (!merged.some((m) => m.name.toLowerCase() === r.name.toLowerCase())) {
        merged.push(r)
      }
    }
    localStorage.setItem(
      RECENT_KEY,
      JSON.stringify(merged.slice(0, RECENT_MAX)),
    )
  } catch {
    // sem-op em modo privado / quota cheia
  }
}
