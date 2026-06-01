'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Check } from 'lucide-react'
import { coverArtists, type CoverArtist } from './coverArtists'
import { MockCover } from './MockCover'

export type CoverPhase = 'picking' | 'generating' | 'done'

/**
 * Estagios do mock loading. Mantidos curtos pra iteracao rapida (~5.5s total).
 * Quando a geracao real entrar (T8.3) cada estagio vira um signal real do worker
 * (Claude => assembled => fal.ai => stored), com timing real ~30s.
 */
const STAGES = [
  { label: 'Lendo seu estilo', duration: 1100 },
  { label: 'Montando o brief', duration: 1300 },
  { label: 'Renderizando a capa', duration: 2200 },
  { label: 'Finalizando', duration: 900 },
]

type Props = {
  phase: CoverPhase
  setPhase: (p: CoverPhase) => void
  selectedArtistId: string | null
  setSelectedArtistId: (id: string) => void
}

export function CoverStep({
  phase,
  setPhase,
  selectedArtistId,
  setSelectedArtistId,
}: Props) {
  const artist =
    coverArtists.find((a) => a.id === selectedArtistId) ?? coverArtists[0]

  if (phase === 'picking') {
    return (
      <CoverPicker
        selectedId={selectedArtistId}
        onSelect={setSelectedArtistId}
        onGenerate={() => setPhase('generating')}
      />
    )
  }
  if (phase === 'generating') {
    return <CoverGenerating onDone={() => setPhase('done')} />
  }
  return <CoverResult artist={artist} />
}

/* ───────────────────────── Picker ───────────────────────── */

