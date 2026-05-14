'use client'

import type { AchievementRank, AchievementRankKey } from '@/lib/api'

// Gradientes únicos por rank (não confundir com tier de conquista individual)
const RANK_GRADIENTS: Record<
  AchievementRankKey,
  { c1: string; c2: string; c3: string; glow: string; accentText: string }
> = {
  aprendiz: {
    c1: '#5a5a63',
    c2: '#3a3a44',
    c3: '#1c1c22',
    glow: 'rgba(120, 120, 130, 0.35)',
    accentText: '#a8a8b3',
  },
  bronze: {
    c1: '#ff8c5a',
    c2: '#c4621f',
    c3: '#6b2f0e',
    glow: 'rgba(255, 140, 90, 0.5)',
    accentText: '#ffaa78',
  },
  prata: {
    c1: '#e8eef5',
    c2: '#94a3b8',
    c3: '#475569',
    glow: 'rgba(180, 195, 215, 0.55)',
    accentText: '#cbd5e1',
  },
  ouro: {
    c1: '#ffd76b',
    c2: '#ff8a1a',
    c3: '#a83a00',
    glow: 'rgba(255, 138, 26, 0.65)',
    accentText: '#ffc862',
  },
  platina: {
    c1: '#a8e1f0',
    c2: '#5fb3c9',
    c3: '#1e6a82',
    glow: 'rgba(95, 179, 201, 0.55)',
    accentText: '#94d4e6',
  },
  lenda: {
    // Multicolor: rosa → roxo → laranja (visual épico estilo Opal)
    c1: '#ff6ec7',
    c2: '#a855f7',
    c3: '#3b1255',
    glow: 'rgba(168, 85, 247, 0.6)',
    accentText: '#e9a5ff',
  },
}

export function AchievementRankCard({ rank }: { rank: AchievementRank }) {
  const colors = RANK_GRADIENTS[rank.key]
  const orbSize = 132

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-7"
      style={{
        background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))',
        border: '1px solid var(--border)',
      }}
    >
      {/* Glow sutil de fundo na cor do rank */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full blur-3xl"
        style={{ background: colors.glow, opacity: 0.4 }}
      />

      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
        {/* Esfera grande do rank */}
        <div
          className="relative shrink-0"
          style={{ width: orbSize, height: orbSize }}
        >
          {/* Glow externo */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full blur-2xl"
            style={{
              background: colors.glow,
              transform: 'scale(1.3)',
              opacity: 0.8,
            }}
          />
          <svg
            width={orbSize}
            height={orbSize}
            viewBox={`0 0 ${orbSize} ${orbSize}`}
            className="relative"
            style={{ filter: 'drop-shadow(0 0 16px ' + colors.glow + ')' }}
          >
            <defs>
              <radialGradient id={`rank-grad-${rank.key}`} cx="35%" cy="28%" r="78%">
                <stop offset="0%" stopColor={colors.c1} />
                <stop offset="55%" stopColor={colors.c2} />
                <stop offset="100%" stopColor={colors.c3} />
              </radialGradient>
              <radialGradient id={`rank-highlight-${rank.key}`} cx="35%" cy="22%" r="32%">
                <stop offset="0%" stopColor="white" stopOpacity="0.65" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle
              cx={orbSize / 2}
              cy={orbSize / 2}
              r={orbSize / 2 - 2}
              fill={`url(#rank-grad-${rank.key})`}
              stroke={colors.c2}
              strokeOpacity="0.5"
              strokeWidth="1"
            />
            <circle
              cx={orbSize / 2}
              cy={orbSize / 2}
              r={orbSize / 2 - 2}
              fill={`url(#rank-highlight-${rank.key})`}
            />
          </svg>
        </div>

        {/* Info do rank */}
        <div className="flex-1 text-center sm:text-left">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--text-subtle)' }}
          >
            seu rank atual
          </p>
          <p
            className="mt-1 font-display text-[42px] font-semibold leading-none tracking-tight"
            style={{ color: colors.accentText }}
          >
            {rank.name}
          </p>
          <p
            className="mt-1.5 text-[13px] leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {rank.description}
          </p>

          {/* Barra de progresso pro próximo rank */}
          {!rank.is_max_rank && rank.next_rank_name && (
            <div className="mt-4 max-w-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="font-mono text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  faltam{' '}
                  <span style={{ color: colors.accentText }}>{rank.to_next}</span>
                  {' '}pra {rank.next_rank_name}
                </span>
                <span
                  className="font-mono text-[10px]"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {Math.round(rank.progress_pct)}%
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${rank.progress_pct}%`,
                    background: `linear-gradient(90deg, ${colors.c2}, ${colors.c1})`,
                    boxShadow: `0 0 10px ${colors.glow}`,
                  }}
                />
              </div>
            </div>
          )}

          {rank.is_max_rank && (
            <p
              className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ color: colors.accentText }}
            >
              👑 Rank máximo atingido
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
