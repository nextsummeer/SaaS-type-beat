'use client'

type Periodo = '7d' | '30d' | '90d'

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
]

export type { Periodo }

export function AnalyticsPeriodSelector({
  value,
  onChange,
}: {
  value: Periodo
  onChange: (p: Periodo) => void
}) {
  return (
    <div
      className="inline-flex items-center rounded-lg p-1"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {PERIODOS.map((p) => {
        const ativo = value === p.value
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className="rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors"
            style={{
              background: ativo ? 'var(--bg-elevated)' : 'transparent',
              color: ativo ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
