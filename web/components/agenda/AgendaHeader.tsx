'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { NOMES_MESES, nomeDiaSemanaCheio, numeroDaSemanaISO } from '@/lib/agenda'

interface ContadoresHeader {
  agendados: number
  publicando: number
  publicadosNoMes: number
  rascunhos: number
}

interface AgendaHeaderProps {
  ano: number
  mes: number
  hoje: Date
  contadores: ContadoresHeader
  onMesAnterior: () => void
  onProximoMes: () => void
  onHoje: () => void
}

export function AgendaHeader({
  ano,
  mes,
  hoje,
  contadores,
  onMesAnterior,
  onProximoMes,
  onHoje,
}: AgendaHeaderProps) {
  const wk = numeroDaSemanaISO(hoje)
  const diaSemana = nomeDiaSemanaCheio(hoje)

  return (
    <header className="flex flex-col gap-5">
      {/* Linha 1: tagline mono + nav */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              color: 'var(--text-subtle)',
            }}
          >
            Console · Upload Schedule
          </span>
          <h1
            className="font-display"
            style={{
              fontSize: 38,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}
          >
            {NOMES_MESES[mes]}{' '}
            <span style={{ color: 'var(--text-subtle)' }}>· {ano}</span>
          </h1>
          <p
            className="font-mono uppercase"
            style={{
              fontSize: 11,
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            wk {wk} · {diaSemana}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="btn-ghost"
            onClick={onMesAnterior}
            aria-label="Mês anterior"
            style={{ padding: 8 }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="btn-ghost font-mono"
            onClick={onHoje}
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '8px 14px',
            }}
          >
            Hoje
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={onProximoMes}
            aria-label="Próximo mês"
            style={{ padding: 8 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Linha 2: contadores LED estilo console */}
      <div
        className="flex flex-wrap items-center gap-2"
        style={{
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <CounterChip
          color="var(--led-info)"
          label="Agendados"
          valor={contadores.agendados}
        />
        <Divider />
        <CounterChip
          color="var(--led-warning)"
          label="Publicando"
          valor={contadores.publicando}
          pulse={contadores.publicando > 0}
        />
        <Divider />
        <CounterChip
          color="var(--led-success)"
          label="Publicados no mês"
          valor={contadores.publicadosNoMes}
        />
        <Divider />
        <CounterChip
          color="var(--led-draft)"
          label="Rascunhos"
          valor={contadores.rascunhos}
        />
      </div>
    </header>
  )
}

function Divider() {
  return (
    <span
      aria-hidden
      style={{
        width: 1,
        height: 22,
        background: 'var(--border)',
        margin: '0 6px',
      }}
    />
  )
}

function CounterChip({
  color,
  label,
  valor,
  pulse,
}: {
  color: string
  label: string
  valor: number
  pulse?: boolean
}) {
  return (
    <span className="flex items-center gap-2.5" style={{ padding: '2px 8px' }}>
      <span
        className={pulse ? 'led led-pulse' : 'led'}
        style={{ color, width: 6, height: 6 }}
      />
      <span
        className="num-hero tabular"
        style={{
          fontSize: 18,
          color: 'var(--text-primary)',
          minWidth: 18,
        }}
      >
        {String(valor).padStart(2, '0')}
      </span>
      <span
        className="font-mono uppercase"
        style={{
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
    </span>
  )
}
