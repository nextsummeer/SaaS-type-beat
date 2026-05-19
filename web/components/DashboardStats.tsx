'use client'

import { useEffect, useState } from 'react'
import { Music2, Eye, Activity, CalendarClock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchBeats,
  fetchAnalyticsOverview,
  type BeatListItem,
} from '@/lib/api'

type StatItem = {
  label: string
  value: string
  icon: typeof Music2
  hint: string
  spark: number[]
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  const w = 80
  const h = 22
  const step = w / (data.length - 1)
  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

function formataNumero(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString('pt-BR')
}

function calculaStats(beats: BeatListItem[], totalViews: number): StatItem[] {
  const agora = new Date()

  const publicados = beats.filter(
    (b) =>
      !b.youtube_deleted_at &&
      (b.post_status === 'published' ||
        (b.post_status === 'scheduled' && b.scheduled_at && new Date(b.scheduled_at) <= agora)),
  ).length

  const emFila = beats.filter(
    (b) =>
      b.status !== 'failed' &&
      b.status !== 'ready_for_review' &&
      b.post_status !== 'scheduled' &&
      b.post_status !== 'published',
  ).length

  const agendados = beats.filter(
    (b) =>
      b.post_status === 'scheduled' &&
      b.scheduled_at &&
      new Date(b.scheduled_at) > agora,
  ).length

  return [
    {
      label: 'Beats publicados',
      value: publicados.toLocaleString('pt-BR'),
      icon: Music2,
      hint: 'no YouTube',
      spark: [4, 8, 6, 12, 10, 14, Math.max(publicados, 18)],
    },
    {
      label: 'Views totais',
      value: formataNumero(totalViews),
      icon: Eye,
      hint: 'canal · últimos 90d',
      spark: [6, 10, 8, 14, 12, 16, Math.max(20, Math.min(40, totalViews / 5))],
    },
    {
      label: 'Em fila',
      value: emFila.toLocaleString('pt-BR'),
      icon: Activity,
      hint: 'processando ou rascunho',
      spark: [2, 4, 3, 6, 5, 7, Math.max(emFila, 4)],
    },
    {
      label: 'Agendados',
      value: agendados.toLocaleString('pt-BR'),
      icon: CalendarClock,
      hint: 'aguardando publicação',
      spark: [1, 2, 3, 2, 4, 3, Math.max(agendados, 5)],
    },
  ]
}

export function DashboardStats() {
  const supabase = createClient()
  const [stats, setStats] = useState<StatItem[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function carrega() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const beats = await fetchBeats(session.access_token)

        let totalViews = 0
        try {
          const overview = await fetchAnalyticsOverview(session.access_token, '90d')
          totalViews = overview.views.value
        } catch {
          // Sem canal conectado ou erro temporário do YT — mostra 0 e segue
        }

        if (!cancelado) setStats(calculaStats(beats, totalViews))
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro ao carregar')
      }
    }

    carrega()
    const id = setInterval(carrega, 30_000)
    return () => {
      cancelado = true
      clearInterval(id)
    }
  }, [])

  const placeholders: StatItem[] = [
    { label: 'Beats publicados', value: '—', icon: Music2, hint: 'no YouTube', spark: [4, 8, 6, 12, 10, 14, 18] },
    { label: 'Views totais', value: '—', icon: Eye, hint: 'últimos 90 dias', spark: [6, 10, 8, 14, 12, 16, 20] },
    { label: 'Em fila', value: '—', icon: Activity, hint: 'processando ou rascunho', spark: [2, 4, 3, 6, 5, 7, 4] },
    { label: 'Agendados', value: '—', icon: CalendarClock, hint: 'aguardando publicação', spark: [1, 2, 3, 2, 4, 3, 5] },
  ]

  const dados = stats ?? placeholders
  const carregando = stats === null && !erro

  return (
    <section className="grid grid-cols-1 gap-3 rise rise-2 sm:grid-cols-2 lg:grid-cols-4">
      {dados.map((s, idx) => {
        const Icon = s.icon
        return (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-2xl p-5 transition-colors"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-medium)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
            }}
          >
            {/* Header: eyebrow num + ícone */}
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
                  {s.label}
                </p>
              </div>
              <Icon
                size={14}
                strokeWidth={1.6}
                style={{ color: 'var(--text-muted)' }}
              />
            </div>

            {/* Número grande */}
            <p
              className="num-hero mt-6 text-[44px] leading-none"
              style={{
                color: 'var(--text-primary)',
                opacity: carregando ? 0.25 : 1,
                transition: 'opacity 0.4s ease',
              }}
            >
              {s.value}
            </p>

            {/* Footer: hint legível + sparkline neutra */}
            <div className="mt-4 flex items-end justify-between gap-3">
              <span
                className="font-mono"
                style={{
                  fontSize: 10.5,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.06em',
                }}
              >
                {s.hint}
              </span>
              <Sparkline data={s.spark} />
            </div>
          </div>
        )
      })}
    </section>
  )
}
