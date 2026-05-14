'use client'

import { useRef, useState } from 'react'
import type { AnalyticsViewsTimeline as TimelineData } from '@/lib/api'

function formataData(iso: string, granularity: 'day' | 'month'): string {
  // Granularidade day: '2026-05-07'
  // Granularidade month: '202605' (YYYYMM)
  if (granularity === 'month' && iso.length === 6) {
    const ano = iso.slice(0, 4)
    const mes = parseInt(iso.slice(4, 6), 10)
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${nomes[mes - 1]}/${ano.slice(2)}`
  }
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch {
    return iso
  }
}

function formataDataLonga(iso: string, granularity: 'day' | 'month'): string {
  if (granularity === 'month' && iso.length === 6) {
    return formataData(iso, granularity)
  }
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
  } catch {
    return iso
  }
}

const W = 800
const H = 200
const PAD_X = 24
const PAD_TOP = 20
const PAD_BOT = 32

export function AnalyticsViewsTimeline({ data }: { data: TimelineData }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ x: number; idx: number; clientX: number; clientY: number } | null>(null)

  const pontos = data.points
  const max = Math.max(data.max_views, 1)

  if (pontos.length === 0) {
    return (
      <div
        className="flex h-[200px] items-center justify-center rounded-xl text-sm"
        style={{
          background: 'var(--bg-surface)',
          border: '1px dashed var(--border)',
          color: 'var(--text-subtle)',
        }}
      >
        Sem dados no período
      </div>
    )
  }

  const innerW = W - PAD_X * 2
  const innerH = H - PAD_TOP - PAD_BOT
  const step = pontos.length > 1 ? innerW / (pontos.length - 1) : 0

  // Pontos do polyline (SVG path)
  const coords = pontos.map((p, i) => {
    const x = PAD_X + i * step
    const y = PAD_TOP + innerH - (p.views / max) * innerH
    return { x, y, ...p }
  })

  const pathLine = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const pathArea = [
    `M ${coords[0].x} ${PAD_TOP + innerH}`,
    ...coords.map((c) => `L ${c.x} ${c.y}`),
    `L ${coords[coords.length - 1].x} ${PAD_TOP + innerH}`,
    'Z',
  ].join(' ')

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    // Posição relativa no SVG (em unidades do viewBox)
    const xPx = e.clientX - rect.left
    const xSvg = (xPx / rect.width) * W

    if (xSvg < PAD_X || xSvg > W - PAD_X) {
      setHover(null)
      return
    }

    // Acha o índice do ponto mais próximo no eixo X
    let idx = Math.round((xSvg - PAD_X) / step)
    if (idx < 0) idx = 0
    if (idx > coords.length - 1) idx = coords.length - 1

    setHover({
      x: coords[idx].x,
      idx,
      clientX: e.clientX - rect.left,
      clientY: e.clientY - rect.top,
    })
  }

  const pontoHover = hover ? coords[hover.idx] : null

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl p-5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p
          className="font-mono text-[10px] font-medium uppercase tracking-[0.18em]"
          style={{ color: 'var(--text-subtle)' }}
        >
          Views por {data.granularity === 'month' ? 'mês' : 'dia'}
        </p>
        <p
          className="font-mono text-[10px] uppercase tracking-wider"
          style={{ color: 'var(--text-subtle)' }}
        >
          pico: <span style={{ color: 'var(--text-secondary)' }}>{data.max_views.toLocaleString('pt-BR')}</span>
        </p>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-[200px] w-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: 'crosshair' }}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Linhas de grade horizontais */}
          {[0, 0.33, 0.66, 1].map((frac) => (
            <line
              key={frac}
              x1={PAD_X}
              x2={W - PAD_X}
              y1={PAD_TOP + innerH * frac}
              y2={PAD_TOP + innerH * frac}
              stroke="var(--border-muted)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          ))}

          {/* Crosshair vertical no hover */}
          {pontoHover && (
            <line
              x1={pontoHover.x}
              x2={pontoHover.x}
              y1={PAD_TOP}
              y2={PAD_TOP + innerH}
              stroke="var(--accent)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.6"
            />
          )}

          {/* Área sob a linha */}
          <path d={pathArea} fill="url(#areaGrad)" />

          {/* Linha principal */}
          <path
            d={pathLine}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Pontos sutis (não interativos individualmente) */}
          {coords.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={hover?.idx === i ? 5 : 3}
              fill="var(--bg-surface)"
              stroke="var(--accent)"
              strokeWidth={hover?.idx === i ? 2.5 : 1.5}
              style={{ transition: 'r 0.12s, stroke-width 0.12s' }}
              pointerEvents="none"
            />
          ))}

          {/* Labels do eixo X (primeiro, meio, último) */}
          {[0, Math.floor(coords.length / 2), coords.length - 1].map((idx) => {
            if (idx < 0 || idx >= coords.length || (idx > 0 && idx === Math.floor(coords.length / 2) && coords.length < 4)) return null
            const c = coords[idx]
            return (
              <text
                key={idx}
                x={c.x}
                y={H - 10}
                textAnchor={idx === 0 ? 'start' : idx === coords.length - 1 ? 'end' : 'middle'}
                fontSize="10"
                fill="var(--text-subtle)"
                fontFamily="var(--font-mono)"
              >
                {formataData(c.date, data.granularity)}
              </text>
            )
          })}
        </svg>

        {/* Tooltip flutuante que segue o cursor */}
        {hover && pontoHover && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg px-3 py-2 shadow-lg"
            style={{
              left: `${(hover.x / W) * 100}%`,
              top: 0,
              transform: `translate(-50%, -110%)`,
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-strong)',
              boxShadow: '0 6px 20px -4px rgba(0,0,0,0.5)',
              minWidth: '120px',
            }}
          >
            <p
              className="font-mono text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              {formataDataLonga(pontoHover.date, data.granularity)}
            </p>
            <p
              className="mt-0.5 font-display text-[18px] font-semibold leading-none tabular"
              style={{ color: 'var(--accent)' }}
            >
              {pontoHover.views.toLocaleString('pt-BR')}
            </p>
            <p
              className="mt-0.5 text-[10px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {pontoHover.views === 1 ? 'view' : 'views'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
