'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ExternalLink,
  ArrowUpDown,
  BarChart3,
  Eye,
  Heart,
  MessageSquare,
  RefreshCw,
  Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchAnalyticsMyBeats,
  type AnalyticsMyBeats,
  type AnalyticsMyBeatItem,
} from '@/lib/api'
import { AnalyticsScopeNote } from '@/components/AnalyticsScopeNote'

type SortKey = 'newest' | 'views' | 'likes' | 'comments'

function BeatThumbnail({ item }: { item: AnalyticsMyBeatItem }) {
  const supabase = createClient()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    if (!item.cover_path) return
    supabase.storage
      .from('covers')
      .createSignedUrl(item.cover_path, 3600)
      .then(({ data }) => {
        if (!cancelado && data?.signedUrl) setUrl(data.signedUrl)
      })
    return () => {
      cancelado = true
    }
  }, [item.cover_path])

  const inicial = (item.artista_nome ?? item.titulo ?? '?').trim().charAt(0).toUpperCase()

  return (
    <div
      className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-muted)',
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={item.titulo ?? ''} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay))',
          }}
        >
          <span
            className="font-display text-base font-semibold"
            style={{ color: 'var(--text-subtle)' }}
          >
            {inicial}
          </span>
        </div>
      )}
    </div>
  )
}

function SortPill({
  label,
  ativo,
  onClick,
}: {
  label: string
  ativo: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] transition-colors"
      style={{
        background: ativo ? 'var(--text-primary)' : 'transparent',
        color: ativo ? 'var(--bg-base)' : 'var(--text-subtle)',
        border: '1px solid',
        borderColor: ativo ? 'var(--text-primary)' : 'var(--border)',
      }}
    >
      {label}
    </button>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '—'
  }
}

