'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Upload,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  Coins,
  Check,
} from 'lucide-react'
import {
  buildActionPlan,
  buildMetas,
  type Answers,
  type Meta,
  type MetaCategory,
} from '@/lib/actionPlan'
import { savePlan } from '@/lib/actionPlanStorage'

export type PlanPhase = 'generating' | 'done'

type Props = {
  answers: Answers
  phase: PlanPhase
  setPhase: (p: PlanPhase) => void
}

const META_ICONS: Record<MetaCategory, typeof Upload> = {
  volume: Upload,
  crescimento: TrendingUp,
  vendas: Coins,
  loja: ShoppingBag,
  qualidade: Sparkles,
}

const META_LABELS: Record<MetaCategory, string> = {
  volume: 'VOLUME',
  crescimento: 'CRESCIMENTO',
  vendas: 'VENDAS',
  loja: 'LOJA',
  qualidade: 'QUALIDADE',
}

/**
 * Estagios do mock loading do plano. Total ~4.2s -- intencional:
 *   1. Curto o bastante pra nao virar tedio
 *   2. Longo o bastante pra parecer que "algo de verdade ta acontecendo"
 *   3. Reusa o mesmo orb signature do resto da plataforma
 *
 * Como o plano e gerado por TEMPLATE (nao IA -- ver decisao em
 * `project_onboarding_e_plano_de_acao` na memoria), o tempo aqui e
 * proposital: dar peso ao momento emocional, nao processar de verdade.
 */
const GENERATION_STAGES = [
  { label: 'Lendo suas respostas', duration: 900 },
  { label: 'Calculando suas metas', duration: 1100 },
  { label: 'Montando sua trilha', duration: 1300 },
  { label: 'Finalizando', duration: 900 },
]

export function PlanRevealStep({ answers, phase, setPhase }: Props) {
  const metas = useMemo(() => buildMetas(answers), [answers])
  const tasks = useMemo(() => buildActionPlan(answers), [answers])

  // Salva metas + tarefas no localStorage assim que a geracao termina.
  useEffect(() => {
    if (phase === 'done') {
      savePlan(metas, tasks)
    }
  }, [phase, metas, tasks])

  if (phase === 'generating') {
    return <PlanGenerating onDone={() => setPhase('done')} />
  }
  return <PlanRevealed metas={metas} tasks={tasks} />
}

/* ───────────────────────── Generating ───────────────────────── */

