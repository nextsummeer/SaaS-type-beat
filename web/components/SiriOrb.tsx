'use client'

import { cn } from '@/lib/utils'

interface SiriOrbColors {
  bg?: string
  c1?: string
  c2?: string
  c3?: string
}

interface SiriOrbProps {
  size?: string
  className?: string
  colors?: SiriOrbColors
  /** Duração de uma rotação completa, em segundos. Default 20. */
  animationDuration?: number
}

/**
 * Orb animada inspirada na bolha do Siri/21st.dev.
 * Background transparente — pra usar sobre o tema dark do BeatPost.
 * Cores passadas por props (cada rank tem sua paleta).
 *
 * Fonte original: 21st.dev SiriOrb (adaptado).
 */
export function SiriOrb({
  size = '180px',
  className,
  colors,
  animationDuration = 20,
}: SiriOrbProps) {
  const defaultColors: Required<SiriOrbColors> = {
    bg: 'transparent',
    c1: 'oklch(75% 0.15 350)',
    c2: 'oklch(80% 0.12 200)',
    c3: 'oklch(78% 0.14 280)',
  }
  const finalColors = { ...defaultColors, ...colors }

  const sizeValue = parseInt(size.replace('px', ''), 10) || 180
  const blurAmount = Math.max(sizeValue * 0.08, 8)
  const contrastAmount = Math.max(sizeValue * 0.003, 1.8)

  return (
    <div
      className={cn('siri-orb', className)}
      style={
        {
          width: size,
          height: size,
          '--bg': finalColors.bg,
          '--c1': finalColors.c1,
          '--c2': finalColors.c2,
          '--c3': finalColors.c3,
          '--animation-duration': `${animationDuration}s`,
          '--blur-amount': `${blurAmount}px`,
          '--contrast-amount': contrastAmount,
        } as React.CSSProperties
      }
    >
      <style jsx>{`
        @property --angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }

        .siri-orb {
          display: grid;
          grid-template-areas: 'stack';
          overflow: hidden;
          border-radius: 50%;
          position: relative;
          background: var(--bg);
        }

        .siri-orb::before {
          content: '';
          display: block;
          grid-area: stack;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background:
            conic-gradient(
              from calc(var(--angle) * 1.2) at 30% 65%,
              var(--c3) 0deg,
              transparent 45deg 315deg,
              var(--c3) 360deg
            ),
            conic-gradient(
              from calc(var(--angle) * 0.8) at 70% 35%,
              var(--c2) 0deg,
              transparent 60deg 300deg,
              var(--c2) 360deg
            ),
            conic-gradient(
              from calc(var(--angle) * -1.5) at 65% 75%,
              var(--c1) 0deg,
              transparent 90deg 270deg,
              var(--c1) 360deg
            ),
            conic-gradient(
              from calc(var(--angle) * 2.1) at 25% 25%,
              var(--c2) 0deg,
              transparent 30deg 330deg,
              var(--c2) 360deg
            ),
            conic-gradient(
              from calc(var(--angle) * -0.7) at 80% 80%,
              var(--c1) 0deg,
              transparent 45deg 315deg,
              var(--c1) 360deg
            ),
            radial-gradient(
              ellipse 120% 80% at 40% 60%,
              var(--c3) 0%,
              transparent 50%
            );
          filter: blur(var(--blur-amount)) contrast(var(--contrast-amount)) saturate(1.2);
          animation: orb-rotate var(--animation-duration) linear infinite;
          transform: translateZ(0);
          will-change: transform;
        }

        .siri-orb::after {
          content: '';
          display: block;
          grid-area: stack;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(
            circle at 45% 55%,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(255, 255, 255, 0.05) 30%,
            transparent 60%
          );
          mix-blend-mode: overlay;
        }

        @keyframes orb-rotate {
          from {
            --angle: 0deg;
          }
          to {
            --angle: 360deg;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .siri-orb::before {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

// Paletas dos ranks (OKLCH é melhor pra controle visual perceptual)
import type { AchievementRankKey } from '@/lib/api'

export const RANK_ORB_COLORS: Record<AchievementRankKey, SiriOrbColors> = {
  // Cinza neutro/grafite — começo da jornada
  aprendiz: {
    c1: 'oklch(72% 0.02 250)',
    c2: 'oklch(82% 0.015 230)',
    c3: 'oklch(65% 0.025 270)',
  },
  // Laranja/cobre — bronze
  bronze: {
    c1: 'oklch(72% 0.16 50)',
    c2: 'oklch(80% 0.12 65)',
    c3: 'oklch(65% 0.18 40)',
  },
  // Branco/prata — clean
  prata: {
    c1: 'oklch(88% 0.02 250)',
    c2: 'oklch(78% 0.03 240)',
    c3: 'oklch(92% 0.01 260)',
  },
  // Dourado vibrante — ouro
  ouro: {
    c1: 'oklch(85% 0.16 85)',
    c2: 'oklch(78% 0.18 65)',
    c3: 'oklch(88% 0.13 90)',
  },
  // Azul/ciano cristalino — platina
  platina: {
    c1: 'oklch(85% 0.09 220)',
    c2: 'oklch(80% 0.11 200)',
    c3: 'oklch(88% 0.07 240)',
  },
  // Iridescente épico — lenda (rosa/magenta/ciano)
  lenda: {
    c1: 'oklch(75% 0.20 350)',
    c2: 'oklch(78% 0.18 220)',
    c3: 'oklch(72% 0.22 300)',
  },
}
