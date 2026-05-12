'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchBeats, deleteBeat, type BeatListItem } from '@/lib/api'
import { BeatCard } from '@/components/BeatCard'

type FiltroKey = 'todos' | 'processando' | 'rascunho' | 'agendado' | 'postado' | 'falhou'

interface Filtro {
  key: FiltroKey
  label: string
  match: (b: BeatListItem) => boolean
}

const FILTROS: Filtro[] = [
  { key: 'todos', label: 'Todos', match: () => true },
  {
    key: 'processando',
    label: 'Processando',
    match: (b) => b.status !== 'failed' && b.status !== 'ready_for_review' && b.post_status !== 'scheduled' && b.post_status !== 'published',
  },
  {
    key: 'rascunho',
    label: 'Rascunho',
    match: (b) => b.status === 'ready_for_review' && b.post_status !== 'scheduled' && b.post_status !== 'published',
  },
  { key: 'agendado', label: 'Agendados', match: (b) => b.post_status === 'scheduled' },
  { key: 'postado', label: 'Postados', match: (b) => b.post_status === 'published' },
  { key: 'falhou', label: 'Falhou', match: (b) => b.status === 'failed' },
]

export default function BeatsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [beats, setBeats] = useState<BeatListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<FiltroKey>('todos')

  useEffect(() => {
    let cancelado = false

    async function carrega() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        const data = await fetchBeats(session.access_token)
        if (!cancelado) {
          setBeats(data)
          setError(null)
        }
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : 'Erro ao carregar')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    carrega()
    // Poll a cada 5s pra status atualizar conforme o pipeline avança
    const interval = setInterval(carrega, 5000)
    return () => { cancelado = true; clearInterval(interval) }
  }, [])

  async function handleDelete(beatId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    try {
      await deleteBeat(beatId, session.access_token)
      setBeats((prev) => prev.filter((b) => b.id !== beatId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao deletar')
    }
  }

  const contagens = useMemo(() => {
    const out: Record<FiltroKey, number> = { todos: 0, processando: 0, rascunho: 0, agendado: 0, postado: 0, falhou: 0 }
    for (const b of beats) {
      for (const f of FILTROS) if (f.match(b)) out[f.key] += 1
    }
    return out
  }, [beats])

  const visiveis = useMemo(() => {
    const f = FILTROS.find((x) => x.key === filtro)!
    return beats.filter(f.match)
  }, [beats, filtro])

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando seus beats...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
        {error}
      </div>
    )
  }

  if (beats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-20 text-center">
        <Upload className="h-10 w-10 text-zinc-600" />
        <h2 className="mt-4 text-lg font-semibold text-white">Você ainda não subiu nenhum beat</h2>
        <p className="mt-1 max-w-sm text-sm text-zinc-400">
          Faça upload do primeiro MP3 e a IA gera título, descrição e tags pra você revisar.
        </p>
        <Link
          href="/upload"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          <Plus className="h-4 w-4" />
          Subir meu primeiro beat
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Meus beats</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {beats.length} {beats.length === 1 ? 'beat' : 'beats'} no total
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          <Plus className="h-4 w-4" />
          Novo beat
        </Link>
      </div>

      {/* Chips de filtro */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const count = contagens[f.key]
          const ativo = filtro === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFiltro(f.key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                ativo
                  ? 'border-violet-500 bg-violet-600 text-white'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800'
              }`}
            >
              {f.label} <span className={ativo ? 'text-violet-200' : 'text-zinc-500'}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Grid de cards */}
      {visiveis.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-12 text-center text-sm text-zinc-500">
          Nenhum beat neste filtro.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {visiveis.map((b) => (
            <BeatCard key={b.id} beat={b} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
