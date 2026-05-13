import Link from 'next/link'
import { healthCheck } from '@/lib/api'
import { Upload, Music, BarChart2, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const api = await healthCheck()

  const statCards = [
    { label: 'Beats publicados', value: '—', icon: Music, desc: 'Em breve' },
    { label: 'Views totais', value: '—', icon: BarChart2, desc: 'Em breve' },
    { label: 'Agendados', value: '—', icon: Clock, desc: 'Em breve' },
  ]

  return (
    <div className="space-y-8">
      {/* Header de boas-vindas */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Bom ver você por aqui
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Faça upload de um beat e a IA gera tudo pra publicar no YouTube.
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
          style={{ background: 'var(--accent)' }}
        >
          <Upload className="h-4 w-4" />
          Novo beat
        </Link>
      </div>

      {/* Cards de métricas (placeholders para Fase 2) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-xl border p-5"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>
                  {card.label}
                </p>
                <Icon className="h-4 w-4" style={{ color: 'var(--text-subtle)' }} />
              </div>
              <p className="mt-3 text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-subtle)' }}>{card.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Card de ação principal */}
      <div
        className="flex items-center gap-6 rounded-xl border p-6"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--accent-muted)' }}
        >
          <Upload className="h-6 w-6" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1">
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Comece fazendo upload de um beat</p>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            MP3 com sua tag gravada → IA analisa → você revisa → publicado no YouTube.
          </p>
        </div>
        <Link
          href="/upload"
          className="shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
        >
          Fazer upload
        </Link>
      </div>

      {/* Status da API */}
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${api.ok ? 'bg-green-500' : 'bg-red-500'}`}
        />
        <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
          API {api.ok ? `online${api.version ? ` · v${api.version}` : ''}` : 'offline'}
        </span>
      </div>
    </div>
  )
}
