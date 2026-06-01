'use client'

import { useEffect, useState } from 'react'
import {
  Tv2,
  Upload,
  CalendarClock,
  BarChart3,
  ShieldCheck,
  Check,
  Clock,
  ArrowRight,
} from 'lucide-react'

export type YoutubePhase = 'idle' | 'connecting' | 'connected' | 'skipped'

type Props = {
  phase: YoutubePhase
  setPhase: (p: YoutubePhase) => void
}

const VALUE_PROPS = [
  {
    icon: Upload,
    label: 'Upload direto no seu canal',
    hint: 'Você sobe o MP3 — a gente renderiza, faz a thumb e manda.',
  },
  {
    icon: CalendarClock,
    label: 'Agendamento automático',
    hint: 'Define o horário no app, a gente publica sozinho.',
  },
  {
    icon: BarChart3,
    label: 'Analytics no dashboard',
    hint: 'Views, retenção e CTR sem abrir o YouTube Studio.',
  },
]

const PERMISSIONS = [
  'Enviar vídeos pro seu canal',
  'Ler estatísticas do canal e dos vídeos',
]

const CONNECT_STAGES = [
  { label: 'Abrindo permissões do Google', duration: 800 },
  { label: 'Verificando seu canal', duration: 900 },
]

export function YouTubeStep({ phase, setPhase }: Props) {
  if (phase === 'idle') {
    return (
      <YoutubeIdle
        onConnect={() => setPhase('connecting')}
        onSkip={() => setPhase('skipped')}
      />
    )
  }
  if (phase === 'connecting') {
    return <YoutubeConnecting onDone={() => setPhase('connected')} />
  }
  if (phase === 'connected') return <YoutubeConnected />
  return <YoutubeSkipped />
}

/* ───────────────────────── Idle ───────────────────────── */

