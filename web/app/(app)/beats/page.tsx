'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Upload, CheckSquare, X, Trash2, LayoutGrid, List } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchBeats, deleteBeat, type BeatListItem } from '@/lib/api'
import { BeatCard } from '@/components/BeatCard'
import { BeatListRow } from '@/components/BeatListRow'
import { ConfirmDialog } from '@/components/ConfirmDialog'

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

type ConfirmacaoState =
  | { tipo: 'individual'; beat: BeatListItem }
  | { tipo: 'lote'; ids: string[] }
  | null

export default function BeatsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [beats, setBeats] = useState<BeatListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<FiltroKey>('todos')
  const [modoSelecao, setModoSelecao] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState>(null)
  const [deletando, setDeletando] = useState(false)
  const [vizualizacao, setVizualizacao] = useState<'grade' | 'lista'>(() => {
    if (typeof window === 'undefined') return 'grade'
    return (localStorage.getItem('beats-view') as 'grade' | 'lista') ?? 'grade'
  })

  function toggleVizualizacao() {
    const nova = vizualizacao === 'grade' ? 'lista' : 'grade'
    setVizualizacao(nova)
    localStorage.setItem('beats-view', nova)
  }

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
    // Não polla durante modo seleção pra não bagunçar o estado
    const interval = setInterval(() => { if (!modoSelecao) carrega() }, 5000)
    return () => { cancelado = true; clearInterval(interval) }
  }, [modoSelecao])

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

  function entrarModoSelecao() {
    setModoSelecao(true)
    setSelecionados(new Set())
  }

  function sairModoSelecao() {
    setModoSelecao(false)
    setSelecionados(new Set())
  }

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selecionarTodos() {
    setSelecionados(new Set(visiveis.map((b) => b.id)))
  }

  function pedirDeleteIndividual(beat: BeatListItem) {
    setConfirmacao({ tipo: 'individual', beat })
  }

  function pedirDeleteLote() {
    if (selecionados.size === 0) return
    setConfirmacao({ tipo: 'lote', ids: Array.from(selecionados) })
  }

  async function confirmarDelete() {
    if (!confirmacao) return
    setDeletando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const ids = confirmacao.tipo === 'individual'
        ? [confirmacao.beat.id]
        : confirmacao.ids

      await Promise.all(
        ids.map((id) => deleteBeat(id, session.access_token).catch(() => null))
      )

      setBeats((prev) => prev.filter((b) => !ids.includes(b.id)))
      setConfirmacao(null)
      if (confirmacao.tipo === 'lote') sairModoSelecao()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao deletar')
    } finally {
      setDeletando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando seus beats...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border px-5 py-4 text-sm" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#f87171' }}>
        {error}
      </div>
    )
  }

  if (beats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-20 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
        <Upload className="h-10 w-10" style={{ color: 'var(--text-subtle)' }} />
        <h2 className="mt-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Você ainda não subiu nenhum beat</h2>
        <p className="mt-1 max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
          Faça upload do primeiro MP3 e a IA gera título, descrição e tags pra você revisar.
        </p>
        <Link
          href="/upload"
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition"
          style={{ background: 'var(--accent)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)' }}
        >
          <Plus className="h-4 w-4" />
          Subir meu primeiro beat
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Meus beats</h1>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              {modoSelecao
                ? `${selecionados.size} de ${visiveis.length} ${visiveis.length === 1 ? 'selecionado' : 'selecionados'}`
                : `${beats.length} ${beats.length === 1 ? 'beat' : 'beats'} no total`}
            </p>
          </div>

          {modoSelecao ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selecionarTodos}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-surface)' }}
              >
                Todos ({visiveis.length})
              </button>
              <button
                type="button"
                onClick={pedirDeleteLote}
                disabled={selecionados.size === 0}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: '#dc2626' }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Deletar ({selecionados.size})
              </button>
              <button
                type="button"
                onClick={sairModoSelecao}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-surface)' }}
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Toggle grade/lista */}
              <button
                type="button"
                onClick={toggleVizualizacao}
                title={vizualizacao === 'grade' ? 'Ver como lista' : 'Ver como grade'}
                className="flex h-8 w-8 items-center justify-center rounded-lg border transition"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-surface)' }}
              >
                {vizualizacao === 'grade' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={entrarModoSelecao}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-surface)' }}
              >
                <CheckSquare className="h-4 w-4" />
                Selecionar
              </button>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition"
                style={{ background: 'var(--accent)' }}
              >
                <Plus className="h-4 w-4" />
                Novo beat
              </Link>
            </div>
          )}
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
                className="rounded-full border px-3.5 py-1 text-xs font-medium transition"
                style={{
                  borderColor: ativo ? 'var(--accent)' : 'var(--border)',
                  background: ativo ? 'var(--accent-muted)' : 'var(--bg-surface)',
                  color: ativo ? '#c4b5fd' : 'var(--text-muted)',
                }}
              >
                {f.label}{' '}
                <span style={{ color: ativo ? '#ddd6fe' : 'var(--text-subtle)' }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Conteúdo */}
        {visiveis.length === 0 ? (
          <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-subtle)' }}>
            Nenhum beat neste filtro.
          </div>
        ) : vizualizacao === 'grade' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {visiveis.map((b) => (
              <BeatCard
                key={b.id}
                beat={b}
                modoSelecao={modoSelecao}
                selecionado={selecionados.has(b.id)}
                onToggleSelecionado={toggleSelecionado}
                onPedirDelete={pedirDeleteIndividual}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
            {visiveis.map((b) => (
              <BeatListRow
                key={b.id}
                beat={b}
                modoSelecao={modoSelecao}
                selecionado={selecionados.has(b.id)}
                onToggleSelecionado={toggleSelecionado}
                onPedirDelete={pedirDeleteIndividual}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      <ConfirmDialog
        open={confirmacao !== null}
        danger
        loading={deletando}
        title={
          confirmacao?.tipo === 'lote'
            ? `Deletar ${confirmacao.ids.length} ${confirmacao.ids.length === 1 ? 'beat' : 'beats'}?`
            : confirmacao?.tipo === 'individual'
              ? `Deletar "${confirmacao.beat.titulo ?? 'este beat'}"?`
              : ''
        }
        description={
          confirmacao?.tipo === 'lote'
            ? `Você está prestes a remover ${confirmacao.ids.length} ${confirmacao.ids.length === 1 ? 'beat' : 'beats'} da sua biblioteca. O áudio, capa e tudo que a IA gerou serão apagados permanentemente. Essa ação não pode ser desfeita.`
            : 'O áudio, capa e tudo que a IA gerou serão apagados permanentemente. Essa ação não pode ser desfeita.'
        }
        confirmLabel={
          confirmacao?.tipo === 'lote'
            ? `Sim, deletar ${confirmacao.ids.length}`
            : 'Sim, deletar'
        }
        cancelLabel="Cancelar"
        onConfirm={confirmarDelete}
        onCancel={() => !deletando && setConfirmacao(null)}
      />
    </>
  )
}
