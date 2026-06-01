'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { loadPlan, type StoredPlan } from '@/lib/actionPlanStorage'
import { categoryLabel } from '@/lib/actionPlan'

/**
 * Card "Sua trilha" no dashboard. Le do localStorage (T8.4 prototype).
 * Em T8.5 isso le do Supabase com estado de marcacao por tarefa.
 *
 * Retorna null se nao tem plano salvo (produtor que ainda nao fez onboarding).
 * O dashboard usa esse "null" pra esconder a secao toda.
 */
export function ActionPlanCard() {
  const [plan, setPlan] = useState<StoredPlan | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setPlan(loadPlan())
  }, [])

  if (!mounted) return null
  if (!plan || plan.tasks.length === 0) return null

  const total = plan.tasks.length
  const completed = 0 // T8.5 vai trazer estado real de tarefa concluida
  const percent = total > 0 ? (completed / total) * 100 : 0
  const next = plan.tasks.slice(0, 3)

  return (
    <section className="rise rise-3">
      {/* Header sem numero -- "SUA TRILHA" e secao especial, nao mais uma do sistema */}
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
          Sua trilha
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
          {String(completed).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl p-7"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-purple)',
        }}
      >
        {/* Glow magenta sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255,26,190,0.12), transparent 65%)',
          }}
        />

        <div className="relative flex flex-col gap-6">
          {/* Heading + progresso */}
          <div className="flex flex-col gap-3">
            <p
              className="font-display text-[20px] font-semibold leading-tight"
              style={{
                color: 'var(--text-primary)',
                letterSpacing: '-0.018em',
              }}
            >
              Próximas tarefas
            </p>
            <div
              className="relative h-[2px] overflow-hidden rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${percent}%`,
                  background: 'var(--gradient-primary)',
                }}
              />
            </div>
          </div>

          {/* Lista de proximas tarefas */}
          <div className="flex flex-col">
            {next.map((t, i) => (
              <div
                key={t.id}
                className="flex items-start gap-4 py-3"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
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
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-display text-[14px] font-semibold leading-tight"
                      style={{
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.015em',
                      }}
                    >
                      {t.title}
                    </span>
                    <span
                      className="font-mono uppercase"
                      style={{
                        fontSize: 9,
                        letterSpacing: '0.18em',
                        color: 'var(--text-subtle)',
                      }}
                    >
                      · {categoryLabel(t.category)}
                    </span>
                  </div>
                  <span
                    className="text-[12px] leading-snug"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t.description}
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
                  {t.effort}
                </span>
              </div>
            ))}
          </div>

          {/* Footer: total + nota de progresso real chegando */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <span
              className="text-[12px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Total de{' '}
              <span style={{ color: 'var(--text-secondary)' }}>
                {total} tarefas
              </span>{' '}
              na sua trilha
            </span>
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 9.5,
                letterSpacing: '0.22em',
                color: 'var(--text-subtle)',
              }}
            >
              em breve · marcar concluído
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
