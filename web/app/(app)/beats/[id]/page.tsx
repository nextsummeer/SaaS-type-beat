'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
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

const STEPS = [
  {
    label: 'Upload',
    description: 'Arquivo recebido no servidor',
    doneAt: 'uploaded' as BeatStatus,
  },
  {
    label: 'Conversão',
    description: 'Validando seu MP3',
    doneAt: 'converted' as BeatStatus,
  },
  {
    label: 'Análise com IA',
    description: 'Gemini detecta BPM, tom e gênero',
    doneAt: 'analyzed' as BeatStatus,
  },
  {
    label: 'Geração de títulos',
    description: 'Claude gera título, descrição e tags',
    doneAt: 'ready_for_review' as BeatStatus,
  },
  {
    label: 'Pronto para revisar',
    description: 'Seus títulos e descrições estão prontos',
    doneAt: 'ready_for_review' as BeatStatus,
  },
]

function statusIndex(status: BeatStatus): number {
  return STATUS_ORDER.indexOf(status)
}

function stepState(step: typeof STEPS[number], beat: Beat): 'done' | 'active' | 'pending' {
  if (beat.status === 'failed') return 'pending'
  const beatIdx = statusIndex(beat.status)
  const doneIdx = statusIndex(step.doneAt)
  if (beatIdx >= doneIdx) return 'done'
  // Está ativo se é o próximo passo a ser concluído
  const prevDone = STEPS.indexOf(step) === 0 ? true : statusIndex(STEPS[STEPS.indexOf(step) - 1].doneAt) <= beatIdx
  if (prevDone) return 'active'
  return 'pending'
}

export default function BeatPage() {
  const { id } = useParams<{ id: string }>()
  const [beat, setBeat] = useState<Beat | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
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

    // Polling a cada 4s como fallback ao Realtime
    const interval = setInterval(fetchBeat, 4000)

    // Realtime como complemento
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

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando...</span>
      </div>
    )
  }

  if (!beat) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
        Beat não encontrado.
        {fetchError && <p className="mt-1 text-xs opacity-70">Erro: {fetchError}</p>}
        <p className="mt-1 text-xs opacity-70">ID: {id}</p>
      </div>
    )
  }

  const failed = beat.status === 'failed'
  const done = beat.status === 'ready_for_review' || beat.status === 'publishing' || beat.status === 'published'

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-white">Processando beat</h1>
      <p className="mt-1 text-sm text-zinc-400">
        A IA está trabalhando. Esta página atualiza automaticamente.
      </p>

      {failed && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          <XCircle className="h-5 w-5 shrink-0" />
          Algo deu errado durante o processamento. Tente fazer o upload novamente.
        </div>
      )}

      <ol className="mt-8 flex flex-col gap-0">
        {STEPS.map((step, i) => {
          const state = stepState(step, beat)
          const isLast = i === STEPS.length - 1

          return (
            <li key={step.label} className="flex gap-4">
              {/* Ícone + linha vertical */}
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full">
                  {state === 'done' ? (
                    <CheckCircle2 className="h-7 w-7 text-violet-400" />
                  ) : state === 'active' ? (
                    <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
                  ) : (
                    <Circle className="h-7 w-7 text-zinc-700" />
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 my-1 rounded-full ${state === 'done' ? 'bg-violet-500/40' : 'bg-zinc-800'}`} />
                )}
              </div>

              {/* Texto */}
              <div className="pb-6 pt-0.5">
                <p className={`text-sm font-semibold ${state === 'pending' ? 'text-zinc-600' : 'text-white'}`}>
                  {step.label}
                </p>
                <p className={`text-xs ${state === 'pending' ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  {step.description}
                </p>
              </div>
            </li>
          )
        })}
      </ol>

      {done && (
        <a
          href={`/beats/${id}/review`}
          className="mt-2 inline-block rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Ver títulos e descrições →
        </a>
      )}
    </div>
  )
}
