'use client'

import { useEffect, useMemo } from 'react'
import {
  Upload,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  Coins,
} from 'lucide-react'
import {
  buildActionPlan,
  buildMetas,
  type Answers,
  type Meta,
  type MetaCategory,
} from '@/lib/actionPlan'
import { savePlan } from '@/lib/actionPlanStorage'

type Props = {
  answers: Answers
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

export function PlanRevealStep({ answers }: Props) {
  const metas = useMemo(() => buildMetas(answers), [answers])
  const tasks = useMemo(() => buildActionPlan(answers), [answers])

  // Salva metas + tarefas no localStorage assim que o produtor chega aqui.
  useEffect(() => {
    savePlan(metas, tasks)
  }, [metas, tasks])

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
      {/* Vinheta sutil magenta no canto */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,26,190,0.08), transparent 65%)',
        }}
      />

      {/* Numero badge */}
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

      {/* Icon */}
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

      {/* Conteudo */}
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
