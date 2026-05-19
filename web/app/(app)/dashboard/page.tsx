import Link from 'next/link'
import { healthCheck } from '@/lib/api'
import {
  Upload,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react'
import { DashboardGreeting } from '@/components/DashboardGreeting'
import { DashboardStats } from '@/components/DashboardStats'
import { ProximasPublicacoesWidget } from '@/components/agenda/ProximasPublicacoesWidget'

function SectionLabel({ num, label, rule = true }: { num: string; label: string; rule?: boolean }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <span
        className="font-mono"
        style={{
          fontSize: 10,
          color: 'var(--text-subtle)',
          letterSpacing: '0.22em',
        }}
      >
        {num}
      </span>
      <span
        className="font-mono uppercase"
        style={{
          fontSize: 10.5,
          fontWeight: 500,
          letterSpacing: '0.22em',
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </span>
      {rule && <span aria-hidden className="flex-1 hairline" />}
    </div>
  )
}

export default async function DashboardPage() {
  const api = await healthCheck()

  return (
    <div className="space-y-12">
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

      {/* STATS */}
      <section className="rise rise-2">
        <SectionLabel num="01" label="Métricas do canal" />
        <DashboardStats />
      </section>

      {/* PRÓXIMAS PUBLICAÇÕES */}
      <section className="rise rise-3">
        <SectionLabel num="02" label="Agenda" />
        <ProximasPublicacoesWidget />
      </section>

      {/* AÇÃO PRINCIPAL — upload */}
      <section className="rise rise-4">
        <SectionLabel num="03" label="Próximo passo" />
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Vinheta sutil roxa no canto — 1 toque cirúrgico */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -bottom-32 h-80 w-80 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(65,0,255,0.18), transparent 65%)',
              opacity: 0.6,
            }}
          />

          {/* Waveform decorativo branco sutil */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 md:block"
            style={{ opacity: 0.12 }}
          >
            <svg width="280" height="120" viewBox="0 0 280 120" fill="none">
              {Array.from({ length: 36 }).map((_, i) => {
                const h = 10 + Math.abs(Math.sin(i * 0.6) * 50) + Math.abs(Math.cos(i * 1.2) * 30)
                const x = i * 8
                return (
                  <rect key={i} x={x} y={(120 - h) / 2} width={3} height={h} rx={1.5} fill="#FFFFFF" />
                )
              })}
            </svg>
          </div>

          <div className="relative flex max-w-2xl flex-col gap-4 p-8">
            <h2
              className="font-display text-[34px] font-semibold leading-[1.04]"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.028em' }}
            >
              Suba seu próximo beat.<br />
              <span style={{ color: 'var(--text-muted)' }}>Deixa o resto com a gente.</span>
            </h2>
            <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)', maxWidth: 480 }}>
              MP3 com sua tag → IA analisa BPM, key e gera variações de título + descrição + tags + capa.
              Você revisa, agenda e publica no YouTube. Tempo médio:{' '}
              <span className="font-mono tabular" style={{ color: 'var(--text-primary)' }}>1m48s</span>.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <Link href="/upload" className="btn-primary">
                <Upload size={14} strokeWidth={2.2} />
                Subir beat agora
              </Link>
              <Link
                href="/beats"
                className="group inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                /* hover via tailwind */
              >
                Ver biblioteca
                <ChevronRight size={14} className="transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* RODAPÉ — pipeline + api status */}
      <section className="rise rise-5">
        <SectionLabel num="04" label="Sistema" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div
            className="col-span-1 rounded-2xl p-6 md:col-span-2"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <p
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  color: 'var(--text-secondary)',
                }}
              >
                Pipeline de produção
              </p>
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: 'var(--text-muted)',
                }}
              >
                auto · idempotente
              </span>
            </div>

            <ol className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                { n: '01', t: 'Upload' },
                { n: '02', t: 'Convert' },
                { n: '03', t: 'Analyze' },
                { n: '04', t: 'Generate' },
                { n: '05', t: 'Publish' },
              ].map((s, i, arr) => (
                <li key={s.n} className="relative flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-md font-mono font-semibold"
                      style={{
                        fontSize: 10,
                        background: i === 0 ? '#FFFFFF' : 'transparent',
                        color: i === 0 ? '#000000' : 'var(--text-muted)',
                        border: i === 0
                          ? '1px solid #FFFFFF'
                          : '1px solid var(--border-subtle)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {s.n}
                    </span>
                    {i < arr.length - 1 && (
                      <span
                        aria-hidden
                        className="hidden flex-1 md:block"
                        style={{ height: 1, background: 'var(--border-subtle)' }}
                      />
                    )}
                  </div>
                  <p
                    className="text-[12.5px] font-medium"
                    style={{ color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  >
                    {s.t}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div
            className="flex flex-col gap-3 rounded-2xl p-6"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <p
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                color: 'var(--text-secondary)',
              }}
            >
              System health
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
            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="font-mono uppercase" style={{ letterSpacing: '0.14em' }}>versão</span>
              <span className="font-mono tabular" style={{ color: 'var(--text-primary)' }}>v{api.version ?? '?'}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="font-mono uppercase" style={{ letterSpacing: '0.14em' }}>latência</span>
              <span className="font-mono tabular" style={{ color: 'var(--text-primary)' }}>{api.ok ? '< 100ms' : '—'}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
