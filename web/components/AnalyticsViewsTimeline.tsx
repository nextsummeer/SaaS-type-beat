'use client'

import { useState } from 'react'
import type { AnalyticsViewsTimeline as TimelineData } from '@/lib/api'

function formataData(iso: string, granularity: 'day' | 'month'): string {
  // Granularidade day: '2026-05-07'
  // Granularidade month: '202605' (YYYYMM)
  if (granularity === 'month' && iso.length === 6) {
    const ano = iso.slice(0, 4)
    const mes = parseInt(iso.slice(4, 6), 10)
    const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    return `${nomes[mes - 1]}/${ano.slice(2)}`
  }
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch {
    return iso
  }
}

export function AnalyticsViewsTimeline({ data }: { data: TimelineData }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const pontos = data.points
  const max = Math.max(data.max_views, 1)

  if (pontos.length === 0) {
    return (
      <div
        className="flex h-[180px] items-center justify-center rounded-xl text-sm"
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

  // SVG dimensões — viewBox responsivo
  const W = 800
  const H = 180
  const padX = 20
  const padTop = 14
  const padBot = 28
  const innerW = W - padX * 2
  const innerH = H - padTop - padBot
  const step = pontos.length > 1 ? innerW / (pontos.length - 1) : 0

  // Pontos do polyline (SVG path)
  const coords = pontos.map((p, i) => {
    const x = padX + i * step
    const y = padTop + innerH - (p.views / max) * innerH
    return { x, y, ...p }
  })

  const pathLine = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  // Path da área (fill embaixo da linha)
  const pathArea = [
    `M ${coords[0].x} ${padTop + innerH}`,
    ...coords.map((c) => `L ${c.x} ${c.y}`),
    `L ${coords[coords.length - 1].x} ${padTop + innerH}`,
    'Z',
  ].join(' ')

  return (
    <div
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
        {hoverIdx !== null && coords[hoverIdx] && (
          <p className="text-[12px] tabular" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {coords[hoverIdx].views.toLocaleString('pt-BR')}
            </span>
            {' '}
            <span style={{ color: 'var(--text-subtle)' }}>
              em {formataData(coords[hoverIdx].date, data.granularity)}
            </span>
          </p>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[180px] w-full"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Linhas de grade horizontais (4 níveis) */}
        {[0, 0.33, 0.66, 1].map((frac) => (
          <line
            key={frac}
            x1={padX}
            x2={W - padX}
            y1={padTop + innerH * frac}
            y2={padTop + innerH * frac}
            stroke="var(--border-muted)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
        ))}

        {/* Área sob a linha */}
        <path d={pathArea} fill="url(#areaGrad)" />

        {/* Linha */}
        <path
          d={pathLine}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Pontos clicáveis (invisíveis grandes pra facilitar hover, visíveis pequenos) */}
        {coords.map((c, i) => (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r={3.5}
              fill="var(--bg-surface)"
              stroke="var(--accent)"
              strokeWidth="2"
              opacity={hoverIdx === i ? 1 : 0.7}
            />
            <rect
              x={c.x - step / 2}
              y={padTop}
              width={Math.max(step, 20)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}

        {/* Labels do eixo X (primeiro, meio, último) */}
        {[0, Math.floor(coords.length / 2), coords.length - 1].map((idx) => {
          if (idx < 0 || idx >= coords.length) return null
          const c = coords[idx]
          return (
            <text
              key={idx}
              x={c.x}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-subtle)"
              fontFamily="var(--font-mono)"
            >
              {formataData(c.date, data.granularity)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
