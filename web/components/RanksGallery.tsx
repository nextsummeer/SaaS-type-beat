'use client'

import { Check, Lock } from 'lucide-react'
import type { AchievementRank, AchievementRankKey } from '@/lib/api'
import { SiriOrb, RANK_ORB_COLORS } from '@/components/SiriOrb'

const RANKS_ORDER: AchievementRankKey[] = [
  'aprendiz',
  'bronze',
  'prata',
  'ouro',
  'platina',
  'lenda',
]

const RANK_INFO: Record<AchievementRankKey, { name: string; min: number; max: number; tagline: string; accentText: string }> = {
  aprendiz: { name: 'Aprendiz', min: 0,  max: 4,  tagline: 'A jornada começa aqui.',      accentText: '#cdd2db' },
  bronze:   { name: 'Bronze',   min: 5,  max: 9,  tagline: 'Pegando o jeito.',            accentText: '#ffb380' },
  prata:    { name: 'Prata',    min: 10, max: 14, tagline: 'Consolidando o catálogo.',    accentText: '#dde5ed' },
  ouro:     { name: 'Ouro',     min: 15, max: 19, tagline: 'Performando bem.',            accentText: '#ffd56b' },
  platina:  { name: 'Platina',  min: 20, max: 24, tagline: 'Produtor avançado.',          accentText: '#a8e0ee' },
  lenda:    { name: 'Lenda',    min: 25, max: 99, tagline: 'Topo da pirâmide.',           accentText: '#f0a8ff' },
}

/**
 * Galeria com todos os 6 ranks, indicando qual é o atual e quais ainda
 * estão bloqueados. Objetivo: dar visão completa pro produtor enxergar
 * pra onde está caminhando — motivação visual.
 */
export function RanksGallery({ current }: { current: AchievementRank }) {
  // Acha o índice do rank atual
  const currentIdx = RANKS_ORDER.indexOf(current.key)

  return (
    <section className="space-y-4">
      <div>
        <h2
          className="font-display text-[22px] font-semibold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          A jornada completa
        </h2>
        <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Cada nível desbloqueia uma orb única. Continue desbloqueando conquistas pra subir.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {RANKS_ORDER.map((key, idx) => {
          const info = RANK_INFO[key]
          const orbColors = RANK_ORB_COLORS[key]
          const isCurrent = key === current.key
          const isPast = idx < currentIdx // já passou — desbloqueou
          const isFuture = idx > currentIdx
          const isUnlocked = isPast || isCurrent

          return (
            <div
              key={key}
              className="group relative flex flex-col items-center gap-3 rounded-2xl p-4 transition"
              style={{
                background: isCurrent
                  ? 'linear-gradient(135deg, var(--bg-elevated), var(--bg-surface))'
                  : 'var(--bg-surface)',
                border: isCurrent
                  ? '1px solid var(--border-strong)'
                  : '1px solid var(--border)',
                boxShadow: isCurrent ? 'var(--shadow-card)' : 'none',
              }}
            >
              {/* Badge de status no canto */}
              {isPast && (
                <div
                  className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent)' }}
                >
                  <Check size={11} strokeWidth={3} style={{ color: 'var(--accent)' }} />
                </div>
              )}
              {isCurrent && (
                <div
                  className="absolute right-2 top-2 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider"
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    boxShadow: 'var(--shadow-glow-accent)',
                  }}
                >
                  atual
                </div>
              )}

              {/* Orb (dessaturada se futuro) */}
              <div
                className="relative"
                style={{
                  opacity: isFuture ? 0.4 : 1,
                  filter: isFuture ? 'saturate(0.4) brightness(0.85)' : undefined,
                  transition: 'all 0.3s',
                }}
              >
                <SiriOrb size="80px" colors={orbColors} animationDuration={28} />
                {isFuture && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm"
                      style={{ background: 'rgba(0,0,0,0.5)' }}
                    >
                      <Lock size={12} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Nome do rank */}
              <div className="text-center">
                <p
                  className="font-display text-[15px] font-semibold leading-tight"
                  style={{
                    color: isUnlocked ? info.accentText : 'var(--text-muted)',
                    textShadow: isCurrent ? `0 0 16px ${info.accentText}80` : 'none',
                  }}
                >
                  {info.name}
                </p>
                <p
                  className="mt-0.5 font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {info.min === 25
                    ? '25+ conquistas'
                    : `${info.min}-${info.max} conquistas`}
                </p>
                <p
                  className="mt-1.5 text-[11px] leading-tight"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {info.tagline}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
