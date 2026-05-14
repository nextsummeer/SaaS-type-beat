'use client'

import type { AchievementRank, AchievementRankKey } from '@/lib/api'
import { SiriOrb, RANK_ORB_COLORS } from '@/components/SiriOrb'

// Cores de texto/glow do card por rank (separadas das cores do orb)
type RankAccent = {
  glow: string
  accentText: string
  barFrom: string
  barTo: string
}

const RANK_ACCENT: Record<AchievementRankKey, RankAccent> = {
  aprendiz: {
    glow: 'rgba(180, 185, 195, 0.30)',
    accentText: '#cdd2db',
    barFrom: '#6c707a',
    barTo: '#9aa0aa',
  },
  bronze: {
    glow: 'rgba(232, 122, 58, 0.55)',
    accentText: '#ffb380',
    barFrom: '#b04a0e',
    barTo: '#ffa572',
  },
  prata: {
    glow: 'rgba(200, 212, 224, 0.55)',
    accentText: '#dde5ed',
    barFrom: '#7a8a99',
    barTo: '#e0e8f0',
  },
  ouro: {
    glow: 'rgba(255, 176, 74, 0.65)',
    accentText: '#ffd56b',
    barFrom: '#e07012',
    barTo: '#ffe88a',
  },
  platina: {
    glow: 'rgba(111, 205, 224, 0.60)',
    accentText: '#a8e0ee',
    barFrom: '#3a8aa8',
    barTo: '#c2efff',
  },
  lenda: {
    glow: 'rgba(182, 92, 245, 0.70)',
    accentText: '#f0a8ff',
    barFrom: '#b65cf5',
    barTo: '#ff7ad9',
  },
}

export function AchievementRankCard({ rank }: { rank: AchievementRank }) {
  const accent = RANK_ACCENT[rank.key]
  const orbColors = RANK_ORB_COLORS[rank.key]

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-7"
      style={{
        background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))',
        border: '1px solid var(--border)',
      }}
    >
      {/* Glow ambient atrás */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: accent.glow, opacity: 0.4 }}
      />

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* SiriOrb 2D animada */}
        <div className="relative shrink-0">
          {/* Halo externo difuso */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full blur-2xl"
            style={{
              background: accent.glow,
              transform: 'scale(1.4)',
              opacity: 0.7,
            }}
          />
          <SiriOrb size="180px" colors={orbColors} animationDuration={20} />
        </div>

        {/* Info textual */}
        <div className="flex-1 text-center sm:text-left">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--text-subtle)' }}
          >
            seu rank atual
          </p>
          <p
            className="mt-1 font-display text-[44px] font-semibold leading-none tracking-tight"
            style={{ color: accent.accentText, textShadow: `0 0 24px ${accent.glow}` }}
          >
            {rank.name}
          </p>
          <p
            className="mt-1.5 text-[13px] leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {rank.description}
          </p>

          {!rank.is_max_rank && rank.next_rank_name && (
            <div className="mt-4 max-w-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="font-mono text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  faltam{' '}
                  <span style={{ color: accent.accentText }}>{rank.to_next}</span>{' '}
                  pra {rank.next_rank_name}
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
                    background: `linear-gradient(90deg, ${accent.barFrom}, ${accent.barTo})`,
                    boxShadow: `0 0 12px ${accent.glow}`,
                  }}
                />
              </div>
            </div>
          )}

          {rank.is_max_rank && (
            <p
              className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ color: accent.accentText }}
            >
              👑 Rank máximo atingido
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