function PlanGenerating({ onDone }: { onDone: () => void }) {
  const [stageIndex, setStageIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    let acc = 0
    GENERATION_STAGES.forEach((stage, i) => {
      acc += stage.duration
      if (i < GENERATION_STAGES.length - 1) {
        timers.push(
          setTimeout(() => {
            if (!cancelled) setStageIndex(i + 1)
          }, acc),
        )
      }
    })
    timers.push(
      setTimeout(() => {
        if (!cancelled) onDone()
      }, acc),
    )
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [onDone])

  return (
    <div className="flex flex-col items-center gap-9 py-4">
      {/* Header acima do orb -- antecipa o que vai acontecer */}
      <div className="rise rise-1 flex flex-col items-center gap-3 text-center">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-muted)',
          }}
        >
          MONTANDO SEU PLANO
        </span>
        <h1
          className="font-display text-[26px] font-semibold leading-[1.1] tracking-tight sm:text-[34px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.025em',
          }}
        >
          Estamos criando um plano exclusivo
          <br />
          baseado no que você nos disse.
        </h1>
      </div>

      {/* Orb -- mesmo padrao do CoverStep / YouTubeStep (1 anel + halos + reflexo) */}
      <div className="rise rise-2 relative flex h-72 w-72 items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse-slow"
          style={{
            background:
              'radial-gradient(circle, rgba(65,0,255,0.48), transparent 62%)',
            filter: 'blur(22px)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 68% 38%, rgba(255,26,190,0.42), transparent 58%)',
            filter: 'blur(30px)',
            animation: 'pulse-slow 3.4s ease-in-out infinite',
            animationDelay: '-1.2s',
          }}
        />
        <span
          aria-hidden
          className="absolute"
          style={{
            width: '92%',
            height: '92%',
            borderRadius: '50%',
            border: '1px dashed rgba(199, 181, 255, 0.28)',
            animation: 'rotate-slow 14s linear infinite',
          }}
        />
        <div
          className="relative h-44 w-44 animate-orb-morph"
          style={{
            background:
              'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, transparent 28%), linear-gradient(135deg, #4100FF 0%, #FF1ABE 100%)',
            boxShadow:
              '0 0 80px rgba(65,0,255,0.55), 0 0 120px rgba(255,26,190,0.30), inset 0 0 44px rgba(255,255,255,0.18), inset -20px -30px 60px rgba(0,0,0,0.34)',
          }}
        >
          <span
            aria-hidden
            className="absolute"
            style={{
              top: '20%',
              left: '24%',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.70)',
              filter: 'blur(8px)',
            }}
          />
        </div>
      </div>

      {/* Estagio atual */}
      <div className="rise rise-3 flex flex-col items-center gap-1 text-center">
        <span
          className="font-display text-[19px] font-semibold sm:text-[22px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.018em',
          }}
        >
          {GENERATION_STAGES[stageIndex].label}
          <DotPulse />
        </span>
      </div>

      {/* Chain de estagios */}
      <div className="rise rise-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {GENERATION_STAGES.map((stage, i) => {
          const done = i < stageIndex
          const active = i === stageIndex
          return (
            <span
              key={stage.label}
              className="font-mono uppercase tabular flex items-center gap-1.5"
              style={{
                fontSize: 9.5,
                letterSpacing: '0.18em',
                color: done
                  ? 'var(--text-muted)'
                  : active
                    ? 'var(--text-primary)'
                    : 'var(--text-subtle)',
                opacity: done ? 0.7 : 1,
              }}
            >
              {done && (
                <Check
                  size={10}
                  strokeWidth={2.5}
                  style={{ color: 'var(--led-success)' }}
                />
              )}
              {stage.label}
              {i < GENERATION_STAGES.length - 1 && (
                <span style={{ color: 'var(--text-subtle)', marginLeft: 8 }}>
                  ·
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function DotPulse() {
  return (
    <span
      aria-hidden
      className="ml-1 inline-flex items-end gap-0.5"
      style={{ color: 'var(--text-muted)' }}
    >
      <span className="animate-pulse-slow" style={{ animationDelay: '0s' }}>
        .
      </span>
      <span className="animate-pulse-slow" style={{ animationDelay: '0.2s' }}>
        .
      </span>
      <span className="animate-pulse-slow" style={{ animationDelay: '0.4s' }}>
        .
      </span>
    </span>
  )
}

/* ───────────────────────── Done (revelacao das metas) ───────────────────────── */

function PlanRevealed({
  metas,
  tasks,
}: {
  metas: Meta[]
  tasks: ReturnType<typeof buildActionPlan>
}) {
  return (
    <div className="flex flex-col gap-9">
      {/* Header */}
      <div className="rise rise-1 flex flex-col gap-3">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-muted)',
          }}
        >
          FINAL — SUAS METAS
        </span>
        <h1
          className="font-display text-[32px] font-semibold leading-[1.05] tracking-tight sm:text-[42px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.028em',
          }}
        >
          Aqui vão suas metas pros próximos 30 dias.
        </h1>
        <p
          className="max-w-xl text-[14.5px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Essas metas movem o que realmente importa — tráfego, audiência,
          conversão.{' '}
          <span style={{ color: 'var(--text-secondary)' }}>
            Quando elas batem, venda vem em sequência.
          </span>
        </p>
      </div>

      {/* Metas cards */}
      <div className="rise rise-2 flex flex-col gap-2.5">
        {metas.map((meta, i) => (
          <MetaCard key={meta.id} meta={meta} index={i} />
        ))}
      </div>

      {/* Pointer pra aba Plano */}
      <div
        className="rise rise-3 flex flex-col gap-2 rounded-xl p-4"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <Sparkles
            size={13}
            strokeWidth={1.8}
            style={{ color: 'var(--text-secondary)' }}
          />
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              color: 'var(--text-muted)',
            }}
          >
            PLANO COMPLETO
          </span>
        </div>
        <p
          className="text-[13.5px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          A trilha completa com {tasks.length} passos detalhados (como
          configurar canal, precificação, branding, conversão) está te
          esperando lá na aba{' '}
          <span style={{ color: 'var(--text-primary)' }}>Plano</span> da
          plataforma.
        </p>
      </div>
    </div>
  )
}

function MetaCard({ meta, index }: { meta: Meta; index: number }) {
  const Icon = META_ICONS[meta.category]
  const number = String(index + 1).padStart(2, '0')

  return (
    <div
      className="group relative flex items-start gap-4 overflow-hidden rounded-xl p-4 transition-all"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,26,190,0.08), transparent 65%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-1.5 pt-0.5">
        <span
          className="font-mono tabular"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          {number}
        </span>
      </div>

      <div
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <Icon
          size={15}
          strokeWidth={1.8}
          style={{ color: 'var(--text-secondary)' }}
        />
      </div>

      <div className="relative flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 9.5,
              letterSpacing: '0.22em',
              color: 'var(--text-subtle)',
            }}
          >
            {META_LABELS[meta.category]}
          </span>
        </div>
        <span
          className="font-display text-[15.5px] font-semibold leading-tight"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.018em',
          }}
        >
          {meta.title}
        </span>
        {meta.subtitle && (
          <span
            className="text-[12.5px] leading-snug"
            style={{ color: 'var(--text-muted)' }}
          >
            {meta.subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
