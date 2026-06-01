'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Upload,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  Coins,
  ChevronRight,
} from 'lucide-react'
import { loadPlan, type StoredPlan } from '@/lib/actionPlanStorage'
import type { Meta, MetaCategory } from '@/lib/actionPlan'

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
 * Card de metas no dashboard. Le do localStorage (T8.4 prototype).
 * Returns null se o produtor ainda nao fez onboarding -- o dashboard
 * naturalmente esconde a secao toda.
 *
 * As metas sao o nivel de alto contraste pro produtor saber o que quer
 * atingir nos primeiros 30 dias. O conteudo detalhado (tarefas, dicas,
 * eventualmente guias) vive em /plano.
 */
export function ActionPlanCard() {
  const [plan, setPlan] = useState<StoredPlan | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setPlan(loadPlan())
  }, [])

  if (!mounted) return null
  if (!plan || plan.metas.length === 0) return null

  const total = plan.metas.length

  return (
    <section className="rise rise-3">
      {/* Header sem numero -- secao especial, nao do sistema */}
      <div className="mb-5 flex items-center gap-3">
        <Sparkles
          size={12}
          strokeWidth={2}
          style={{ color: 'var(--magenta-bright)' }}
        />
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: '0.22em',
            color: 'var(--text-primary)',
          }}
        >
          Suas metas
        </span>
        <span aria-hidden className="hairline flex-1" />
        <span
          className="font-mono tabular"
          style={{
            fontSize: 10,
            letterSpacing: '0.06em',
            color: 'var(--text-subtle)',
          }}
        >
          {String(total).padStart(2, '0')}
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-purple)',
        }}
      >
        {/* Glow magenta sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,26,190,0.10), transparent 65%)',
          }}
        />

        <div className="relative flex flex-col gap-5">
          {/* Heading */}
          <div className="flex items-baseline justify-between gap-3">
            <p
              className="font-display text-[18px] font-semibold leading-tight"
              style={{
                color: 'var(--text-primary)',
                letterSpacing: '-0.018em',
              }}
            >
              Próximos 30 dias
            </p>
            <span
              className="text-[12px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {total} {total === 1 ? 'meta' : 'metas'}
            </span>
          </div>

          {/* Lista de metas */}
          <div className="flex flex-col gap-2">
            {plan.metas.map((m, i) => (
              <MetaRow key={m.id} meta={m} index={i} />
            ))}
          </div>

          {/* CTA pro /plano */}
          <div
            className="flex items-center justify-between gap-4 pt-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <span
              className="text-[12px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Trilha completa + dicas estão em{' '}
              <span style={{ color: 'var(--text-secondary)' }}>Plano</span>
            </span>
            <Link
              href="/plano"
              className="group inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Ver plano
              <ChevronRight
                size={14}
                strokeWidth={2}
                className="transition group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function MetaRow({ meta, index }: { meta: Meta; index: number }) {
  const Icon = META_ICONS[meta.category]
  return (
    <div
      className="flex items-start gap-3 py-2"
      style={{ borderTop: index > 0 ? '1px solid var(--border-subtle)' : undefined }}
    >
      <span
        className="font-mono tabular pt-1"
        style={{
          fontSize: 10,
          letterSpacing: '0.22em',
          color: 'var(--text-subtle)',
          minWidth: 22,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md mt-0.5"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <Icon
          size={13}
          strokeWidth={1.8}
          style={{ color: 'var(--text-secondary)' }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 9,
              letterSpacing: '0.22em',
              color: 'var(--text-subtle)',
            }}
          >
            {META_LABELS[meta.category]}
          </span>
        </div>
        <span
          className="font-display text-[13.5px] font-semibold leading-tight"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.015em',
          }}
        >
          {meta.title}
        </span>
      </div>
    </div>
  )
}
