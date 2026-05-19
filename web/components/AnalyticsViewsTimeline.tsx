'use client'

import { useRef, useState } from 'react'
import type {
  AnalyticsViewsTimeline as TimelineData,
  AnalyticsTimelineMetric,
} from '@/lib/api'

const METRICS_LABEL: Record<AnalyticsTimelineMetric, { label: string; suffix: string }> = {
  views: { label: 'Views', suffix: 'views' },
  subscribersGained: { label: 'Inscritos', suffix: 'inscritos' },
}

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

export function AnalyticsViewsTimeline({
  data,
  metric,
  onMetricChange,
}: {
  data: TimelineData
  metric: AnalyticsTimelineMetric
  onMetricChange: (m: AnalyticsTimelineMetric) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ x: number; idx: number; clientX: number; clientY: number } | null>(null)

  const pontos = data.points
  const max = Math.max(data.max_views, 1)

  if (pontos.length === 0) {
    return (
      <div
        className="flex h-[200px] items-center justify-center rounded-2xl text-sm"
        style={{
          background: 'var(--bg-surface)',
          border: '1px dashed var(--border-subtle)',
          color: 'var(--text-muted)',
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
    const xPx = e.clientX - rect.left
    const xSvg = (xPx / rect.width) * W

    if (xSvg < PAD_X || xSvg > W - PAD_X) {
      setHover(null)
      return
    }

    let idx = Math.round((xSvg - PAD_X) / step)
    if (idx < 0) idx = 0
    if (idx > coords.length - 1) idx = coords.length - 1

    setHover({
      x: coords[idx].x,
      idx,
      clientX: 0,
      clientY: 0,
    })
  }

  const pontoHover = hover ? coords[hover.idx] : null

  // Posicionamento inteligente do tooltip SVG:
  // - 110px de largura
  // - Se ponto perto da borda esquerda, alinha à direita
  // - Se perto da direita, alinha à esquerda
  // - Senão, centralizado
  const TT_W = 110
  const TT_H = 52
  let ttX = 0
  let ttY = 0
  if (pontoHover) {
    // Centralizar X no ponto
    ttX = pontoHover.x - TT_W / 2
    if (ttX < PAD_X) ttX = PAD_X
    if (ttX + TT_W > W - PAD_X) ttX = W - PAD_X - TT_W
    // Posicionar Y acima do ponto, mas se ficar muito perto do topo, joga abaixo
    ttY = pontoHover.y - TT_H - 10
    if (ttY < PAD_TOP) ttY = pontoHover.y + 14
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl p-5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {/* Toggle de métrica */}
        <div
          className="inline-flex items-center rounded-md p-0.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}
        >
          {(['views', 'subscribersGained'] as const).map((m) => {
            const ativo = metric === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => onMetricChange(m)}
                className="rounded-md px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] transition-colors"
                style={{
                  background: ativo ? 'rgba(255,255,255,0.07)' : 'transparent',
                  color: ativo ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {METRICS_LABEL[m].label}
              </button>
            )
          })}
        </div>

        <p
          className="font-mono uppercase tracking-[0.16em]"
          style={{ fontSize: 10, color: 'var(--text-muted)' }}
        >
          pico:{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {data.max_views.toLocaleString('pt-BR')}
          </span>
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
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
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
              stroke="rgba(255,255,255,0.05)"
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
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* Área sob a linha */}
          <path d={pathArea} fill="url(#areaGrad)" />

          {/* Linha principal */}
          <path
            d={pathLine}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Pontos sutis — só mostra com poucos pontos.
             Com muitos pontos (>14) só destaca o hover pra ficar limpo */}
          {coords.length <= 14
            ? coords.map((c, i) => (
                <circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r={hover?.idx === i ? 5 : 3}
                  fill="var(--bg-surface)"
                  stroke="#FFFFFF"
                  strokeWidth={hover?.idx === i ? 2 : 1.25}
                  style={{ transition: 'r 0.12s, stroke-width 0.12s' }}
                  pointerEvents="none"
                />
              ))
            : pontoHover && (
                <circle
                  cx={pontoHover.x}
                  cy={pontoHover.y}
                  r={5}
                  fill="var(--bg-surface)"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              )}

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
                fill="var(--text-muted)"
                fontFamily="var(--font-mono)"
              >
                {formataData(c.date, data.granularity)}
              </text>
            )
          })}

          {/* Tooltip SVG — dentro do viewBox, escala junto, nunca corta */}
          {pontoHover && (
            <g pointerEvents="none">
              <rect
                x={ttX}
                y={ttY}
                width={TT_W}
                height={TT_H}
                rx={8}
                fill="#0A0A0C"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1"
              />
              <text
                x={ttX + 10}
                y={ttY + 16}
                fontSize="9"
                fill="var(--text-muted)"
                fontFamily="var(--font-mono)"
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                {formataDataLonga(pontoHover.date, data.granularity)}
              </text>
              <text
                x={ttX + 10}
                y={ttY + 36}
                fontSize="16"
                fontWeight="600"
                fill="#FFFFFF"
                fontFamily="var(--font-display)"
              >
                {pontoHover.views.toLocaleString('pt-BR')}
              </text>
              <text
                x={ttX + 10}
                y={ttY + 46}
                fontSize="8"
                fill="var(--text-muted)"
              >
                {pontoHover.views === 1
                  ? METRICS_LABEL[metric].suffix.replace(/s$/, '')
                  : METRICS_LABEL[metric].suffix}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
