'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, XCircle, ArrowRight, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type BeatStatus =
  | 'uploaded'
  | 'converting'
  | 'converted'
  | 'analyzing'
  | 'analyzed'
  | 'generating'
  | 'ready_for_review'
  | 'publishing'
  | 'published'
  | 'failed'

interface Beat {
  id: string
  status: BeatStatus
  audio_path: string | null
  created_at: string
}

const STATUS_ORDER: BeatStatus[] = [
  'uploaded',
  'converting',
  'converted',
  'analyzing',
  'analyzed',
  'generating',
  'ready_for_review',
  'publishing',
  'published',
]

type Step = {
  label: string
  description: string
  doneAt: BeatStatus
}

const STEPS: Step[] = [
  {
    label: 'Recebendo',
    description: 'Arquivo recebido e indexado',
    doneAt: 'uploaded',
  },
  {
    label: 'Validando',
    description: 'Conferindo codec e integridade do MP3',
    doneAt: 'converted',
  },
  {
    label: 'Analisando',
    description: 'Gemini detectando BPM, tom e gênero',
    doneAt: 'analyzed',
  },
  {
    label: 'Gerando',
    description: 'Claude escrevendo 3 variações de título, descrição e tags',
    doneAt: 'ready_for_review',
  },
  {
    label: 'Pronto',
    description: 'Tudo na mesa pra você revisar',
    doneAt: 'ready_for_review',
  },
]

function statusIndex(status: BeatStatus): number {
  return STATUS_ORDER.indexOf(status)
}

function stepState(step: Step, beat: Beat): 'done' | 'active' | 'pending' {
  if (beat.status === 'failed') return 'pending'
  const beatIdx = statusIndex(beat.status)
  const doneIdx = statusIndex(step.doneAt)
  if (beatIdx >= doneIdx) return 'done'
  const prevDone =
    STEPS.indexOf(step) === 0
      ? true
      : statusIndex(STEPS[STEPS.indexOf(step) - 1].doneAt) <= beatIdx
  if (prevDone) return 'active'
  return 'pending'
}

function tempoDecorrido(createdAt: string, now: Date): string {
  try {
    const created = new Date(createdAt)
    const ms = Math.max(0, now.getTime() - created.getTime())
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  } catch {
    return '00:00'
  }
}