function CoverPicker({
  selectedId,
  onSelect,
  onGenerate,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
  onGenerate: () => void
}) {
  const canGenerate = !!selectedId

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="rise rise-1 flex flex-col gap-3">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-muted)',
          }}
        >
          CAPITULO 06 — PRIMEIRA CAPA
        </span>
        <h1
          className="font-display text-[32px] font-semibold leading-[1.05] tracking-tight sm:text-[42px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.028em',
          }}
        >
          Bora gerar tua primeira capa?
        </h1>
        <p
          className="text-[14.5px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Escolhe um estilo. A gente monta o brief, você só clica em gerar.
        </p>
      </div>

      {/* Grid de artistas */}
      <div className="rise rise-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {coverArtists.map((artist, i) => {
          const isSelected = selectedId === artist.id
          return (
            <button
              key={artist.id}
              type="button"
              onClick={() => onSelect(artist.id)}
              className="group relative flex flex-col items-stretch gap-3 rounded-xl p-3 text-left transition-all"
              style={{
                background: isSelected
                  ? 'rgba(255,255,255,0.04)'
                  : 'transparent',
                border: `1px solid ${
                  isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'
                }`,
                boxShadow: isSelected
                  ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.4)'
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                  e.currentTarget.style.borderColor = 'var(--border-medium)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                }
              }}
            >
              {/* Dot de selecionado */}
              <span
                aria-hidden
                className="absolute right-3 top-3 z-10 h-1.5 w-1.5 rounded-full transition-all"
                style={{
                  background: isSelected
                    ? 'var(--magenta-bright)'
                    : 'transparent',
                  boxShadow: isSelected
                    ? '0 0 10px var(--magenta-bright)'
                    : 'none',
                  outline: !isSelected
                    ? '1px solid var(--border-medium)'
                    : 'none',
                  outlineOffset: '-1px',
                }}
              />

              {/* Cover preview centralizada */}
              <div className="flex items-center justify-center">
                <MockCover artist={artist} size={160} variant="preview" />
              </div>

              {/* Numero + nome + descritor */}
              <div className="flex flex-col gap-1 px-1">
                <span
                  className="font-mono tabular"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '0.22em',
                    color: isSelected
                      ? 'var(--text-muted)'
                      : 'var(--text-subtle)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="font-display text-[15.5px] font-semibold leading-tight"
                  style={{
                    color: isSelected
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {artist.name}
                </span>
                <span
                  className="text-[12px] leading-snug"
                  style={{
                    color: isSelected
                      ? 'var(--text-muted)'
                      : 'var(--text-subtle)',
                  }}
                >
                  {artist.descriptor}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Disclaimer "estes sao exemplos" */}
      <p
        className="rise rise-3 text-[13px] leading-relaxed"
        style={{ color: 'var(--text-muted)' }}
      >
        Estes são exemplos.{' '}
        <span style={{ color: 'var(--text-secondary)' }}>
          No app você gera de qualquer artista
        </span>{' '}
        — Lil Baby, Yeat, Carti, Ken Carson, quem você quiser.
      </p>

      {/* Botao inline de gerar */}
      <div className="rise rise-4 flex justify-center pt-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="btn-primary"
          style={{
            paddingTop: 12,
            paddingBottom: 12,
            paddingLeft: 24,
            paddingRight: 24,
            opacity: canGenerate ? 1 : 0.32,
            pointerEvents: canGenerate ? 'auto' : 'none',
          }}
        >
          <Sparkles size={15} strokeWidth={2} />
          {canGenerate
            ? `Gerar capa estilo ${coverArtists.find((a) => a.id === selectedId)?.name}`
            : 'Escolha um estilo acima'}
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────── Generating (orb + estagios) ───────────────────────── */

function CoverGenerating({ onDone }: { onDone: () => void }) {
  const [stageIndex, setStageIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    let acc = 0
    STAGES.forEach((stage, i) => {
      acc += stage.duration
      if (i < STAGES.length - 1) {
        timers.push(
          setTimeout(() => {
            if (!cancelled) setStageIndex(i + 1)
          }, acc),
        )
      }
    })
    timers.push(
      setTimeout(() => {
        if (!cancelled) onDone()
      }, acc),
    )
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [onDone])

  const totalMs = STAGES.reduce((a, s) => a + s.duration, 0)
  const completedMs = STAGES.slice(0, stageIndex).reduce(
    (a, s) => a + s.duration,
    0,
  )
  // Aproximacao: assume metade do estagio atual percorrido
  const progressPercent = Math.min(
    ((completedMs + STAGES[stageIndex].duration * 0.55) / totalMs) * 100,
    99,
  )

  return (
    <div className="flex flex-col items-center gap-10 py-6">
      {/* Orb: mesmo padrao do PendingCard de /capas (que aparece quando uma
       * capa esta sendo gerada). 1 anel orbital, halos roxo+magenta, orb
       * principal morphing com reflexo. SEM wave-bars dentro -- esse e o
       * detalhe que separa o orb de "gerando capa" do orb de /beats/[id]. */}
      <div className="rise rise-1 relative flex h-80 w-80 items-center justify-center">
        {/* Halo externo roxo */}
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse-slow"
          style={{
            background:
              'radial-gradient(circle, rgba(65,0,255,0.48), transparent 62%)',
            filter: 'blur(24px)',
          }}
        />
        {/* Halo magenta deslocado */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 68% 38%, rgba(255,26,190,0.42), transparent 58%)',
            filter: 'blur(34px)',
            animation: 'pulse-slow 3.4s ease-in-out infinite',
            animationDelay: '-1.2s',
          }}
        />
        {/* Anel orbital unico (dashed lavender, rotate-slow) */}
        <span
          aria-hidden
          className="absolute"
          style={{
            width: '92%',
            height: '92%',
            borderRadius: '50%',
            border: '1px dashed rgba(199, 181, 255, 0.28)',
            animation: 'rotate-slow 14s linear infinite',
          }}
        />
        {/* Orb principal -- sem wave-bars dentro */}
        <div
          className="relative h-52 w-52 animate-orb-morph"
          style={{
            background:
              'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, transparent 28%), linear-gradient(135deg, #4100FF 0%, #FF1ABE 100%)',
            boxShadow:
              '0 0 90px rgba(65,0,255,0.55), 0 0 140px rgba(255,26,190,0.30), inset 0 0 50px rgba(255,255,255,0.18), inset -24px -36px 70px rgba(0,0,0,0.34)',
          }}
        >
          {/* Reflexo branco -- unico detalhe dentro do orb */}
          <span
            aria-hidden
            className="absolute"
            style={{
              top: '20%',
              left: '24%',
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.70)',
              filter: 'blur(10px)',
            }}
          />
        </div>
      </div>

      {/* Estagio atual */}
      <div className="rise rise-2 flex flex-col items-center gap-2 text-center">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: '0.28em',
            color: 'var(--text-subtle)',
          }}
        >
          GERANDO SUA CAPA
        </span>
        <span
          className="font-display text-[22px] font-semibold sm:text-[28px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {STAGES[stageIndex].label}
          <DotPulse />
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="rise rise-3 w-full max-w-md">
        <div
          className="relative h-[2px] overflow-hidden rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: 'var(--gradient-primary)',
              boxShadow: '0 0 14px rgba(255, 26, 190, 0.40)',
            }}
          />
        </div>
      </div>

      {/* Chain de estagios */}
      <div className="rise rise-4 flex max-w-md flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {STAGES.map((stage, i) => {
          const done = i < stageIndex
          const active = i === stageIndex
          return (
            <span
              key={stage.label}
              className="font-mono uppercase tabular flex items-center gap-1.5"
              style={{
                fontSize: 9.5,
                letterSpacing: '0.18em',
                color: done
                  ? 'var(--text-muted)'
                  : active
                    ? 'var(--text-primary)'
                    : 'var(--text-subtle)',
                opacity: done ? 0.7 : 1,
              }}
            >
              {done && (
                <Check
                  size={10}
                  strokeWidth={2.5}
                  style={{ color: 'var(--led-success)' }}
                />
              )}
              {stage.label}
              {i < STAGES.length - 1 && (
                <span style={{ color: 'var(--text-subtle)', marginLeft: 8 }}>
                  ·
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function DotPulse() {
  return (
    <span
      aria-hidden
      className="ml-1 inline-flex items-end gap-0.5"
      style={{ color: 'var(--text-muted)' }}
    >
      <span className="animate-pulse-slow" style={{ animationDelay: '0s' }}>
        .
      </span>
      <span className="animate-pulse-slow" style={{ animationDelay: '0.2s' }}>
        .
      </span>
      <span className="animate-pulse-slow" style={{ animationDelay: '0.4s' }}>
        .
      </span>
    </span>
  )
}

/* ───────────────────────── Done (resultado) ───────────────────────── */

function CoverResult({ artist }: { artist: CoverArtist }) {
  return (
    <div className="flex flex-col items-center gap-8">
      {/* Header — emocional */}
      <div className="rise rise-1 flex flex-col items-center gap-3 text-center">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-muted)',
          }}
        >
          PRONTO — PRIMEIRA CAPA
        </span>
        <h1
          className="font-display text-[34px] font-semibold leading-[1.05] tracking-tight sm:text-[44px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.028em',
          }}
        >
          Você fez isso.
        </h1>
      </div>

      {/* A capa */}
      <div className="rise rise-2 relative">
        {/* Glow embaixo */}
        <div
          aria-hidden
          className="absolute -inset-8 -z-10"
          style={{
            background: `radial-gradient(circle at center, ${artist.palette.accent}40 0%, transparent 65%)`,
            filter: 'blur(50px)',
          }}
        />
        <MockCover artist={artist} size={340} variant="full" />
      </div>

      {/* Teaser pos-resultado */}
      <div className="rise rise-3 flex max-w-lg flex-col items-center gap-2.5 pt-2 text-center">
        <p
          className="text-[15px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Gostou?{' '}
          <span
            className="font-display font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            No app você gera de qualquer artista
          </span>{' '}
          — Yeat, Carti, Ken Carson, Lil Baby, quem você quiser.
        </p>
        <p
          className="text-[13px]"
          style={{ color: 'var(--text-muted)' }}
        >
          ~30 segundos por capa. Sem briga com Photoshop.
        </p>
      </div>
    </div>
  )
}
