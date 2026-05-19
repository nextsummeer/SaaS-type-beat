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
    <header className="flex flex-col gap-6">
      {/* Linha 1: tagline mono + nav */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span
              className="led led-pulse"
              style={{ color: 'var(--accent)', width: 5, height: 5 }}
            />
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.22em',
                color: 'var(--text-muted)',
              }}
            >
              Console · Upload Schedule
            </span>
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: 44,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}
          >
            {NOMES_MESES[mes]}{' '}
            <span style={{ color: 'var(--text-muted)' }}>· {ano}</span>
          </h1>
          <p
            className="font-mono uppercase"
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.1em',
              color: 'var(--text-secondary)',
              marginTop: 4,
            }}
          >
            wk {wk} · {diaSemana}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={onMesAnterior}
            aria-label="Mês anterior"
            style={{ padding: 10 }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn-ghost font-mono"
            onClick={onHoje}
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: '10px 18px',
            }}
          >
            Hoje
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={onProximoMes}
            aria-label="Próximo mês"
            style={{ padding: 10 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Linha 2: contadores LED estilo console */}
      <div
        className="flex flex-wrap items-stretch gap-0"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
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
        alignSelf: 'stretch',
        background: 'var(--border)',
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
    <span
      className="flex flex-1 items-center gap-3"
      style={{ padding: '14px 20px', minWidth: 0 }}
    >
      <span
        className={pulse ? 'led led-pulse' : 'led'}
        style={{ color, width: 7, height: 7, flexShrink: 0 }}
      />
      <span
        className="num-hero tabular"
        style={{
          fontSize: 22,
          color: 'var(--text-primary)',
          minWidth: 24,
          lineHeight: 1,
        }}
      >
        {String(valor).padStart(2, '0')}
      </span>
      <span
        className="font-mono uppercase truncate"
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.14em',
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </span>
    </span>
  )
}
