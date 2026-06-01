'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { questions, type Question } from './questions'
import { CountUp } from './CountUp'
import { CoverStep, type CoverPhase } from './CoverStep'
import { YouTubeStep, type YoutubePhase } from './YouTubeStep'
import { PlanRevealStep, type PlanPhase } from './PlanRevealStep'

/**
 * Minutos medios pra fazer 1 upload manual no YouTube de um type beat:
 *   render do video (MP3 -> MP4 estatico): ~5min
 *   thumbnail no Photoshop/Canva:          ~6min
 *   titulo + descricao + tags:             ~4min
 *   upload + agendamento + revisao:        ~5min
 * Total realista: ~20 minutos por beat.
 */
const MIN_PER_MANUAL_UPLOAD = 20

type Answers = Record<string, string[]>

type Stats = {
  weekHours: number
  yearHours: number
  yearDays: number
  /** Se o produtor respondeu "ainda nao posto", usamos projecao de 1/dia. */
  projected: boolean
  perDay: number
}

export function OnboardingWizard() {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})

  // Estado da etapa de capa -- persiste entre back/forward
  const [coverPhase, setCoverPhase] = useState<CoverPhase>('picking')
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null)

  // Estado da etapa de youtube -- persiste entre back/forward
  const [youtubePhase, setYoutubePhase] = useState<YoutubePhase>('idle')

  // Estado da etapa do plano -- mostra orb gerando antes da revelacao das metas
  const [planPhase, setPlanPhase] = useState<PlanPhase>('generating')

  const totalQuestions = questions.length
  // Sequencia: 5 perguntas + tela resultado + etapa de capa + etapa de youtube + revelacao do plano
  const RESULTS_INDEX = totalQuestions
  const COVER_INDEX = totalQuestions + 1
  const YOUTUBE_INDEX = totalQuestions + 2
  const PLAN_INDEX = totalQuestions + 3
  const totalSteps = totalQuestions + 4

  const isResultsStep = stepIndex === RESULTS_INDEX
  const isCoverStep = stepIndex === COVER_INDEX
  const isYoutubeStep = stepIndex === YOUTUBE_INDEX
  const isPlanStep = stepIndex === PLAN_INDEX
  const currentQuestion =
    !isResultsStep && !isCoverStep && !isYoutubeStep && !isPlanStep
      ? questions[stepIndex]
      : null
  const currentSelection = currentQuestion
    ? (answers[currentQuestion.id] ?? [])
    : []

  const progress = ((stepIndex + 1) / totalSteps) * 100

  const canContinue = (() => {
    if (currentQuestion) return currentSelection.length > 0
    if (isResultsStep) return true
    if (isCoverStep) return coverPhase === 'done'
    if (isYoutubeStep)
      return youtubePhase === 'connected' || youtubePhase === 'skipped'
    if (isPlanStep) return planPhase === 'done'
    return false
  })()

  const canGoBack =
    stepIndex > 0 &&
    !(isCoverStep && coverPhase === 'generating') &&
    !(isYoutubeStep && youtubePhase === 'connecting') &&
    !(isPlanStep && planPhase === 'generating')

  // Plan step e o ultimo do wizard -- footer mostra "Finalizar" e linka pra /dashboard
  // mas SO depois que a "geracao" do plano (mock visual com orb) termina.
  const isLastStep = isPlanStep && planPhase === 'done'

  // Label do botao primario muda por etapa pra dar peso emocional na transicao
  const primaryLabel = isResultsStep
    ? 'Vamos lá'
    : isLastStep
      ? 'Finalizar'
      : 'Continuar'

  function selectOption(optionId: string) {
    if (!currentQuestion) return
    setAnswers((prev) => {
      const existing = prev[currentQuestion.id] ?? []
      if (currentQuestion.type === 'single') {
        return { ...prev, [currentQuestion.id]: [optionId] }
      }
      const next = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId]
      return { ...prev, [currentQuestion.id]: next }
    })
  }

  function goNext() {
    if (stepIndex < totalSteps - 1) setStepIndex(stepIndex + 1)
  }
  function goBack() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  const stats: Stats = useMemo(() => {
    const freqAnswer = answers['frequencia']?.[0]
    const freqOption = questions
      .find((q) => q.id === 'frequencia')
      ?.options.find((o) => o.id === freqAnswer)
    const rawPerDay = freqOption?.meta?.perDay ?? 1
    const projected = rawPerDay === 0
    const perDay = projected ? 1 : rawPerDay
    const weekHours = (perDay * 7 * MIN_PER_MANUAL_UPLOAD) / 60
    const yearHours = weekHours * 52
    const yearDays = yearHours / 24
    return { weekHours, yearHours, yearDays, projected, perDay }
  }, [answers])

  return (
    <div
      className="relative flex min-h-screen w-full flex-col"
      style={{
        background: 'var(--bg-deepest)',
        backgroundImage: `
          radial-gradient(900px 600px at 88% -10%, rgba(65, 0, 255, 0.08), transparent 60%),
          radial-gradient(800px 500px at -10% 110%, rgba(255, 26, 190, 0.05), transparent 60%)
        `,
        color: 'var(--text-primary)',
      }}
    >
      {/* Grão / noise sutil */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          opacity: 0.025,
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          mixBlendMode: 'overlay',
        }}
      />

      {/* Header: brand + step number + progresso */}
      <header className="relative z-10 px-6 pt-7 sm:px-10 sm:pt-9">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div
              className="relative flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <div className="wave-bars" style={{ color: '#fff' }}>
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <span
              className="font-display text-[14.5px] font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
            >
              BeatPost
            </span>
          </Link>
          <div className="flex items-baseline gap-3">
            <span
              className="font-mono tabular uppercase"
              style={{
                fontSize: 10,
                letterSpacing: '0.22em',
                color: 'var(--text-muted)',
              }}
            >
              {String(stepIndex + 1).padStart(2, '0')}
              <span style={{ color: 'var(--text-subtle)' }}>{' / '}</span>
              {String(totalSteps).padStart(2, '0')}
            </span>
            <span
              className="font-mono tabular"
              style={{
                fontSize: 10,
                letterSpacing: '0.18em',
                color: 'var(--text-subtle)',
              }}
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Barra de progresso — um dos dois momentos de acento do wizard */}
        <div className="mx-auto mt-5 max-w-3xl">
          <div
            className="relative h-[2px] overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: 'var(--gradient-primary)',
                boxShadow: '0 0 14px rgba(255, 26, 190, 0.40)',
              }}
            />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-10 sm:px-10 sm:py-14">
        <div
          key={`${stepIndex}-${coverPhase}-${youtubePhase}-${planPhase}`}
          className="mx-auto w-full max-w-3xl"
        >
          {currentQuestion && (
            <QuestionView
              question={currentQuestion}
              selected={currentSelection}
              onSelect={selectOption}
            />
          )}
          {isResultsStep && <ResultsView stats={stats} />}
          {isCoverStep && (
            <CoverStep
              phase={coverPhase}
              setPhase={setCoverPhase}
              selectedArtistId={selectedArtistId}
              setSelectedArtistId={setSelectedArtistId}
            />
          )}
          {isYoutubeStep && (
            <YouTubeStep phase={youtubePhase} setPhase={setYoutubePhase} />
          )}
          {isPlanStep && (
            <PlanRevealStep
              answers={answers}
              phase={planPhase}
              setPhase={setPlanPhase}
            />
          )}
        </div>
      </main>

      {/* Footer nav */}
      <footer className="relative z-10 px-6 pb-9 sm:px-10 sm:pb-12">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack}
            className="btn-ghost"
            style={{
              opacity: canGoBack ? 1 : 0.3,
              pointerEvents: canGoBack ? 'auto' : 'none',
            }}
          >
            <ArrowLeft size={14} strokeWidth={1.8} />
            Voltar
          </button>

          {isLastStep ? (
            <Link href="/dashboard" className="btn-primary">
              {primaryLabel}
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className="btn-primary"
              style={{
                opacity: canContinue ? 1 : 0.32,
                pointerEvents: canContinue ? 'auto' : 'none',
              }}
            >
              {primaryLabel}
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

/* ───────────────────────── Question screen ───────────────────────── */

function QuestionView({
  question,
  selected,
  onSelect,
}: {
  question: Question
  selected: string[]
  onSelect: (id: string) => void
}) {
  const cols = question.columns ?? 2
  const colsClass =
    cols === 3
      ? 'sm:grid-cols-3'
      : cols === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-1'

  return (
    <div className="flex flex-col gap-9">
      {/* Header da pergunta */}
      <div className="rise rise-1 flex flex-col gap-3">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-muted)',
          }}
        >
          {question.eyebrow}
        </span>
        <h1
          className="font-display text-[32px] font-semibold leading-[1.05] tracking-tight sm:text-[42px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.028em',
          }}
        >
          {question.title}
        </h1>
        {question.subtitle && (
          <p
            className="text-[14.5px] leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {question.subtitle}
            {question.type === 'multi' && (
              <>
                {'  '}
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '0.18em',
                    color: 'var(--text-subtle)',
                  }}
                >
                  · múltipla escolha
                </span>
              </>
            )}
          </p>
        )}
      </div>

      {/* Grid de opcoes */}
      <div className={`grid grid-cols-1 gap-2.5 ${colsClass} rise rise-2`}>
        {question.options.map((opt, i) => {
          const isSelected = selected.includes(opt.id)
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className="group relative flex flex-col justify-between gap-3 rounded-xl p-4 text-left transition-all"
              style={{
                minHeight: 96,
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
              {/* Indicador de selecionado (canto sup. dir.) — o unico magenta da tela */}
              <span
                aria-hidden
                className="absolute right-3.5 top-3.5 h-1.5 w-1.5 rounded-full transition-all"
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

              {/* Numero da opcao + label + hint */}
              <div className="flex flex-col gap-1.5">
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
                  {opt.label}
                </span>
              </div>
              {opt.hint && (
                <span
                  className="text-[12px] leading-snug"
                  style={{
                    color: isSelected
                      ? 'var(--text-muted)'
                      : 'var(--text-subtle)',
                  }}
                >
                  {opt.hint}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────────── Results screen ───────────────────────── */

function ResultsView({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-col gap-9">
      {/* Header editorial */}
      <div className="rise rise-1 flex flex-col gap-3">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-muted)',
          }}
        >
          RESUMO — O CUSTO DO MANUAL
        </span>
        <h1
          className="font-display text-[30px] font-semibold leading-[1.08] tracking-tight sm:text-[40px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.028em',
          }}
        >
          Cada upload manual te custa{' '}
          <span style={{ color: 'var(--text-muted)' }}>~20 minutos.</span>
          <br />
          {stats.projected ? (
            <>Postando <span style={{ color: 'var(--text-muted)' }}>1 por dia</span>, isso vira…</>
          ) : (
            <>No seu ritmo, isso vira…</>
          )}
        </h1>
      </div>

      <div className="hairline rise rise-2" />

      {/* Stat 1 — semanal */}
      <div className="rise rise-3 flex flex-col gap-2.5">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          POR SEMANA
        </span>
        <div className="flex items-baseline gap-3">
          <span
            className="num-hero text-[64px] sm:text-[80px]"
            style={{
              color: 'var(--text-primary)',
              lineHeight: 0.95,
            }}
          >
            <CountUp
              to={stats.weekHours}
              decimals={1}
              duration={1400}
              startDelay={250}
            />
          </span>
          <span
            className="font-display text-[20px] sm:text-[24px]"
            style={{ color: 'var(--text-muted)' }}
          >
            horas
          </span>
        </div>
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {stats.perDay} beat{stats.perDay !== 1 ? 's' : ''} por dia × 7 dias × {MIN_PER_MANUAL_UPLOAD}min
        </p>
      </div>

      {/* Stat 2 — anual: O HEROI. Unico texto-gradiente da tela. */}
      <div className="rise rise-4 flex flex-col gap-3">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          POR ANO
        </span>
        <div className="flex items-baseline gap-3">
          <span
            className="num-hero text-gradient-brand text-[96px] sm:text-[128px]"
            style={{
              lineHeight: 0.9,
              letterSpacing: '-0.045em',
            }}
          >
            <CountUp
              to={stats.yearHours}
              decimals={0}
              duration={2200}
              startDelay={650}
            />
          </span>
          <span
            className="font-display text-[22px] sm:text-[28px]"
            style={{ color: 'var(--text-muted)' }}
          >
            horas
          </span>
        </div>
        <p
          className="text-[14.5px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Cerca de{' '}
          <span
            className="font-display font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            <CountUp
              to={stats.yearDays}
              decimals={0}
              duration={2200}
              startDelay={1500}
            />{' '}
            dias inteiros
          </span>{' '}
          do seu calendário, dentro do YouTube Studio.
        </p>
      </div>

      <div className="hairline rise rise-5" />

      {/* Fecho — promessa da plataforma */}
      <div className="rise rise-6 flex flex-col gap-2">
        <p
          className="font-display text-[19px] font-semibold leading-snug sm:text-[22px]"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.018em',
          }}
        >
          O BeatPost faz isso em ~30 segundos por beat.
        </p>
        <p
          className="text-[14px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Você sobe o MP3. A gente devolve capa, vídeo, título, descrição, tags
          e agendamento — automático.
        </p>
      </div>
    </div>
  )
}