function YoutubeIdle({
  onConnect,
  onSkip,
}: {
  onConnect: () => void
  onSkip: () => void
}) {
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
          CAPITULO 07 — CONEXÃO
        </span>
        <h1
          className="font-display text-[32px] font-semibold leading-[1.05] tracking-tight sm:text-[42px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.028em',
          }}
        >
          Liga seu YouTube no piloto automático.
        </h1>
        <p
          className="text-[14.5px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Sem isso a gente não consegue publicar pra você. É a peça que
          transforma "upload" em "vídeo publicado".
        </p>
      </div>

      {/* Value props — lista editorial numerada */}
      <div className="rise rise-2 flex flex-col">
        {VALUE_PROPS.map((vp, i) => {
          const Icon = vp.icon
          return (
            <div
              key={vp.label}
              className="flex items-start gap-4 py-4"
              style={{
                borderTop:
                  i === 0 ? '1px solid var(--border-subtle)' : undefined,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span
                className="font-mono tabular pt-0.5"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  color: 'var(--text-subtle)',
                  minWidth: 24,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <Icon
                size={18}
                strokeWidth={1.6}
                style={{ color: 'var(--text-secondary)', marginTop: 2 }}
              />
              <div className="flex flex-1 flex-col gap-1">
                <span
                  className="font-display text-[15.5px] font-semibold leading-tight"
                  style={{
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.015em',
                  }}
                >
                  {vp.label}
                </span>
                <span
                  className="text-[13px] leading-snug"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {vp.hint}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Permission preview — transparencia sobre o que o Google vai pedir */}
      <div
        className="rise rise-3 relative flex flex-col gap-3 overflow-hidden rounded-xl p-5"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck
            size={15}
            strokeWidth={1.7}
            style={{ color: 'var(--text-secondary)' }}
          />
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              color: 'var(--text-muted)',
            }}
          >
            O QUE O GOOGLE VAI PEDIR
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {PERMISSIONS.map((perm) => (
            <li
              key={perm}
              className="flex items-center gap-2.5 text-[13.5px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Check
                size={13}
                strokeWidth={2}
                style={{ color: 'var(--led-success)' }}
              />
              {perm}
            </li>
          ))}
        </ul>
        <p
          className="text-[12px] leading-snug"
          style={{ color: 'var(--text-subtle)' }}
        >
          A gente nunca publica sem você revisar antes. Você pode revogar a
          qualquer momento nas configurações.
        </p>
      </div>

      {/* CTAs */}
      <div className="rise rise-4 flex flex-col items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onConnect}
          className="btn-primary"
          style={{
            paddingTop: 12,
            paddingBottom: 12,
            paddingLeft: 24,
            paddingRight: 24,
          }}
        >
          <Tv2 size={16} strokeWidth={2} />
          Conectar YouTube
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="group inline-flex items-center gap-1.5 px-2 py-1"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 12.5,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <Clock size={12} strokeWidth={1.6} />
          Conectar depois
          <span style={{ color: 'var(--text-subtle)' }}>
            — vira tarefa nº 1 do seu plano de ação
          </span>
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────── Connecting ───────────────────────── */

function YoutubeConnecting({ onDone }: { onDone: () => void }) {
  const [stageIndex, setStageIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    let acc = 0
    CONNECT_STAGES.forEach((stage, i) => {
      acc += stage.duration
      if (i < CONNECT_STAGES.length - 1) {
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

  return (
    <div className="flex flex-col items-center gap-8 py-6">
      {/* Orb -- mesmo padrao do CoverStep (signature loading da plataforma) */}
      <div className="rise rise-1 relative flex h-72 w-72 items-center justify-center">
        {/* Halo externo roxo */}
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse-slow"
          style={{
            background:
              'radial-gradient(circle, rgba(65,0,255,0.48), transparent 62%)',
            filter: 'blur(22px)',
          }}
        />
        {/* Halo magenta deslocado */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 68% 38%, rgba(255,26,190,0.42), transparent 58%)',
            filter: 'blur(30px)',
            animation: 'pulse-slow 3.4s ease-in-out infinite',
            animationDelay: '-1.2s',
          }}
        />
        {/* Anel orbital dashed */}
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
        {/* Orb principal */}
        <div
          className="relative h-44 w-44 animate-orb-morph"
          style={{
            background:
              'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, transparent 28%), linear-gradient(135deg, #4100FF 0%, #FF1ABE 100%)',
            boxShadow:
              '0 0 80px rgba(65,0,255,0.55), 0 0 120px rgba(255,26,190,0.30), inset 0 0 44px rgba(255,255,255,0.18), inset -20px -30px 60px rgba(0,0,0,0.34)',
          }}
        >
          <span
            aria-hidden
            className="absolute"
            style={{
              top: '20%',
              left: '24%',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.70)',
              filter: 'blur(8px)',
            }}
          />
        </div>
      </div>

      <div className="rise rise-2 flex flex-col items-center gap-2 text-center">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: '0.28em',
            color: 'var(--text-subtle)',
          }}
        >
          CONECTANDO COM O YOUTUBE
        </span>
        <span
          className="font-display text-[20px] font-semibold sm:text-[26px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {CONNECT_STAGES[stageIndex].label}
          <DotPulse />
        </span>
      </div>

      {/* Chain de estagios */}
      <div className="rise rise-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {CONNECT_STAGES.map((stage, i) => {
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
              {i < CONNECT_STAGES.length - 1 && (
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

/* ───────────────────────── Connected ───────────────────────── */

function YoutubeConnected() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="rise rise-1 flex flex-col items-center gap-3 text-center">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--led-success)',
          }}
        >
          CANAL CONECTADO
        </span>
        <h1
          className="font-display text-[34px] font-semibold leading-[1.05] tracking-tight sm:text-[44px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.028em',
          }}
        >
          Seu canal tá no piloto.
        </h1>
      </div>

      {/* Card do canal (mock) */}
      <div
        className="rise rise-2 relative flex w-full max-w-md items-center gap-4 overflow-hidden rounded-xl p-5"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 18px rgba(0,0,0,0.4)',
        }}
      >
        {/* Avatar mock */}
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
          style={{
            background: 'var(--gradient-primary)',
          }}
        >
          <Tv2
            size={22}
            strokeWidth={2}
            style={{ color: '#fff' }}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="font-display text-[16px] font-semibold leading-tight"
              style={{
                color: 'var(--text-primary)',
                letterSpacing: '-0.018em',
              }}
            >
              Seu canal
            </span>
            <span
              className="led led-pulse"
              style={{ color: 'var(--led-success)' }}
            />
          </div>
          <span
            className="font-mono tabular"
            style={{
              fontSize: 11,
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
            }}
          >
            conectado · há instantes
          </span>
        </div>
        <Check
          size={20}
          strokeWidth={2.2}
          style={{ color: 'var(--led-success)' }}
        />
      </div>

      <p
        className="rise rise-3 max-w-md text-center text-[14.5px] leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        A partir de agora, qualquer beat que você confirmar publicação no
        BeatPost vai direto pro seu canal.{' '}
        <span style={{ color: 'var(--text-muted)' }}>
          Sempre depois de você revisar.
        </span>
      </p>
    </div>
  )
}

/* ───────────────────────── Skipped ───────────────────────── */

function YoutubeSkipped() {
  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <div className="rise rise-1 flex flex-col items-center gap-3 text-center">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-muted)',
          }}
        >
          OK, DEPOIS ENTÃO
        </span>
        <h1
          className="font-display text-[30px] font-semibold leading-[1.08] tracking-tight sm:text-[40px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.028em',
          }}
        >
          Sem problemas. A gente te lembra.
        </h1>
      </div>

      {/* Card "esperando" */}
      <div
        className="rise rise-2 relative flex w-full max-w-md flex-col gap-3 overflow-hidden rounded-xl p-5"
        style={{
          background: 'var(--bg-surface)',
          border: '1px dashed var(--border-medium)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <Clock
            size={14}
            strokeWidth={1.7}
            style={{ color: 'var(--text-muted)' }}
          />
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              color: 'var(--text-muted)',
            }}
          >
            ESPERANDO VOCÊ
          </span>
        </div>
        <p
          className="font-display text-[16px] font-semibold leading-snug"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.018em',
          }}
        >
          Conectar YouTube
        </p>
        <p
          className="text-[13.5px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Vai aparecer como{' '}
          <span style={{ color: 'var(--text-secondary)' }}>
            tarefa nº 1 do seu plano de ação
          </span>{' '}
          assim que você entrar. Quando quiser conectar, é só clicar.
        </p>
      </div>

      <p
        className="rise rise-3 max-w-md text-center text-[13px] leading-relaxed"
        style={{ color: 'var(--text-subtle)' }}
      >
        Você pode explorar o BeatPost sem conectar — mas pra publicar de
        verdade vai precisar plugar o canal.
      </p>
    </div>
  )
}