export default function AnalyticsBeatsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [data, setData] = useState<AnalyticsMyBeats | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloading, setReloading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('newest')
  const [search, setSearch] = useState('')

  async function carrega(forceRefresh = false) {
    if (forceRefresh) setReloading(true)
    else setLoading(true)
    setErro(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const result = await fetchAnalyticsMyBeats(session.access_token, { forceRefresh })
      setData(result)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
      setReloading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carrega(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const itensFiltradosEOrdenados = useMemo(() => {
    if (!data) return []
    const termo = search.trim().toLowerCase()
    let itens = data.items
    if (termo) {
      itens = itens.filter((b) => {
        const titulo = (b.titulo ?? '').toLowerCase()
        const artista = (b.artista_nome ?? '').toLowerCase()
        return titulo.includes(termo) || artista.includes(termo)
      })
    }
    const ordenado = [...itens]
    ordenado.sort((a, b) => {
      if (sort === 'newest') {
        const aP = a.published_at ?? ''
        const bP = b.published_at ?? ''
        return bP.localeCompare(aP)
      }
      if (sort === 'views') return b.view_count - a.view_count
      if (sort === 'likes') return b.like_count - a.like_count
      if (sort === 'comments') return b.comment_count - a.comment_count
      return 0
    })
    return ordenado
  }, [data, sort, search])

  const totalViews = data?.items.reduce((acc, b) => acc + b.view_count, 0) ?? 0
  const totalLikes = data?.items.reduce((acc, b) => acc + b.like_count, 0) ?? 0
  const totalComments = data?.items.reduce((acc, b) => acc + b.comment_count, 0) ?? 0

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 rise rise-1">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--text-subtle)' }}
          >
            studio · analytics · beats
          </span>
          <h1
            className="font-display text-[40px] font-semibold leading-none tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Meus beats em detalhe<span style={{ color: 'var(--accent)' }}>.</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Stats lifetime atualizadas em minutos. Clique <span style={{ color: 'var(--text-primary)' }}>Reload</span> pra forçar refresh.
          </p>
        </div>

        <button
          type="button"
          onClick={() => carrega(true)}
          disabled={reloading || loading}
          className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] transition rise rise-2"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            opacity: reloading || loading ? 0.5 : 1,
            cursor: reloading || loading ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!reloading && !loading) e.currentTarget.style.borderColor = 'var(--border-strong)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >
          <RefreshCw
            className="h-3.5 w-3.5"
            style={{ animation: reloading ? 'spin 0.8s linear infinite' : undefined }}
          />
          Reload
        </button>
      </div>

      {erro && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5',
          }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm break-all">{erro}</span>
        </div>
      )}

      {/* Nota de escopo */}
      {data && data.items.length > 0 && (
        <div className="rise rise-3">
          <AnalyticsScopeNote variant="beatpost" />
        </div>
      )}

      {/* Resumo */}
      {data && data.items.length > 0 && (
        <div
          className="flex flex-wrap items-baseline gap-x-8 gap-y-2 rounded-xl px-5 py-4 rise rise-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div>
            <span
              className="block font-mono text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              beats publicados
            </span>
            <span className="font-display text-[22px] font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {data.items.length}
            </span>
          </div>
          <div>
            <span
              className="block font-mono text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              views totais
            </span>
            <span className="font-display text-[22px] font-semibold tabular" style={{ color: 'var(--accent)' }}>
              {totalViews.toLocaleString('pt-BR')}
            </span>
          </div>
          <div>
            <span
              className="block font-mono text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              likes totais
            </span>
            <span className="font-display text-[22px] font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {totalLikes.toLocaleString('pt-BR')}
            </span>
          </div>
          <div>
            <span
              className="block font-mono text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              comentários totais
            </span>
            <span className="font-display text-[22px] font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
              {totalComments.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      )}

      {/* Barra de busca + sort */}
      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rise rise-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 sm:max-w-sm sm:flex-1"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-subtle)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou artista..."
              className="w-full bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SortPill label="Mais novo" ativo={sort === 'newest'} onClick={() => setSort('newest')} />
            <SortPill label="Views" ativo={sort === 'views'} onClick={() => setSort('views')} />
            <SortPill label="Likes" ativo={sort === 'likes'} onClick={() => setSort('likes')} />
            <SortPill label="Comentários" ativo={sort === 'comments'} onClick={() => setSort('comments')} />
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-2 rise rise-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-muted)' }}
            >
              <div className="shimmer h-full w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center rise rise-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              background: 'var(--accent-muted)',
              border: '1px solid rgba(255,90,31,0.25)',
            }}
          >
            <BarChart3 className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            Sem beats publicados ainda
          </p>
          <p className="max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
            Quando você publicar pelo BeatPost, cada beat aparece aqui com suas
            métricas individuais.
          </p>
        </div>
      ) : itensFiltradosEOrdenados.length === 0 ? (
        <div
          className="rounded-xl border border-dashed px-6 py-10 text-center rise rise-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum beat encontrado pra <span style={{ color: 'var(--text-primary)' }}>&quot;{search}&quot;</span>.
          </p>
        </div>
      ) : (
        <div className="rise rise-4">
          {/* Linhas */}
          <div className="space-y-2">
            {itensFiltradosEOrdenados.map((beat) => (
              <div
                key={beat.beat_id}
                className="group grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl p-4 transition-colors sm:grid-cols-[1fr_70px_70px_70px_90px_40px]"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-strong)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                {/* Beat (cover + título + artista + badge) */}
                <div className="flex min-w-0 items-center gap-3">
                  <BeatThumbnail item={beat} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className="truncate text-[14px] font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {beat.titulo ?? '(sem título)'}
                      </p>
                      {beat.privacy_status !== 'public' && (
                        <span
                          className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider"
                          style={{
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {beat.privacy_status === 'private' ? 'Privado' : 'Não listado'}
                        </span>
                      )}
                    </div>
                    <p
                      className="truncate text-[12px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {beat.artista_nome ?? 'sem artista'}
                    </p>
                  </div>
                </div>

                {/* Views (desktop) */}
                <div className="hidden flex-col items-center sm:flex">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" style={{ color: 'var(--text-subtle)' }} />
                    <span
                      className="font-display text-[15px] font-semibold tabular"
                      style={{ color: beat.view_count > 0 ? 'var(--accent)' : 'var(--text-subtle)' }}
                    >
                      {beat.view_count.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Likes (desktop) */}
                <div className="hidden flex-col items-center sm:flex">
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" style={{ color: 'var(--text-subtle)' }} />
                    <span
                      className="text-[14px] font-medium tabular"
                      style={{ color: beat.like_count > 0 ? 'var(--text-primary)' : 'var(--text-subtle)' }}
                    >
                      {beat.like_count.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Comments (desktop) */}
                <div className="hidden flex-col items-center sm:flex">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" style={{ color: 'var(--text-subtle)' }} />
                    <span
                      className="text-[14px] font-medium tabular"
                      style={{ color: beat.comment_count > 0 ? 'var(--text-primary)' : 'var(--text-subtle)' }}
                    >
                      {beat.comment_count.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Data (desktop) */}
                <div className="hidden flex-col items-end sm:flex">
                  <span
                    className="font-mono text-[10px] tabular"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    {formatDate(beat.published_at)}
                  </span>
                </div>

                {/* Mobile: stats compactas */}
                <div className="flex flex-col items-end gap-1 sm:hidden">
                  <div className="flex items-center gap-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-3 w-3" /> {beat.view_count}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Heart className="h-3 w-3" /> {beat.like_count}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="h-3 w-3" /> {beat.comment_count}
                    </span>
                  </div>
                  <span className="font-mono text-[9px]" style={{ color: 'var(--text-subtle)' }}>
                    {formatDate(beat.published_at)}
                  </span>
                </div>

                {/* Link YouTube */}
                {beat.youtube_url && (
                  <a
                    href={beat.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir no YouTube"
                    className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg transition sm:flex"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent)'
                      e.currentTarget.style.borderColor = 'var(--accent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
