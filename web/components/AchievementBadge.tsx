'use client'

import { Lock } from 'lucide-react'
import type { AchievementTier } from '@/lib/api'

interface Props {
  tier: AchievementTier
  unlocked: boolean
  /** Tamanho da esfera em px. Default 80 */
  size?: number
  /** Se true, mostra animação pulse (recém-desbloqueada) */
  pulse?: boolean
  /** Texto curto exibido dentro da esfera quando desbloqueada (ex: '✓' ou número) */
  badge?: string
}

const TIER_GRADIENTS: Record<AchievementTier, { c1: string; c2: string; c3: string; glow: string }> = {
  bronze: {
    // Tons de cobre/laranja escuro
    c1: '#ff8c5a',
    c2: '#c4621f',
    c3: '#6b2f0e',
    glow: 'rgba(255, 140, 90, 0.45)',
  },
  silver: {
    // Tons de azul-prata
    c1: '#dbeafe',
    c2: '#94a3b8',
    c3: '#475569',
    glow: 'rgba(148, 163, 184, 0.5)',
  },
  gold: {
    // Tons de laranja vibrante / dourado
    c1: '#ffd76b',
    c2: '#ff8a1a',
    c3: '#a83a00',
    glow: 'rgba(255, 138, 26, 0.6)',
  },
}

export function AchievementBadge({ tier, unlocked, size = 80, pulse = false, badge }: Props) {
  const colors = TIER_GRADIENTS[tier]
  const r = size / 2

  if (!unlocked) {
    return (
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        <Lock
          size={size * 0.35}
          strokeWidth={1.5}
          style={{ color: 'var(--text-subtle)' }}
        />
      </div>
    )
  }

  return (
    <div
      className={`relative ${pulse ? 'animate-pulse-slow' : ''}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Glow externo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full blur-xl"
        style={{
          background: colors.glow,
          transform: 'scale(1.4)',
          opacity: 0.7,
        }}
      />

      {/* Esfera com gradient radial */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative"
        style={{ filter: 'drop-shadow(0 0 12px ' + colors.glow + ')' }}
      >
        <defs>
          {/* Gradient radial — destaque no canto superior-esquerdo, base sombreada */}
          <radialGradient
            id={`grad-${tier}-${size}`}
            cx="35%"
            cy="30%"
            r="75%"
          >
            <stop offset="0%" stopColor={colors.c1} />
            <stop offset="50%" stopColor={colors.c2} />
            <stop offset="100%" stopColor={colors.c3} />
          </radialGradient>

          {/* Highlight (brilho no topo) */}
          <radialGradient
            id={`highlight-${tier}-${size}`}
            cx="35%"
            cy="25%"
            r="35%"
          >
            <stop offset="0%" stopColor="white" stopOpacity="0.55" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Esfera principal */}
        <circle
          cx={r}
          cy={r}
          r={r - 1}
          fill={`url(#grad-${tier}-${size})`}
          stroke={colors.c2}
          strokeWidth="0.5"
          strokeOpacity="0.4"
        />

        {/* Highlight */}
        <circle
          cx={r}
          cy={r}
          r={r - 1}
          fill={`url(#highlight-${tier}-${size})`}
        />

        {/* Badge interno (opcional) */}
        {badge && (
          <text
            x={r}
            y={r + size * 0.08}
            textAnchor="middle"
            fontSize={size * 0.25}
            fontWeight="700"
            fill="white"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
          >
            {badge}
          </text>
        )}
      </svg>
    </div>
  )
}
