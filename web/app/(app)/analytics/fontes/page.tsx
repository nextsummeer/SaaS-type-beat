'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  TrendingUp,
  Search,
  Video,
  Globe,
  MoreHorizontal,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchAnalyticsTrafficSources,
  type AnalyticsTrafficSources,
  type AnalyticsTrafficSource,
} from '@/lib/api'
import { AnalyticsPeriodSelector, type Periodo } from '@/components/AnalyticsPeriodSelector'
import { AnalyticsDelayBanner } from '@/components/AnalyticsDelayBanner'

function iconePorFonte(key: string) {
  if (key === 'YT_SEARCH' || key === 'HASHTAGS') return Search
  if (key === 'RELATED_VIDEO' || key === 'END_SCREEN') return Video
  if (key === 'EXT_URL' || key === 'EXT_APP') return Globe
  if (key === 'SUBSCRIBER' || key === 'NOTIFICATION') return TrendingUp
  return MoreHorizontal
}

export default function AnalyticsFontesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [periodo, setPeriodo] = useState<Periodo>('7d')
  const [data, setData] = useState<AnalyticsTrafficSources | null>(null)
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
        const result = await fetchAnalyticsTrafficSources(session.access_token, periodo)
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

  const fontes = data?.sources ?? []
  const totalViews = data?.total_views ?? 0
  const maiorPct = fontes.length > 0 ? fontes[0].pct : 0

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5 rise rise-1">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--text-subtle)' }}
          >
            studio · analytics · tráfego
          </span>
          <h1
            className="font-display text-[40px] font-semibold leading-none tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            De onde vêm as views<span style={{ color: 'var(--accent)' }}>.</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Pesquisa, sugestões, externo. Sabe pra onde otimizar.
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

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2 rise rise-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-muted)' }}
            >
              <div className="shimmer h-full w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && fontes.length === 0 && (
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
            <TrendingUp className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            Sem dados de tráfego no período
          </p>
          <p className="max-w-md text-sm" style={{ color: 'var(--text-muted)' }}>
            Pode estar aguardando o YouTube processar (24-48h) ou seu canal ainda
            não recebeu views suficientes pra agregar por fonte.
          </p>
        </div>
      )}

      {/* Gráfico horizontal + lista */}
      {!loading && fontes.length > 0 && (
        <>
          {/* Total */}
          <div
            className="flex items-baseline justify-between gap-3 rounded-xl px-5 py-4 rise rise-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div>
              <p
                className="font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{ color: 'var(--text-subtle)' }}
              >
                Total de views no período
              </p>
              <p
                className="mt-1 font-display text-[28px] font-semibold leading-none tabular"
                style={{ color: 'var(--text-primary)' }}
              >
                {totalViews.toLocaleString('pt-BR')}
              </p>
            </div>
            {fontes[0] && (
              <div className="text-right">
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  Principal fonte
                </p>
                <p
                  className="mt-1 text-[14px] font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  {fontes[0].label}
                </p>
              </div>
            )}
          </div>

          {/* Lista de fontes com barras horizontais */}
          <div className="space-y-2 rise rise-4">
            {fontes.map((fonte) => (
              <FonteRow key={fonte.key} fonte={fonte} maiorPct={maiorPct} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FonteRow({
  fonte,
  maiorPct,
}: {
  fonte: AnalyticsTrafficSource
  maiorPct: number
}) {
  const Icon = iconePorFonte(fonte.key)
  // largura relativa ao maior (não ao 100%) pra deixar visual proporcional
  const widthPct = maiorPct > 0 ? (fonte.pct / maiorPct) * 100 : 0

  return (
    <div
      className="group relative overflow-hidden rounded-xl p-4 transition-colors"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* Barra de fundo proporcional */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 transition-all"
        style={{
          width: `${widthPct}%`,
          background: 'linear-gradient(90deg, rgba(255,90,31,0.10), rgba(255,90,31,0.02))',
        }}
      />

      <div className="relative flex items-center gap-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-muted)',
          }}
        >
          <Icon size={15} style={{ color: 'var(--text-muted)' }} />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[14px] font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {fonte.label}
          </p>
          <p
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-subtle)' }}
          >
            {fonte.key}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            <p
              className="font-display text-[18px] font-semibold leading-none tabular"
              style={{ color: 'var(--text-primary)' }}
            >
              {fonte.views.toLocaleString('pt-BR')}
            </p>
            <p
              className="mt-1 font-mono text-[9px] uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              views
            </p>
          </div>
          <div className="w-14 text-right">
            <p
              className="text-[16px] font-semibold tabular"
              style={{ color: 'var(--accent)' }}
            >
              {fonte.pct}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
