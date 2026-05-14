'use client'

import type { AchievementRank, AchievementRankKey } from '@/lib/api'

// Cada rank tem uma paleta iridescente (4-5 cores que se misturam no orb).
// Inspiração: bolhas de sabão / metaball 3D / orbs holográficas.
type RankPalette = {
  c1: string // cor principal (centro/topo)
  c2: string // secundária
  c3: string // contraste
  c4: string // acento
  c5: string // reflexo
  glow: string
  accentText: string
}

const RANK_PALETTES: Record<AchievementRankKey, RankPalette> = {
  aprendiz: {
    c1: '#9aa0aa',
    c2: '#6c707a',
    c3: '#4a4d56',
    c4: '#2a2c33',
    c5: '#c5c7cf',
    glow: 'rgba(154, 160, 170, 0.35)',
    accentText: '#b8bcc4',
  },
  bronze: {
    c1: '#ffa572',
    c2: '#e87a3a',
    c3: '#b04a0e',
    c4: '#6b2f0e',
    c5: '#ffd6b2',
    glow: 'rgba(232, 122, 58, 0.55)',
    accentText: '#ffb380',
  },
  prata: {
    c1: '#f5f7fa',
    c2: '#c8d4e0',
    c3: '#7a8a99',
    c4: '#3a4655',
    c5: '#e0e8f0',
    glow: 'rgba(200, 212, 224, 0.55)',
    accentText: '#dde5ed',
  },
  ouro: {
    c1: '#ffe88a',
    c2: '#ffb04a',
    c3: '#e07012',
    c4: '#8a3a00',
    c5: '#fff2b8',
    glow: 'rgba(255, 176, 74, 0.65)',
    accentText: '#ffd56b',
  },
  platina: {
    c1: '#c2efff',
    c2: '#6fcde0',
    c3: '#3a8aa8',
    c4: '#1e4d62',
    c5: '#e0f5ff',
    glow: 'rgba(111, 205, 224, 0.6)',
    accentText: '#a8e0ee',
  },
  lenda: {
    // Iridescente épico — rosa / magenta / roxo / ciano / dourado
    c1: '#ff7ad9',
    c2: '#b65cf5',
    c3: '#5cb0ff',
    c4: '#3b1255',
    c5: '#ffd06b',
    glow: 'rgba(182, 92, 245, 0.7)',
    accentText: '#f0a8ff',
  },
}

export function AchievementRankCard({ rank }: { rank: AchievementRank }) {
  const p = RANK_PALETTES[rank.key]
  const orbSize = 140

  // Múltiplas camadas de radial-gradient empilhadas criam efeito iridescente.
  // Cada blob de cor sai de um canto diferente, simulando reflexos de orb fluida.
  const orbBackground = `
    radial-gradient(circle at 28% 22%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 22%),
    radial-gradient(circle at 65% 75%, ${p.c5} 0%, transparent 35%),
    radial-gradient(circle at 75% 30%, ${p.c1} 0%, transparent 45%),
    radial-gradient(circle at 25% 65%, ${p.c2} 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, ${p.c3} 0%, transparent 70%),
    conic-gradient(from 200deg at 50% 50%, ${p.c1}, ${p.c2}, ${p.c4}, ${p.c3}, ${p.c1})
  `.trim()

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-7"
      style={{
        background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))',
        border: '1px solid var(--border)',
      }}
    >
      {/* Glow ambient atrás de tudo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: p.glow, opacity: 0.45 }}
      />

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* Orb fluido do rank */}
        <div
          className="relative shrink-0"
          style={{ width: orbSize, height: orbSize }}
        >
          {/* Halo externo difuso */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full blur-2xl"
            style={{
              background: p.glow,
              transform: 'scale(1.35)',
              opacity: 0.85,
            }}
          />

          {/* Orb principal: forma orgânica que morpha lentamente */}
          <div
            className="animate-orb-morph relative h-full w-full"
            style={{
              background: orbBackground,
              boxShadow: [
                `0 8px 32px ${p.glow}`,
                `inset 0 -8px 24px rgba(0,0,0,0.35)`,
                `inset 4px 6px 18px rgba(255,255,255,0.15)`,
              ].join(', '),
              filter: 'saturate(1.15) contrast(1.05)',
            }}
          />

          {/* Camada de "vidro" com highlight superior — fica fixa pra parecer reflexo */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(ellipse 60% 35% at 30% 18%, rgba(255,255,255,0.6) 0%, transparent 60%)',
              mixBlendMode: 'screen',
              borderRadius: 'inherit',
            }}
          />
        </div>

        {/* Info textual do rank */}
        <div className="flex-1 text-center sm:text-left">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--text-subtle)' }}
          >
            seu rank atual
          </p>
          <p
            className="mt-1 font-display text-[44px] font-semibold leading-none tracking-tight"
            style={{ color: p.accentText, textShadow: `0 0 24px ${p.glow}` }}
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
                  <span style={{ color: p.accentText }}>{rank.to_next}</span>{' '}
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
                    background: `linear-gradient(90deg, ${p.c3}, ${p.c1})`,
                    boxShadow: `0 0 12px ${p.glow}`,
                  }}
                />
              </div>
            </div>
          )}

          {rank.is_max_rank && (
            <p
              className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ color: p.accentText }}
            >
              👑 Rank máximo atingido
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
