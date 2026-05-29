'use client'

import type { CoverArtist } from './coverArtists'

type Props = {
  artist: CoverArtist
  /** Tamanho em px (cover e quadrada 1:1). */
  size?: number
  /** 'preview' usa typography menor e padding apertado (pra cards do picker). */
  variant?: 'preview' | 'full'
}

/**
 * Placeholder visual de capa de type beat. NAO e gerado por IA -- so um
 * SVG-ish CSS pra dar a impressao de "isso aqui vira uma capa real depois".
 * Usado no onboarding mock. Quando a geracao real chegar (T8.3), esse componente
 * eh substituido por um <img src={signedUrl} />.
 */
export function MockCover({ artist, size = 320, variant = 'full' }: Props) {
  const isPreview = variant === 'preview'

  return (
    <div
      className="relative overflow-hidden rounded-md"
      style={{
        width: size,
        height: size,
        background: artist.palette.background,
        border: '1px solid var(--border-medium)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Grão sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.28,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          mixBlendMode: 'overlay',
        }}
      />

      {/* Blob de accent (sugere "subject" da foto) */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          right: '-20%',
          bottom: '-25%',
          width: '85%',
          height: '85%',
          background: `radial-gradient(circle, ${artist.palette.accent}55 0%, transparent 65%)`,
          filter: `blur(${isPreview ? 14 : 28}px)`,
        }}
      />

      {/* Vinheta nas bordas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Conteudo texto */}
      <div
        className="relative flex h-full w-full flex-col justify-between"
        style={{ padding: isPreview ? 12 : 26 }}
      >
        {/* Top: producer tag */}
        <span
          className="font-mono uppercase"
          style={{
            color: artist.palette.foreground,
            fontSize: isPreview ? 7 : 10.5,
            letterSpacing: '0.24em',
            opacity: 0.65,
          }}
        >
          PROD. by you
        </span>

        {/* Bottom: artist + TYPE BEAT */}
        <div className="flex flex-col" style={{ gap: isPreview ? 2 : 6 }}>
          <span
            className="font-display font-semibold"
            style={{
              color: artist.palette.foreground,
              fontSize: isPreview ? 15 : 36,
              lineHeight: 0.95,
              letterSpacing: '-0.025em',
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            }}
          >
            {artist.name}
          </span>
          <span
            className="font-mono uppercase"
            style={{
              color: artist.palette.foreground,
              fontSize: isPreview ? 6.5 : 10,
              letterSpacing: '0.32em',
              opacity: 0.7,
            }}
          >
            TYPE BEAT
          </span>
        </div>
      </div>
    </div>
  )
}
