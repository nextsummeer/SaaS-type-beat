import Link from 'next/link'
import { healthCheck } from '@/lib/api'
import {
  Upload,
  Zap,
  ArrowUpRight,
  ChevronRight,
  Headphones,
} from 'lucide-react'
import { DashboardGreeting } from '@/components/DashboardGreeting'
import { DashboardStats } from '@/components/DashboardStats'

export default async function DashboardPage() {
  const api = await healthCheck()

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="flex flex-col gap-6 rise rise-1 md:flex-row md:items-end md:justify-between">
        <DashboardGreeting />
        <Link href="/upload" className="btn-primary group shrink-0">
          <Upload size={15} strokeWidth={2.2} />
          Novo beat
          <ArrowUpRight
            size={14}
            strokeWidth={2.4}
            className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      </section>

      {/* STATS GRID — dados reais via /beats e /analytics/my-beats */}
      <DashboardStats />

      {/* AÇÃO PRINCIPAL — upload */}
      <section
        className="relative overflow-hidden rounded-2xl p-8 rise rise-3"
        style={{
          background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))',
          border: '1px solid var(--border)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 md:block"
          style={{ color: 'var(--accent)', opacity: 0.18 }}
        >
          <svg width="280" height="120" viewBox="0 0 280 120" fill="none">
            {Array.from({ length: 36 }).map((_, i) => {
              const h = 10 + Math.abs(Math.sin(i * 0.6) * 50) + Math.abs(Math.cos(i * 1.2) * 30)
              const x = i * 8
              return (
                <rect key={i} x={x} y={(120 - h) / 2} width={3} height={h} rx={1.5} fill="currentColor" />
              )
            })}
          </svg>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full"
          style={{ background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)', opacity: 0.45 }}
        />

        <div className="relative flex max-w-2xl flex-col gap-4">
          <div className="flex items-center gap-2">
            <Zap size={13} style={{ color: 'var(--accent)' }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--accent)' }}>
              próximo passo
            </span>
          </div>
          <h2
            className="font-display text-[28px] font-semibold leading-tight tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Suba seu próximo beat.<br />
            <span style={{ color: 'var(--text-muted)' }}>Deixa o resto com a gente.</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            MP3 com sua tag → IA analisa BPM, key e gera variações de título + descrição + tags + capa.
            Você revisa, agenda e publica no YouTube. Tempo médio: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>1m48s</span>.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link href="/upload" className="btn-primary">
              <Upload size={14} strokeWidth={2.2} />
              Subir beat agora
            </Link>
            <Link
              href="/beats"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium transition"
              style={{ color: 'var(--text-secondary)' }}
            >
              Ver biblioteca
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* RODAPÉ — pipeline + api status */}
      <section className="grid grid-cols-1 gap-4 rise rise-4 md:grid-cols-3">
        <div
          className="col-span-1 rounded-xl p-5 md:col-span-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headphones size={13} style={{ color: 'var(--text-muted)' }} />
              <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                pipeline de produção
              </p>
            </div>
            <span className="font-mono text-[10px]" style={{ color: 'var(--text-subtle)' }}>
              auto · idempotente
            </span>
          </div>

          <ol className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { n: '01', t: 'Upload' },
              { n: '02', t: 'Convert' },
              { n: '03', t: 'Analyze' },
              { n: '04', t: 'Generate' },
              { n: '05', t: 'Publish' },
            ].map((s, i, arr) => (
              <li key={s.n} className="relative flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-md font-mono text-[10px] font-semibold"
                    style={{
                      background: i === 0 ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                      color: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {s.n}
                  </span>
                  {i < arr.length - 1 && (
                    <span
                      aria-hidden
                      className="hidden flex-1 md:block"
                      style={{ height: 1, background: 'var(--border-muted)' }}
                    />
                  )}
                </div>
                <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  {s.t}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div
          className="flex flex-col gap-3 rounded-xl p-5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
            system health
          </p>
          <div className="flex items-center gap-2">
            <span
              className={api.ok ? 'led led-pulse' : 'led'}
              style={{ color: api.ok ? 'var(--led-success)' : 'var(--led-error)' }}
            />
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
              API {api.ok ? 'operacional' : 'offline'}
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-subtle)' }}>
            <span className="font-mono uppercase tracking-wider">versão</span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>v{api.version ?? '?'}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-subtle)' }}>
            <span className="font-mono uppercase tracking-wider">latência</span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{api.ok ? '< 100ms' : '—'}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
