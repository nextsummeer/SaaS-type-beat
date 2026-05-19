'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DateTimePickerProps {
  value: Date | null
  onChange: (date: Date) => void
  minDate?: Date
  placeholder?: string
}

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formataLabel(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d).replace('.', '')
}

function mesmaData(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function gerarGridMes(year: number, month: number): (Date | null)[] {
  const primeiroDia = new Date(year, month, 1).getDay()
  const ultimoDia = new Date(year, month + 1, 0).getDate()
  const grid: (Date | null)[] = []
  for (let i = 0; i < primeiroDia; i++) grid.push(null)
  for (let d = 1; d <= ultimoDia; d++) grid.push(new Date(year, month, d))
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

export function DateTimePicker({ value, onChange, minDate, placeholder = 'Selecionar data e hora' }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  function fallbackInicial(): Date {
    const d = new Date()
    d.setHours(18, 0, 0, 0)
    return d
  }
  const valorRef = value ?? fallbackInicial()

  const [mesExibido, setMesExibido] = useState(new Date(valorRef.getFullYear(), valorRef.getMonth(), 1))
  const [dataSelecionada, setDataSelecionada] = useState<Date>(valorRef)
  const [hora, setHora] = useState(valorRef.getHours())
  const [minuto, setMinuto] = useState(valorRef.getMinutes())

  useEffect(() => {
    if (open) {
      const base = value ?? fallbackInicial()
      setMesExibido(new Date(base.getFullYear(), base.getMonth(), 1))
      setDataSelecionada(base)
      setHora(base.getHours())
      setMinuto(base.getMinutes())
    }
  }, [open, value])

  useEffect(() => {
    if (!open) return
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickFora)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickFora)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const grid = gerarGridMes(mesExibido.getFullYear(), mesExibido.getMonth())
  const hoje = new Date()
  const minTimestamp = minDate?.getTime() ?? 0

  function selecionarDia(d: Date) {
    setDataSelecionada(d)
  }

  function ajustarHora(delta: number) {
    setHora((h) => ((h + delta + 24) % 24))
  }

  function ajustarMinuto(delta: number) {
    setMinuto((m) => ((m + delta + 60) % 60))
  }

  function confirmar() {
    const nova = new Date(
      dataSelecionada.getFullYear(),
      dataSelecionada.getMonth(),
      dataSelecionada.getDate(),
      hora,
      minuto,
      0,
      0,
    )
    onChange(nova)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm transition"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-medium)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" style={{ color: value ? 'var(--text-primary)' : 'var(--text-subtle)' }} />
          <span className={value ? 'capitalize' : ''} style={{ color: value ? 'var(--text-primary)' : 'var(--text-subtle)' }}>
            {value ? formataLabel(value) : placeholder}
          </span>
        </span>
        <ChevronRight
          className={`h-4 w-4 transition ${open ? 'rotate-90' : ''}`}
          style={{ color: 'var(--text-subtle)' }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-2 origin-top rounded-xl p-4"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Navegação do mês */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMesExibido(new Date(mesExibido.getFullYear(), mesExibido.getMonth() - 1, 1))}
              className="rounded-md p-1.5 transition"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {MESES[mesExibido.getMonth()]} {mesExibido.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setMesExibido(new Date(mesExibido.getFullYear(), mesExibido.getMonth() + 1, 1))}
              className="rounded-md p-1.5 transition"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Dias da semana */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DIAS_SEMANA.map((d, i) => (
              <div
                key={i}
                className="text-center font-mono uppercase"
                style={{ fontSize: 9.5, letterSpacing: '0.12em', color: 'var(--text-subtle)' }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              if (!d) return <div key={i} />
              const ehHoje = mesmaData(d, hoje)
              const ehSelecionado = mesmaData(d, dataSelecionada)
              const desabilitado = minTimestamp > 0 && d.getTime() < new Date(minTimestamp).setHours(0, 0, 0, 0)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={desabilitado}
                  onClick={() => selecionarDia(d)}
                  className="relative aspect-square rounded-md text-xs transition tabular"
                  style={{
                    background: ehSelecionado ? '#FFFFFF' : 'transparent',
                    color: ehSelecionado
                      ? '#000'
                      : desabilitado
                        ? 'var(--text-subtle)'
                        : 'var(--text-secondary)',
                    fontWeight: ehSelecionado ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!ehSelecionado && !desabilitado) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!ehSelecionado && !desabilitado) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  {d.getDate()}
                  {ehHoje && !ehSelecionado && (
                    <span
                      className="absolute bottom-1 left-1/2 h-0.5 w-1 -translate-x-1/2 rounded-full"
                      style={{ background: '#FFFFFF' }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Time picker */}
          <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
            <div
              className="mb-2 font-mono uppercase"
              style={{ fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--text-muted)' }}
            >
              Horário
            </div>
            <div className="flex items-center justify-center gap-3">
              <TimeField
                value={hora}
                onIncrement={() => ajustarHora(1)}
                onDecrement={() => ajustarHora(-1)}
                onChange={(v) => setHora(Math.max(0, Math.min(23, v)))}
                max={23}
              />
              <span className="text-2xl font-bold" style={{ color: 'var(--text-subtle)' }}>:</span>
              <TimeField
                value={minuto}
                onIncrement={() => ajustarMinuto(5)}
                onDecrement={() => ajustarMinuto(-5)}
                onChange={(v) => setMinuto(Math.max(0, Math.min(59, v)))}
                max={59}
              />
              <span className="ml-2 font-mono uppercase" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--text-muted)' }}>24h</span>
            </div>
          </div>

          {/* Confirmar */}
          <button
            type="button"
            onClick={confirmar}
            className="btn-primary mt-4 w-full justify-center"
          >
            Confirmar
          </button>
        </div>
      )}
    </div>
  )
}

interface TimeFieldProps {
  value: number
  onIncrement: () => void
  onDecrement: () => void
  onChange: (v: number) => void
  max: number
}

function TimeField({ value, onIncrement, onDecrement, onChange, max }: TimeFieldProps) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onIncrement}
        className="rounded-md p-1 transition"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
        aria-label="Aumentar"
      >
        <ChevronLeft className="h-3 w-3 rotate-90" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={String(value).padStart(2, '0')}
        onChange={(e) => {
          const num = parseInt(e.target.value.replace(/\D/g, '') || '0', 10)
          onChange(Math.min(num, max))
        }}
        className="w-12 rounded-md px-2 py-1.5 text-center text-lg font-semibold tabular outline-none transition"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
      />
      <button
        type="button"
        onClick={onDecrement}
        className="rounded-md p-1 transition"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
        aria-label="Diminuir"
      >
        <ChevronLeft className="h-3 w-3 -rotate-90" />
      </button>
    </div>
  )
}
