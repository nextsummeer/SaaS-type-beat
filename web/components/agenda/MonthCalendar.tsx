'use client'

import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  NOMES_DIAS_SEMANA,
  chaveLocal,
  ehMesmoMes,
  gridDoMes,
  mesmaData,
} from '@/lib/agenda'
import type { BeatListItem } from '@/lib/api'
import { BeatChip } from './BeatChip'

interface MonthCalendarProps {
  ano: number
  mes: number
  hoje: Date
  beatsPorDia: Map<string, BeatListItem[]>
  onDiaVazioClick: (data: Date) => void
}

const MAX_CHIPS_VISIVEIS = 3

export function MonthCalendar({
  ano,
  mes,
  hoje,
  beatsPorDia,
  onDiaVazioClick,
}: MonthCalendarProps) {
  const grid = gridDoMes(ano, mes)

  return (
    <section
      style={{
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Cabecalho de dias da semana */}
      <div
        className="grid grid-cols-7"
        style={{
          borderBottom: '1px solid var(--border-strong)',
          background: 'var(--bg-base)',
        }}
      >
        {NOMES_DIAS_SEMANA.map((nome, idx) => {
          const ehFimSemana = idx === 0 || idx === 6
          return (
            <div
              key={nome}
              className="font-mono"
              style={{
                padding: '12px 14px',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.18em',
                color: ehFimSemana ? 'var(--text-subtle)' : 'var(--text-muted)',
                borderRight: idx === 6 ? 'none' : '1px solid var(--border)',
              }}
            >
              {nome}
            </div>
          )
        })}
      </div>

      {/* Grid 6x7 */}
      <div className="grid grid-cols-7 grid-rows-6">
        {grid.flat().map((dia, idx) => {
          const linha = Math.floor(idx / 7)
          const colunaUltima = idx % 7 === 6
          const ultimaLinha = linha === 5
          return (
            <DayCell
              key={`${chaveLocal(dia)}-${idx}`}
              data={dia}
              ano={ano}
              mes={mes}
              hoje={hoje}
              beats={beatsPorDia.get(chaveLocal(dia)) ?? []}
              ehUltimaColuna={colunaUltima}
              ehUltimaLinha={ultimaLinha}
              onClickVazio={() => onDiaVazioClick(dia)}
              riseDelay={linha * 0.04}
            />
          )
        })}
      </div>
    </section>
  )
}

interface DayCellProps {
  data: Date
  ano: number
  mes: number
  hoje: Date
  beats: BeatListItem[]
  ehUltimaColuna: boolean
  ehUltimaLinha: boolean
  onClickVazio: () => void
  riseDelay: number
}

function DayCell({
  data,
  ano,
  mes,
  hoje,
  beats,
  ehUltimaColuna,
  ehUltimaLinha,
  onClickVazio,
  riseDelay,
}: DayCellProps) {
  const router = useRouter()
  const ehDoMesAtual = ehMesmoMes(data, ano, mes)
  const ehHoje = mesmaData(data, hoje)
  const ehPassado =
    data.getTime() < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime()
  const ehFimSemana = data.getDay() === 0 || data.getDay() === 6
  const dropId = `cell-${chaveLocal(data)}`
  const { isOver, setNodeRef } = useDroppable({
    id: dropId,
    data: { date: data },
    disabled: ehPassado,
  })
  const podeAgendar = !ehPassado && beats.length === 0

  const visiveis = beats.slice(0, MAX_CHIPS_VISIVEIS)
  const extras = Math.max(0, beats.length - MAX_CHIPS_VISIVEIS)

  // Background da celula: hoje ganha tinta sutil de accent pra brilhar
  const bgCelula = isOver
    ? 'var(--accent-muted)'
    : ehHoje
      ? 'rgba(255, 255, 255, 0.035)'
      : 'transparent'

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (!podeAgendar) return
        // Só dispara se o click foi na própria célula (não em chip)
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.cellBg === '1') {
          onClickVazio()
        }
      }}
      data-cell-bg="1"
      className="rise group relative flex min-h-[118px] flex-col p-2.5 transition-colors"
      style={{
        background: bgCelula,
        borderRight: ehUltimaColuna ? 'none' : '1px solid var(--border)',
        borderBottom: ehUltimaLinha ? 'none' : '1px solid var(--border)',
        opacity: ehDoMesAtual ? 1 : 0.45,
        cursor: podeAgendar ? 'pointer' : 'default',
        animationDelay: `${riseDelay}s`,
        outline: isOver ? '1px solid var(--accent)' : ehHoje ? '1px solid var(--accent-line)' : 'none',
        outlineOffset: '-1px',
      }}
      onMouseEnter={(e) => {
        if (!podeAgendar || isOver) return
        e.currentTarget.style.background = ehHoje
          ? 'rgba(255, 255, 255, 0.065)'
          : 'rgba(255,255,255,0.025)'
      }}
      onMouseLeave={(e) => {
        if (!podeAgendar || isOver) return
        e.currentTarget.style.background = bgCelula
      }}
    >
      {/* Numero do dia + indicador hoje */}
      <div
        className="flex items-start justify-between"
        data-cell-bg="1"
        style={{ pointerEvents: 'none' }}
      >
        <span
          className="font-mono tabular"
          style={{
            fontSize: 14,
            fontWeight: ehHoje ? 700 : 500,
            color: ehHoje
              ? 'var(--accent)'
              : ehDoMesAtual
                ? ehFimSemana
                  ? 'var(--text-muted)'
                  : 'var(--text-primary)'
                : 'var(--text-muted)',
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}
        >
          {String(data.getDate()).padStart(2, '0')}
        </span>
        {ehHoje && (
          <span
            className="led led-pulse"
            style={{ color: 'var(--accent)', width: 6, height: 6, marginTop: 4 }}
          />
        )}
      </div>

      {/* "+" central no hover de célula vazia */}
      {podeAgendar && !isOver && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{
              background: 'var(--accent-muted)',
              border: '1px dashed var(--accent-line)',
              color: 'var(--accent)',
            }}
          >
            <Plus size={16} strokeWidth={2.4} />
          </span>
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              color: 'var(--accent)',
            }}
          >
            Programar
          </span>
        </div>
      )}

      {/* Indicador de drop ativo */}
      {isOver && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: 'var(--accent)',
              padding: '5px 10px',
              background: 'var(--bg-base)',
              border: '1px solid var(--accent)',
              borderRadius: 4,
              boxShadow: 'var(--shadow-glow-accent)',
            }}
          >
            Soltar aqui
          </span>
        </div>
      )}

      {/* Chips dos beats no dia */}
      {visiveis.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1" style={{ position: 'relative', zIndex: 1 }}>
          {visiveis.map((beat) => (
            <BeatChip
              key={beat.id}
              beat={beat}
              onClick={() => router.push(`/beats/${beat.id}/review`)}
            />
          ))}
          {extras > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                // Por enquanto so navega pro primeiro extra
                const proximo = beats[MAX_CHIPS_VISIVEIS]
                if (proximo) router.push(`/beats/${proximo.id}/review`)
              }}
              className="font-mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              +{extras} mais
            </button>
          )}
        </div>
      )}
    </div>
  )
}
