'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  Eye,
  Clock,
  Music2,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchAnalyticsOverview,
  fetchAnalyticsViewsTimeline,
  type AnalyticsOverview,
  type AnalyticsViewsTimeline as TimelineData,
  type AnalyticsTimelineMetric,
} from '@/lib/api'
import { AnalyticsPeriodSelector, type Periodo } from '@/components/AnalyticsPeriodSelector'
import { AnalyticsDelayBanner } from '@/components/AnalyticsDelayBanner'
import { AnalyticsViewsTimeline } from '@/components/AnalyticsViewsTimeline'

export default function AnalyticsOverviewPage() {
  const router = useRouter()
  const supabase = createClient()

  const [periodo, setPeriodo] = useState<Periodo>('7d')
  const [metricaTimeline, setMetricaTimeline] = useState<AnalyticsTimelineMetric>('views')
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [timeline, setTimeline] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Carga inicial + mudança de período
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
        const [ov, tl] = await Promise.all([
          fetchAnalyticsOverview(session.access_token, periodo).catch(() => null),
          fetchAnalyticsViewsTimeline(session.access_token, periodo, metricaTimeline).catch(() => null),
        ])
        if (!cancelado) {
          setOverview(ov)
          setTimeline(tl)
        }
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

  // Refetch só da timeline quando muda a métrica (sem reload dos KPIs)
  async function trocarMetricaTimeline(m: AnalyticsTimelineMetric) {
    if (m === metricaTimeline) return
    setMetricaTimeline(m)
    setLoadingTimeline(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const tl = await fetchAnalyticsViewsTimeline(session.access_token, periodo, m)
      setTimeline(tl)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao trocar métrica')
    } finally {
      setLoadingTimeline(false)
    }
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 rise rise-1">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--text-subtle)' }}
          >
            studio · analytics · visão geral
          </span>
          <h1
            className="font-display text-[40px] font-semibold leading-none tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Como seus beats estão indo<span style={{ color: 'var(--accent)' }}>.</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Visão geral do seu canal nos últimos {periodo === '7d' ? '7 dias' : periodo === '30d' ? '30 dias' : '90 dias'}.
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

      {/* KPI Cards */}
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
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)' }}
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

      {/* Loading skeleton dos KPIs */}
      {loading && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[160px] rounded-xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-muted)' }}
            >
              <div className="shimmer h-full w-full rounded-xl" />
            </div>
          ))}
        </section>
      )}

      {/* Timeline */}
      {!loading && timeline && (
        <section
          className="rise rise-4"
          style={{ opacity: loadingTimeline ? 0.6 : 1, transition: 'opacity 0.2s' }}
        >
          <AnalyticsViewsTimeline
            data={timeline}
            metric={metricaTimeline}
            onMetricChange={trocarMetricaTimeline}
          />
        </section>
      )}

      {/* Links pras sub-páginas */}
      <section className="grid grid-cols-1 gap-3 rise rise-5 sm:grid-cols-2">
        <Link
          href="/analytics/beats"
          className="group flex items-center justify-between rounded-xl p-5 transition-colors"
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
          <div>
            <p
              className="font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-subtle)' }}
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
          className="group flex items-center justify-between rounded-xl p-5 transition-colors"
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
          <div>
            <p
              className="font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--text-subtle)' }}
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
