'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  Eye,
  Users,
  Video,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchChannelOverview,
  fetchAnalyticsViewsTimeline,
  type ChannelOverview,
  type AnalyticsViewsTimeline as TimelineData,
  type AnalyticsTimelineMetric,
} from '@/lib/api'
import { AnalyticsPeriodSelector, type Periodo } from '@/components/AnalyticsPeriodSelector'
import { AnalyticsDelayBanner } from '@/components/AnalyticsDelayBanner'
import { AnalyticsViewsTimeline } from '@/components/AnalyticsViewsTimeline'
import { AnalyticsScopeNote } from '@/components/AnalyticsScopeNote'

function formataNumero(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString('pt-BR')
}

export default function AnalyticsOverviewPage() {
  const router = useRouter()
  const supabase = createClient()

  const [periodo, setPeriodo] = useState<Periodo>('7d')
  const [metricaTimeline, setMetricaTimeline] = useState<AnalyticsTimelineMetric>('views')
  const [channelOverview, setChannelOverview] = useState<ChannelOverview | null>(null)
  const [timelines, setTimelines] = useState<{
    views: TimelineData | null
    subscribersGained: TimelineData | null
  }>({ views: null, subscribersGained: null })
  const [loading, setLoading] = useState(true)
  const [reloading, setReloading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

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
      const [ov, tlViews, tlSubs] = await Promise.all([
        fetchChannelOverview(session.access_token, { forceRefresh }).catch((e) => {
          // Canal nao conectado retorna 404 — nao bloqueia timeline
          if (e instanceof Error && /conect/i.test(e.message)) return null
          throw e
        }),
        fetchAnalyticsViewsTimeline(session.access_token, periodo, 'views').catch(() => null),
        fetchAnalyticsViewsTimeline(session.access_token, periodo, 'subscribersGained').catch(() => null),
      ])
      setChannelOverview(ov)
      setTimelines({ views: tlViews, subscribersGained: tlSubs })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
      setReloading(false)
    }
  }

  // Carga inicial + reload quando muda periodo (so a timeline depende dele)
  useEffect(() => {
    carrega(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  function trocarMetricaTimeline(m: AnalyticsTimelineMetric) {
    setMetricaTimeline(m)
  }

  const timeline = timelines[metricaTimeline]

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 rise rise-1">
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10.5, letterSpacing: '0.22em', color: 'var(--text-muted)' }}
          >
            studio · analytics · visão geral
          </span>
          <h1
            className="font-display text-[40px] font-semibold leading-none tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.028em' }}
          >
            Como seus beats estão indo.
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Métricas em tempo real do seu canal + tendência por janela.
            {channelOverview?.channel_title && (
              <>
                {' '}Canal:{' '}
                <span style={{ color: 'var(--text-secondary)' }}>
                  {channelOverview.channel_title}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 rise rise-2">
          <button
            type="button"
            onClick={() => carrega(true)}
            disabled={reloading || loading}
            className="btn-ghost"
            title="Buscar dados mais recentes do YouTube"
          >
            <RefreshCw
              size={13}
              strokeWidth={2}
              className={reloading ? 'animate-spin' : ''}
            />
            {reloading ? 'Atualizando…' : 'Atualizar'}
          </button>
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
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.20)',
            color: '#FCA5A5',
          }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm break-all">{erro}</span>
        </div>
      )}

      {/* KPI Cards — lifetime em tempo real (via channels.list) */}
      {loading ? (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[160px] rounded-2xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="shimmer h-full w-full rounded-2xl" />
            </div>
          ))}
        </section>
      ) : channelOverview ? (
        <section className="grid grid-cols-1 gap-3 rise rise-3 sm:grid-cols-3">
          {[
            { label: 'Inscritos', value: channelOverview.subscribers, icon: Users, hint: 'no canal agora' },
            { label: 'Views totais', value: channelOverview.total_views, icon: Eye, hint: 'lifetime do canal' },
            { label: 'Vídeos', value: channelOverview.videos, icon: Video, hint: 'publicados no canal' },
          ].map((kpi, idx) => {
            const Icon = kpi.icon
            return (
              <div
                key={kpi.label}
                className="group relative overflow-hidden rounded-2xl p-5 transition-colors"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-hover)'
                  e.currentTarget.style.boxShadow = 'var(--glow-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--text-subtle)',
                        letterSpacing: '0.18em',
                      }}
                    >
                      0{idx + 1}
                    </span>
                    <p
                      className="font-mono uppercase"
                      style={{
                        fontSize: 10.5,
                        fontWeight: 500,
                        letterSpacing: '0.16em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {kpi.label}
                    </p>
                  </div>
                  <Icon size={14} strokeWidth={1.6} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p
                  className="num-hero mt-6 text-[44px] leading-none"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {formataNumero(kpi.value)}
                </p>
                <div className="mt-4 flex items-end justify-between">
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 10.5,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {kpi.hint}
                  </span>
                  {channelOverview.fresh && (
                    <span
                      className="font-mono uppercase"
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.18em',
                        color: 'var(--led-success)',
                      }}
                    >
                      ● live
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      ) : (
        // Sem canal conectado — mensagem amigavel
        <section className="rise rise-3">
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-medium)',
              color: 'var(--text-muted)',
            }}
          >
            <p className="text-sm">
              Conecte seu canal do YouTube em{' '}
              <Link
                href="/configuracoes"
                className="underline"
                style={{ color: 'var(--text-primary)' }}
              >
                Configurações
              </Link>{' '}
              pra ver os KPIs em tempo real.
            </p>
          </div>
        </section>
      )}

      {/* Nota de escopo */}
      {!loading && channelOverview && (
        <div className="rise rise-3">
          <AnalyticsScopeNote variant="channel" />
        </div>
      )}

      {/* Timeline */}
      {!loading && timeline && (
        <section className="rise rise-4">
          <AnalyticsViewsTimeline
            data={timeline}
            metric={metricaTimeline}
            onMetricChange={trocarMetricaTimeline}
          />
        </section>
      )}

      {/* Links pras sub-paginas */}
      <section className="grid grid-cols-1 gap-3 rise rise-5 sm:grid-cols-2">
        <Link
          href="/analytics/beats"
          className="group flex items-center justify-between rounded-2xl p-5 transition-colors"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
            e.currentTarget.style.boxShadow = 'var(--glow-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div>
            <p
              className="font-mono uppercase"
              style={{ fontSize: 10.5, letterSpacing: '0.22em', color: 'var(--text-muted)' }}
            >
              Detalhes por beat
            </p>
            <p
              className="mt-1 font-display text-[18px] font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Meus beats →
            </p>
            <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              Veja views e retenção de cada beat publicado.
            </p>
          </div>
          <ChevronRight
            size={20}
            className="shrink-0 transition group-hover:translate-x-0.5"
            style={{ color: 'var(--text-subtle)' }}
          />
        </Link>

        <Link
          href="/analytics/fontes"
          className="group flex items-center justify-between rounded-2xl p-5 transition-colors"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
            e.currentTarget.style.boxShadow = 'var(--glow-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div>
            <p
              className="font-mono uppercase"
              style={{ fontSize: 10.5, letterSpacing: '0.22em', color: 'var(--text-muted)' }}
            >
              Quebra por origem
            </p>
            <p
              className="mt-1 font-display text-[18px] font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              De onde vêm →
            </p>
            <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              Pesquisa, sugeridos, externo. Sabe o que está trazendo audiência.
            </p>
          </div>
          <ChevronRight
            size={20}
            className="shrink-0 transition group-hover:translate-x-0.5"
            style={{ color: 'var(--text-subtle)' }}
          />
        </Link>
      </section>
    </div>
  )
}
