'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Upload,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  Coins,
  Compass,
  ArrowRight,
} from 'lucide-react'
import { loadPlan, type StoredPlan } from '@/lib/actionPlanStorage'
import {
  CATEGORIES,
  type ActionTask,
  type Category,
  type Meta,
  type MetaCategory,
} from '@/lib/actionPlan'

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

export default function PlanoPage() {
  const [plan, setPlan] = useState<StoredPlan | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setPlan(loadPlan())
  }, [])

  if (!mounted) return null
  if (!plan || (plan.metas.length === 0 && plan.tasks.length === 0)) {
    return <EmptyState />
  }

  return <PlanoContent plan={plan} />
}

/* ───────────────────────── Empty state ───────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col gap-8">
      <div className="rise rise-1 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <Compass
            size={13}
            strokeWidth={1.8}
            style={{ color: 'var(--text-muted)' }}
          />
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              color: 'var(--text-muted)',
            }}
          >
            PLANO
          </span>
        </div>
        <h1
          className="font-display text-[36px] font-semibold leading-[1.05] tracking-tight sm:text-[44px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.028em',
          }}
        >
          Você ainda não tem um plano.
        </h1>
        <p
          className="max-w-xl text-[14.5px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Faça o onboarding em 2 minutos e a gente monta uma trilha
          personalizada de metas + tarefas baseada na sua realidade — onde
          você tá hoje e onde quer chegar.
        </p>
      </div>

      <div className="rise rise-2">
        <Link href="/onboarding" className="btn-primary">
          <Sparkles size={14} strokeWidth={2} />
          Fazer onboarding
          <ArrowRight size={14} strokeWidth={2} />
        </Link>
      </div>
    </div>
  )
}

/* ───────────────────────── Conteudo principal ───────────────────────── */

function PlanoContent({ plan }: { plan: StoredPlan }) {
  const byCategory = new Map<Category, ActionTask[]>()
  for (const cat of CATEGORIES) byCategory.set(cat.id, [])
  for (const t of plan.tasks) byCategory.get(t.category)?.push(t)

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <div className="rise rise-1 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <Compass
            size={13}
            strokeWidth={1.8}
            style={{ color: 'var(--text-muted)' }}
          />
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              color: 'var(--text-muted)',
            }}
          >
            SEU PLANO
          </span>
        </div>
        <h1
          className="font-display text-[36px] font-semibold leading-[1.05] tracking-tight sm:text-[44px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.028em',
          }}
        >
          Trilha do produtor profissional.
        </h1>
        <p
          className="max-w-2xl text-[14.5px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Suas metas pros próximos 30 dias + a trilha completa de tarefas que
          te tira de iniciante pra produtor que vive disso. Conteúdo
          educacional de cada tópico chegando em breve.
        </p>
      </div>

      {/* Metas */}
      {plan.metas.length > 0 && (
        <section className="rise rise-2 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span
              className="font-mono tabular"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                color: 'var(--text-subtle)',
              }}
            >
              01
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
              Metas dos próximos 30 dias
            </span>
            <span aria-hidden className="hairline flex-1" />
          </div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {plan.metas.map((m, i) => (
              <MetaRow key={m.id} meta={m} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Tarefas detalhadas */}
      {plan.tasks.length > 0 && (
        <section className="rise rise-3 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span
              className="font-mono tabular"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                color: 'var(--text-subtle)',
              }}
            >
              02
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
              Trilha de tarefas
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
              {String(plan.tasks.length).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col gap-7">
            {CATEGORIES.map((cat) => {
              const catTasks = byCategory.get(cat.id) ?? []
              if (catTasks.length === 0) return null
              return (
                <div key={cat.id} className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="font-mono uppercase"
                      style={{
                        fontSize: 10,
                        letterSpacing: '0.22em',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {cat.label}
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
                      {String(catTasks.length).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    {catTasks.map((t, i) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        index={i}
                        isFirst={i === 0}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Footer note */}
      <p
        className="rise rise-4 text-[13px]"
        style={{ color: 'var(--text-subtle)' }}
      >
        Em breve: cada tarefa abre um guia passo a passo (como configurar
        BeatStars, precificação, branding visual etc.). Por enquanto a trilha
        ta mapeada — fica de olho.
      </p>
    </div>
  )
}

function MetaRow({ meta, index }: { meta: Meta; index: number }) {
  const Icon = META_ICONS[meta.category]
  return (
    <div
      className="relative flex items-start gap-3 overflow-hidden rounded-xl p-4"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,26,190,0.06), transparent 65%)',
        }}
      />
      <span
        className="relative font-mono tabular pt-0.5"
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
        <span
          className="font-display text-[14.5px] font-semibold leading-tight"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.018em',
          }}
        >
          {meta.title}
        </span>
        {meta.subtitle && (
          <span
            className="text-[12px] leading-snug"
            style={{ color: 'var(--text-muted)' }}
          >
            {meta.subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

function TaskRow({
  task,
  index,
  isFirst,
}: {
  task: ActionTask
  index: number
  isFirst: boolean
}) {
  return (
    <div
      className="flex items-start gap-4 py-3"
      style={{
        borderTop: isFirst ? '1px solid var(--border-subtle)' : undefined,
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <span
        className="font-mono tabular pt-0.5"
        style={{
          fontSize: 10,
          letterSpacing: '0.22em',
          color: 'var(--text-subtle)',
          minWidth: 24,
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <span
          className="font-display text-[15px] font-semibold leading-tight"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.015em',
          }}
        >
          {task.title}
        </span>
        <span
          className="text-[12.5px] leading-snug"
          style={{ color: 'var(--text-muted)' }}
        >
          {task.description}
        </span>
      </div>
      <span
        className="font-mono uppercase pt-0.5"
        style={{
          fontSize: 9,
          letterSpacing: '0.18em',
          color: 'var(--text-subtle)',
          minWidth: 18,
          textAlign: 'right',
        }}
      >
        {task.effort}
      </span>
    </div>
  )
}
