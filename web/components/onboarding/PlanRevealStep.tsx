'use client'

import { useEffect, useMemo } from 'react'
import {
  buildActionPlan,
  CATEGORIES,
  type ActionTask,
  type Answers,
  type Category,
} from '@/lib/actionPlan'
import { savePlan } from '@/lib/actionPlanStorage'

type Props = {
  answers: Answers
}

export function PlanRevealStep({ answers }: Props) {
  const tasks = useMemo(() => buildActionPlan(answers), [answers])

  const byCategory = useMemo(() => {
    const map = new Map<Category, ActionTask[]>()
    for (const cat of CATEGORIES) map.set(cat.id, [])
    for (const t of tasks) map.get(t.category)?.push(t)
    return map
  }, [tasks])

  // Salva o plano no localStorage assim que o produtor chega nesta tela.
  // Re-renders com mesmas respostas sao idempotentes (sobrescreve o mesmo plano).
  useEffect(() => {
    savePlan(tasks)
  }, [tasks])

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
          FINAL — SUA TRILHA
        </span>
        <h1
          className="font-display text-[32px] font-semibold leading-[1.05] tracking-tight sm:text-[42px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.028em',
          }}
        >
          Sua trilha está pronta.
        </h1>
        <p
          className="max-w-xl text-[14.5px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Baseado no que você me disse, montei{' '}
          <span
            className="font-display font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {tasks.length} tarefas
          </span>{' '}
          que vão te tirar de "tô começando" pra "tô vendendo todo mês". Em
          ordem de prioridade.
        </p>
      </div>

      {/* Reframe do placar — o "trabalho nº 1" do plano, destacado */}
      <div
        className="rise rise-2 relative overflow-hidden rounded-xl p-5"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-purple)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,26,190,0.15), transparent 65%)',
          }}
        />
        <div className="relative flex flex-col gap-2.5">
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              color: 'var(--magenta-bright)',
            }}
          >
            ANTES DE TUDO
          </span>
          <p
            className="font-display text-[20px] font-semibold leading-snug sm:text-[24px]"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.018em',
            }}
          >
            Não comemore venda no primeiro mês.
          </p>
          <p
            className="text-[13.5px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Venda de type beat leva 2-3 meses (algoritmo aprende → impressão →
            clique → o cara decide gravar e lançar → ele compra). Mês 1 e 2,
            você comemora{' '}
            <span style={{ color: 'var(--text-primary)' }}>indicador</span>:
            constância, CTR subindo, retenção crescendo. Venda é consequência —
            e ela vem.
          </p>
        </div>
      </div>

      {/* Tarefas agrupadas por categoria */}
      <div className="rise rise-3 flex flex-col gap-7">
        {CATEGORIES.map((cat) => {
          const catTasks = byCategory.get(cat.id) ?? []
          if (catTasks.length === 0) return null
          return (
            <div key={cat.id} className="flex flex-col gap-3">
              {/* Header da categoria */}
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
              {/* Lista de tarefas da categoria */}
              <div className="flex flex-col">
                {catTasks.map((t, i) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    index={i}
                    isFirst={i === 0}
                    isLast={i === catTasks.length - 1}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p
        className="rise rise-4 max-w-md text-center text-[13px] leading-relaxed sm:mx-auto"
        style={{ color: 'var(--text-muted)' }}
      >
        Seu plano vai estar te esperando no dashboard. Comece pela tarefa{' '}
        <span
          className="font-mono tabular"
          style={{ color: 'var(--text-secondary)' }}
        >
          01
        </span>{' '}
        e segue o ritmo.
      </p>
    </div>
  )
}

function TaskRow({
  task,
  index,
  isFirst,
  isLast,
}: {
  task: ActionTask
  index: number
  isFirst: boolean
  isLast: boolean
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
