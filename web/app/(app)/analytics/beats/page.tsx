'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ExternalLink,
  ArrowUpDown,
  BarChart3,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchAnalyticsMyBeats,
  type AnalyticsMyBeats,
  type AnalyticsMyBeatItem,
} from '@/lib/api'
import { AnalyticsPeriodSelector, type Periodo } from '@/components/AnalyticsPeriodSelector'
import { AnalyticsDelayBanner } from '@/components/AnalyticsDelayBanner'

type SortKey = 'views' | 'retention' | 'titulo'

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

function HeaderButton({
  label,
  sortKey,
  current,
  onClick,
  align = 'left',
}: {
  label: string
  sortKey: SortKey
  current: { key: SortKey; dir: 'asc' | 'desc' }
  onClick: () => void
  align?: 'left' | 'right'
}) {
  const ativo = current.key === sortKey
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] transition-colors ${
        align === 'right' ? 'justify-end ml-auto' : ''
      }`}
      style={{ color: ativo ? 'var(--text-primary)' : 'var(--text-subtle)' }}
    >
      {label}
      <ArrowUpDown
        size={10}
        style={{
          opacity: ativo ? 1 : 0.4,
          transform: ativo && current.dir === 'asc' ? 'rotate(180deg)' : undefined,
          transition: 'transform 0.18s',
        }}
      />
    </button>
  )
}

export default function AnalyticsBeatsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [periodo, setPeriodo] = useState<Periodo>('7d')
  const [data, setData] = useState<AnalyticsMyBeats | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'views',
    dir: 'desc',
  })

  useEffect(() => {
    let cancelado = false
    async function carrega() {
      setLoading(true)
      setErro(null)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }
        const result = await fetchAnalyticsMyBeats(session.access_token, periodo)
        if (!cancelado) setData(result)
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro desconhecido')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    carrega()
    return () => {
      cancelado = true
    }
  }, [periodo])

  const itensOrdenados = useMemo(() => {
    if (!data) return []
    const itens = [...data.items]
    itens.sort((a, b) => {
      let cmp = 0
      if (sort.key === 'views') cmp = a.views - b.views
      else if (sort.key === 'retention') cmp = a.retention_pct - b.retention_pct
      else if (sort.key === 'titulo') {
        const aT = (a.titulo ?? '').toLowerCase()
        const bT = (b.titulo ?? '').toLowerCase()
        cmp = aT < bT ? -1 : aT > bT ? 1 : 0
      }
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return itens
  }, [data, sort])

  function toggleSort(key: SortKey) {
    setSort((cur) =>
      cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    )
  }

  const totalViews = data?.items.reduce((acc, b) => acc + b.views, 0) ?? 0

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
            Cada beat publicado pelo BeatPost, com views e retenção do período.
          </p>
        </div>

        <div className="rise rise-2">
          <AnalyticsPeriodSelector value={periodo} onChange={setPeriodo} />
        </div>
      </div>

      <div className="rise rise-3">
        <AnalyticsDelayBanner />
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

      {/* Resumo */}
      {data && data.items.length > 0 && (
        <div
          className="flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-xl px-5 py-4 rise rise-3"
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
      ) : (
        <div className="rise rise-4">
          {/* Cabeçalho de tabela */}
          <div
            className="hidden grid-cols-[1fr_120px_120px_40px] items-center gap-4 px-5 py-2.5 sm:grid"
          >
            <HeaderButton
              label="Beat"
              sortKey="titulo"
              current={sort}
              onClick={() => toggleSort('titulo')}
            />
            <HeaderButton
              label="Views"
              sortKey="views"
              current={sort}
              onClick={() => toggleSort('views')}
              align="right"
            />
            <HeaderButton
              label="Retenção"
              sortKey="retention"
              current={sort}
              onClick={() => toggleSort('retention')}
              align="right"
            />
            <span />
          </div>

          {/* Linhas */}
          <div className="space-y-2">
            {itensOrdenados.map((beat) => (
              <div
                key={beat.beat_id}
                className="group grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl p-4 transition-colors sm:grid-cols-[1fr_120px_120px_40px]"
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

                {/* Views (mobile: junto / desktop: coluna) */}
                <div className="hidden flex-col items-end sm:flex">
                  <p
                    className="font-display text-[20px] font-semibold leading-none tabular"
                    style={{ color: beat.views > 0 ? 'var(--accent)' : 'var(--text-subtle)' }}
                  >
                    {beat.views.toLocaleString('pt-BR')}
                  </p>
                  <p
                    className="mt-1 font-mono text-[9px] uppercase tracking-wider"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    views
                  </p>
                </div>

                {/* Retenção */}
                <div className="hidden flex-col items-end sm:flex">
                  <p
                    className="text-[15px] font-medium tabular"
                    style={{
                      color: beat.retention_pct > 0 ? 'var(--text-secondary)' : 'var(--text-subtle)',
                    }}
                  >
                    {beat.retention_pct}%
                  </p>
                  <p
                    className="mt-1 font-mono text-[9px] uppercase tracking-wider"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    retenção
                  </p>
                </div>

                {/* Ação mobile (views + link) */}
                <div className="flex flex-col items-end gap-1 sm:hidden">
                  <p
                    className="font-display text-[18px] font-semibold tabular"
                    style={{ color: beat.views > 0 ? 'var(--accent)' : 'var(--text-subtle)' }}
                  >
                    {beat.views}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
                    {beat.retention_pct}% ret.
                  </p>
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