export default function BeatPage() {
  const { id } = useParams<{ id: string }>()
  const [beat, setBeat] = useState<Beat | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [now, setNow] = useState<Date>(() => new Date())
  const supabase = createClient()

  useEffect(() => {
    async function fetchBeat() {
      const { data, error } = await supabase
        .from('beats')
        .select('id, status, audio_path, created_at')
        .eq('id', id)
        .maybeSingle()
      if (error) setFetchError(error.message)
      if (data) setBeat(data as Beat)
      setLoading(false)
    }

    fetchBeat()

    const interval = setInterval(fetchBeat, 4000)
    const channel = supabase
      .channel(`beat-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'beats', filter: `id=eq.${id}` },
        (payload) => {
          setBeat((prev) => prev ? { ...prev, ...(payload.new as Partial<Beat>) } : null)
        },
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [id])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando…</span>
      </div>
    )
  }

  if (!beat) {
    return (
      <div
        className="rounded-xl px-5 py-4 text-sm"
        style={{
          background: 'rgba(248,113,113,0.06)',
          border: '1px solid rgba(248,113,113,0.20)',
          color: '#FCA5A5',
        }}
      >
        Beat não encontrado.
        {fetchError && <p className="mt-1 text-xs opacity-70">Erro: {fetchError}</p>}
        <p className="mt-1 text-xs opacity-70">ID: {id}</p>
      </div>
    )
  }

  const failed = beat.status === 'failed'
  const done = beat.status === 'ready_for_review' || beat.status === 'publishing' || beat.status === 'published'
  const decorrido = tempoDecorrido(beat.created_at, now)

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header editorial */}
      <header className="flex flex-col gap-2 rise rise-1">
        <div className="flex items-center justify-between">
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10.5,
              letterSpacing: '0.22em',
              color: 'var(--text-subtle)',
            }}
          >
            03 · IA processando
          </span>
          <span
            className="font-mono tabular uppercase"
            style={{
              fontSize: 10.5,
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
            }}
          >
            T+{decorrido}
          </span>
        </div>

        <h1
          className="font-display text-[40px] font-semibold leading-[1.04]"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.028em' }}
        >
          {failed
            ? 'Pipeline interrompido.'
            : done
              ? 'Tudo pronto.'
              : (
                <>
                  Sua IA está
                  {' '}
                  <span style={{ color: 'var(--text-muted)' }}>trabalhando.</span>
                </>
              )}
        </h1>
        <p className="text-[14px]" style={{ color: 'var(--text-secondary)', maxWidth: 540 }}>
          {failed
            ? 'Algo deu errado no caminho. Tente fazer o upload de novo — se persistir, verifica se o MP3 está íntegro.'
            : done
              ? 'Suas variações de título, descrição e tags estão prontas pra revisar.'
              : 'Detecto BPM, harmonia e gero título, descrição, tags e capa. Tempo médio: 1m 48s. Pode fechar a aba — atualizo aqui automaticamente.'}
        </p>
      </header>

      {failed && (
        <div
          className="mt-6 flex items-center gap-3 rounded-xl px-4 py-3 text-sm rise rise-2"
          style={{
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.20)',
            color: '#FCA5A5',
          }}
        >
          <XCircle className="h-5 w-5 shrink-0" />
          Algo deu errado durante o processamento. Tente fazer o upload novamente.
        </div>
      )}

      {/* Body — pipeline à esquerda + orb à direita */}
      <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-[1fr_360px] md:items-start">
        {/* COLUNA ESQUERDA — Pipeline + CTA */}
        <div className="flex flex-col rise rise-2">
          <ol className="flex flex-col gap-0">
            {STEPS.map((step, i) => {
              const state = stepState(step, beat)
              const isLast = i === STEPS.length - 1

              return (
                <li key={step.label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="relative flex h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        background:
                          state === 'done'
                            ? 'rgba(52, 211, 153, 0.12)'
                            : state === 'active'
                              ? 'rgba(65, 0, 255, 0.16)'
                              : 'rgba(255, 255, 255, 0.03)',
                        border:
                          state === 'done'
                            ? '1px solid rgba(52, 211, 153, 0.45)'
                            : state === 'active'
                              ? '1px solid rgba(65, 0, 255, 0.55)'
                              : '1px solid var(--border-subtle)',
                        boxShadow:
                          state === 'active'
                            ? '0 0 18px rgba(65,0,255,0.40)'
                            : 'none',
                      }}
                    >
                      {state === 'done' ? (
                        <Check size={15} strokeWidth={2.5} style={{ color: 'var(--led-success)' }} />
                      ) : state === 'active' ? (
                        <Loader2 size={15} className="animate-spin" style={{ color: 'var(--purple-soft)' }} />
                      ) : (
                        <span
                          className="block h-1.5 w-1.5 rounded-full"
                          style={{ background: 'var(--text-subtle)' }}
                        />
                      )}
                      {state === 'active' && (
                        <span
                          aria-hidden
                          className="absolute inset-[-3px] rounded-full"
                          style={{
                            border: '1px dashed rgba(199, 181, 255, 0.40)',
                            animation: 'rotate-slow 8s linear infinite',
                          }}
                        />
                      )}
                    </div>
                    {!isLast && (
                      <div
                        className="w-px flex-1 my-1"
                        style={{
                          background:
                            state === 'done'
                              ? 'linear-gradient(180deg, rgba(52,211,153,0.45), var(--border-subtle))'
                              : 'var(--border-subtle)',
                          minHeight: 30,
                        }}
                      />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1 pb-7 pt-1.5">
                    <p
                      className="text-[14.5px] font-semibold"
                      style={{
                        color:
                          state === 'pending'
                            ? 'var(--text-subtle)'
                            : 'var(--text-primary)',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {step.label}
                    </p>
                    <p
                      className="text-[12.5px]"
                      style={{
                        color: state === 'pending' ? 'var(--text-subtle)' : 'var(--text-muted)',
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>

          {done && (
            <div className="mt-2">
              <Link href={`/beats/${id}/review`} className="btn-primary group">
                <Sparkles size={15} strokeWidth={2} />
                Ver títulos e descrições
                <ArrowRight size={14} strokeWidth={2.4} className="transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA — Orb (protagonista) + status */}
        {!failed && (
          <div className="flex flex-col items-center gap-7 rise rise-3 md:sticky md:top-8">
            {/* Orb 3D-ish — solto, grande */}
            <div className="relative flex h-80 w-80 items-center justify-center">
              {/* Halo externo roxo */}
              <div
                aria-hidden
                className="absolute inset-0 animate-pulse-slow"
                style={{
                  background: 'radial-gradient(circle, rgba(65,0,255,0.48), transparent 62%)',
                  filter: 'blur(24px)',
                }}
              />
              {/* Halo magenta deslocado */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(circle at 68% 38%, rgba(255,26,190,0.42), transparent 58%)',
                  filter: 'blur(34px)',
                  animation: 'pulse-slow 3.4s ease-in-out infinite',
                  animationDelay: '-1.2s',
                }}
              />
              {/* Anéis orbitais */}
              <span
                aria-hidden
                className="absolute"
                style={{
                  width: '76%',
                  height: '76%',
                  borderRadius: '50%',
                  border: '1px dashed rgba(199, 181, 255, 0.22)',
                  animation: 'rotate-slow 14s linear infinite',
                }}
              />
              <span
                aria-hidden
                className="absolute"
                style={{
                  width: '92%',
                  height: '92%',
                  borderRadius: '50%',
                  border: '1px dashed rgba(247, 137, 203, 0.14)',
                  animation: 'rotate-slow-reverse 22s linear infinite',
                }}
              />
              {/* Orb principal */}
              <div
                className="relative h-52 w-52 animate-orb-morph"
                style={{
                  background:
                    'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, transparent 28%), linear-gradient(135deg, #4100FF 0%, #FF1ABE 100%)',
                  boxShadow:
                    '0 0 90px rgba(65,0,255,0.55), 0 0 140px rgba(255,26,190,0.30), inset 0 0 50px rgba(255,255,255,0.18), inset -24px -36px 70px rgba(0,0,0,0.34)',
                }}
              >
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
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ color: '#fff', mixBlendMode: 'overlay' }}
                >
                  <div className="wave-bars" style={{ transform: 'scale(1.9)' }}>
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>

            {/* Status text simples */}
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.24em',
                color: done ? 'var(--led-success)' : 'var(--text-secondary)',
              }}
            >
              {done ? 'tudo pronto' : 'ia processando'}
            </span>
          </div>
        )}
      </div>

    </div>
  )
}
