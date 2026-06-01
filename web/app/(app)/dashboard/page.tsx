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
import { ActionPlanCard } from '@/components/dashboard/ActionPlanCard'

/** Constelação neural pulsante — IA conectando ideias.
   Pontos posicionados organicamente, linhas entre pares próximos,
   pulse delays escalonados pra dar ritmo. */
function NeuralConstellation() {
  const W = 340
  const H = 200
  // 16 nós posicionados manualmente em padrão orgânico
  const NODES: { x: number; y: number; r: number; hub?: boolean }[] = [
    { x: 30, y: 50, r: 2.5 },
    { x: 85, y: 28, r: 3 },
    { x: 145, y: 58, r: 4.5, hub: true },
    { x: 205, y: 22, r: 3 },
    { x: 275, y: 50, r: 2.5 },
    { x: 50, y: 100, r: 3 },
    { x: 110, y: 108, r: 3.5 },
    { x: 180, y: 100, r: 4.5, hub: true },
    { x: 245, y: 112, r: 3 },
    { x: 305, y: 95, r: 2.5 },
    { x: 28, y: 152, r: 2.5 },
    { x: 90, y: 165, r: 3.5 },
    { x: 158, y: 150, r: 3 },
    { x: 222, y: 168, r: 4, hub: true },
    { x: 285, y: 150, r: 3 },
    { x: 165, y: 18, r: 2 },
  ]
  // Pares conectados (índices em NODES)
  const EDGES: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [1, 6], [2, 7], [3, 8], [4, 9],
    [5, 6], [6, 7], [7, 8], [8, 9],
    [5, 10], [6, 11], [7, 12], [8, 13], [9, 14],
    [10, 11], [11, 12], [12, 13], [13, 14],
    [2, 15], [15, 3],
  ]

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <defs>
        <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF50D6" stopOpacity="1" />
          <stop offset="100%" stopColor="#4100FF" stopOpacity="0.85" />
        </radialGradient>
        <radialGradient id="nodeHubGrad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="40%" stopColor="#FF1ABE" stopOpacity="1" />
          <stop offset="100%" stopColor="#4100FF" stopOpacity="0.9" />
        </radialGradient>
        <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4100FF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FF1ABE" stopOpacity="0.35" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Arestas com pulse de opacidade */}
      {EDGES.map(([a, b], i) => {
        const na = NODES[a]
        const nb = NODES[b]
        return (
          <line
            key={`e-${i}`}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke="url(#edgeGrad)"
            strokeWidth={1}
          >
            <animate
              attributeName="opacity"
              values="0.25;0.7;0.25"
              dur={`${3.2 + (i % 4) * 0.4}s`}
              begin={`${(i * 0.13) % 2}s`}
              repeatCount="indefinite"
            />
          </line>
        )
      })}

      {/* Nós */}
      {NODES.map((n, i) => {
        const isHub = n.hub
        return (
          <g key={`n-${i}`}>
            {/* Halo (só nos hubs) */}
            {isHub && (
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r + 4}
                fill="url(#nodeGrad)"
                opacity={0.18}
                filter="url(#glow)"
              >
                <animate
                  attributeName="r"
                  values={`${n.r + 3};${n.r + 7};${n.r + 3}`}
                  dur={`${2.6 + (i % 3) * 0.4}s`}
                  begin={`${i * 0.15}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.10;0.35;0.10"
                  dur={`${2.6 + (i % 3) * 0.4}s`}
                  begin={`${i * 0.15}s`}
                  repeatCount="indefinite"
                />
              </circle>
            )}
            {/* Nó principal */}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={isHub ? 'url(#nodeHubGrad)' : 'url(#nodeGrad)'}
              filter={isHub ? 'url(#glow)' : undefined}
            >
              <animate
                attributeName="r"
                values={`${n.r * 0.85};${n.r * 1.15};${n.r * 0.85}`}
                dur={`${2 + (i % 4) * 0.3}s`}
                begin={`${(i * 0.18) % 1.8}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )
      })}
    </svg>
  )
}

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

      {/* PLANO DE AÇÃO — só aparece se o produtor fez onboarding (le localStorage).
        Card tem header proprio (Sparkles + "SUA TRILHA" sem numero) pra nao quebrar a numeracao
        das outras secoes. T8.5 vai trazer persistencia em DB + pagina /plano + sidebar nav. */}
      <ActionPlanCard />

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

          {/* Constelação neural — IA conectando ideias */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 md:block"
          >
            <NeuralConstellation />
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
