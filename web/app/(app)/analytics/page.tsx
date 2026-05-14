'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3,
  Loader2,
  AlertCircle,
  ExternalLink,
  Eye,
  Clock,
  Music2,
  Info,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchAnalyticsMyBeats,
  fetchAnalyticsOverview,
  type AnalyticsMyBeats,
  type AnalyticsMyBeatItem,
  type AnalyticsOverview,
} from '@/lib/api'

type Periodo = '7d' | '30d' | '90d'

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
]

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

  const inicial = (item.artista_nome ?? item.titulo ?? '?')
    .trim()
    .charAt(0)
    .toUpperCase()

  return (
    <div
      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)' }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={item.titulo ?? ''} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background:
              'linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay))',
          }}
        >
          <span
            className="font-display text-lg font-semibold"
            style={{ color: 'var(--text-subtle)' }}
          >
            {inicial}
          </span>
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [periodo, setPeriodo] = useState<Periodo>('7d')
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [myBeats, setMyBeats] = useState<AnalyticsMyBeats | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

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
        // Busca em paralelo
        const [ov, mb] = await Promise.all([
          fetchAnalyticsOverview(session.access_token, periodo).catch(() => null),
          fetchAnalyticsMyBeats(session.access_token, periodo),
        ])
        if (!cancelado) {
          setOverview(ov)
          setMyBeats(mb)
        }
      } catch (e) {
        if (!cancelado) {
          setErro(e instanceof Error ? e.message : 'Erro desconhecido')
        }
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    carrega()
    return () => {
      cancelado = true
    }
  }, [periodo])

  const totalViewsBeats = myBeats?.items.reduce((acc, b) => acc + b.views, 0) ?? 0

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 rise rise-1">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--text-subtle)' }}
          >
            studio · analytics
          </span>
          <h1
            className="font-display text-[40px] font-semibold leading-none tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Como seus beats estão indo<span style={{ color: 'var(--accent)' }}>.</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Métricas reais do YouTube por beat publicado.
          </p>
        </div>

        {/* Seletor de período */}
        <div
          className="inline-flex items-center rounded-lg p-1 rise rise-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          {PERIODOS.map((p) => {
            const ativo = periodo === p.value
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriodo(p.value)}
                className="rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors"
                style={{
                  background: ativo ? 'var(--bg-elevated)' : 'transparent',
                  color: ativo ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Aviso de delay */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 rise rise-3"
        style={{
          background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.18)',
        }}
      >
        <Info className="h-4 w-4 shrink-0" style={{ color: '#60a5fa' }} />
        <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          O YouTube Analytics atualiza com <strong>delay de 24-48h</strong>. Views muito recentes
          podem ainda não estar contadas aqui. Você consegue ver tudo em tempo real direto no{' '}
          <a
            href="https://studio.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            YouTube Studio
          </a>
          .
        </p>
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

      {/* KPI Cards do overview do canal */}
      {!loading && overview && (
        <section className="grid grid-cols-1 gap-3 rise rise-3 sm:grid-cols-3">
          {[
            { label: 'Views totais', value: overview.views.value, delta: overview.views.delta_pct, icon: Eye },
            { label: 'Inscritos ganhos', value: overview.subscribers_gained.value, delta: overview.subscribers_gained.delta_pct, icon: Music2 },
            { label: 'Retenção média', value: overview.retention.value, suffix: '%', delta: overview.retention.delta_pct, icon: Clock },
          ].map((kpi) => {
            const Icon = kpi.icon
            const subiu = kpi.delta >= 0
            return (
              <div
                key={kpi.label}
                className="group relative overflow-hidden rounded-xl p-5"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div className="flex items-start justify-between">
                  <p
                    className="font-mono text-[10px] font-medium uppercase tracking-[0.18em]"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    {kpi.label}
                  </p>
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-muted)',
                    }}
                  >
                    <Icon size={13} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
                <p className="num-hero mt-4 text-[36px]" style={{ color: 'var(--text-primary)' }}>
                  {kpi.value.toLocaleString('pt-BR')}
                  {kpi.suffix ?? ''}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[12px]">
                  <span style={{ color: subiu ? '#4ade80' : '#f87171' }}>
                    {subiu ? '↑' : '↓'} {Math.abs(kpi.delta)}%
                  </span>
                  <span style={{ color: 'var(--text-subtle)' }}>vs período anterior</span>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* Lista de beats publicados */}
      <section className="space-y-3 rise rise-4">
        <div className="flex items-baseline justify-between">
          <h2
            className="font-display text-[22px] font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Seus beats no YouTube
          </h2>
          {myBeats && myBeats.items.length > 0 && (
            <span
              className="font-mono text-[11px] uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              {myBeats.items.length} {myBeats.items.length === 1 ? 'beat' : 'beats'}
              {totalViewsBeats > 0 && (
                <>
                  {' · '}
                  <span style={{ color: 'var(--accent)' }}>
                    {totalViewsBeats.toLocaleString('pt-BR')} views totais
                  </span>
                </>
              )}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-muted)',
                }}
              >
                <div className="shimmer h-full w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : !myBeats || myBeats.items.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'var(--accent-muted)', border: '1px solid rgba(255,90,31,0.25)' }}
            >
              <BarChart3 className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            </div>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Você ainda não publicou beats pela plataforma
            </p>
            <p className="max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
              Quando você publicar pelo BeatPost, eles aparecem aqui com views,
              retenção e mais métricas. Só beats publicados pela plataforma — vídeos
              antigos do canal não entram aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {myBeats.items.map((beat) => (
              <div
                key={beat.beat_id}
                className="group flex items-center gap-4 rounded-xl p-4 transition-colors"
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
                <BeatThumbnail item={beat} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className="truncate text-[14.5px] font-medium"
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

                {/* Stats */}
                <div className="hidden flex-col items-end gap-0.5 sm:flex">
                  <p
                    className="font-display text-[22px] font-semibold leading-none tabular"
                    style={{
                      color: beat.views > 0 ? 'var(--accent)' : 'var(--text-subtle)',
                    }}
                  >
                    {beat.views.toLocaleString('pt-BR')}
                  </p>
                  <p
                    className="font-mono text-[10px] uppercase tracking-wider"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    views
                  </p>
                </div>

                {beat.retention_pct > 0 && (
                  <div className="hidden flex-col items-end gap-0.5 md:flex">
                    <p
                      className="text-[15px] font-medium tabular"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {beat.retention_pct}%
                    </p>
                    <p
                      className="font-mono text-[10px] uppercase tracking-wider"
                      style={{ color: 'var(--text-subtle)' }}
                    >
                      retenção
                    </p>
                  </div>
                )}

                {beat.youtube_url && (
                  <a
                    href={beat.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir no YouTube"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition"
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
        )}
      </section>
    </div>
  )
}
