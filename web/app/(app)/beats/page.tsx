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

type FiltroKey = 'todos' | 'processando' | 'rascunho' | 'agendado' | 'postado' | 'removido' | 'falhou'

interface Filtro {
  key: FiltroKey
  label: string
  cor: string
  match: (b: BeatListItem) => boolean
}

/** Considera "postado" tanto published quanto scheduled cuja data já chegou. */
function estaPostado(b: BeatListItem): boolean {
  if (b.youtube_deleted_at) return false // removidos do YT não contam mais como "postados ativos"
  if (b.post_status === 'published') return true
  if (b.post_status === 'scheduled' && b.scheduled_at && new Date(b.scheduled_at) <= new Date()) {
    return true
  }
  return false
}

/** Vídeo já foi pro YouTube mas o produtor removeu manualmente de lá. */
function foiRemovido(b: BeatListItem): boolean {
  return !!b.youtube_deleted_at
}

/** Agendado de verdade: scheduled mas ainda no futuro. */
function estaAgendadoFuturo(b: BeatListItem): boolean {
  return (
    b.post_status === 'scheduled' &&
    !!b.scheduled_at &&
    new Date(b.scheduled_at) > new Date()
  )
}

const FILTROS: Filtro[] = [
  { key: 'todos', label: 'Todos', cor: 'var(--text-muted)', match: () => true },
  {
    key: 'processando',
    label: 'Processando',
    cor: 'var(--led-warning)',
    match: (b) =>
      b.status !== 'failed' &&
      b.status !== 'ready_for_review' &&
      b.post_status !== 'scheduled' &&
      b.post_status !== 'published',
  },
  {
    key: 'rascunho',
    label: 'Rascunho',
    cor: 'var(--led-draft)',
    match: (b) =>
      b.status === 'ready_for_review' &&
      b.post_status !== 'scheduled' &&
      b.post_status !== 'published',
  },
  { key: 'agendado', label: 'Agendados', cor: 'var(--led-info)', match: estaAgendadoFuturo },
  { key: 'postado', label: 'Postados', cor: 'var(--led-success)', match: estaPostado },
  { key: 'removido', label: 'Removidos', cor: 'var(--text-subtle)', match: foiRemovido },
  { key: 'falhou', label: 'Falhou', cor: 'var(--led-error)', match: (b) => b.status === 'failed' },
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
    const out: Record<FiltroKey, number> = { todos: 0, processando: 0, rascunho: 0, agendado: 0, postado: 0, removido: 0, falhou: 0 }
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
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">Carregando biblioteca…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-5 py-4"
        style={{ borderLeft: '2px solid var(--led-error)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <span className="led" style={{ color: 'var(--led-error)' }} />
        <span className="text-sm" style={{ color: '#fca5a5' }}>{error}</span>
      </div>
    )
  }

  if (beats.length === 0) {
    return (
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed px-6 py-24 text-center"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-20 mx-auto h-40 w-[60%]"
          style={{ background: 'radial-gradient(ellipse at center, var(--accent-muted), transparent 70%)' }}
        />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <Upload className="h-6 w-6" style={{ color: 'var(--text-secondary)' }} />
        </div>
        <h2 className="relative mt-5 font-display text-[24px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Sua biblioteca está vazia
        </h2>
        <p className="relative mt-1.5 max-w-md text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Faça upload do primeiro MP3 e a IA gera título, descrição, tags e capa em menos de 2 minutos.
        </p>
        <Link href="/upload" className="btn-primary relative mt-6">
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          Subir meu primeiro beat
        </Link>
        <div className="relative mt-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-subtle)' }}>
          <div className="wave-bars" style={{ color: 'var(--text-subtle)' }}>
            <span /><span /><span /><span /><span />
          </div>
          aguardando upload
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 rise rise-1">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-subtle)' }}>
              biblioteca
            </span>
            <h1
              className="font-display text-[36px] font-semibold leading-none tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Meus beats
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {modoSelecao ? (
                <>
                  <span className="font-mono" style={{ color: 'var(--accent)' }}>{selecionados.size}</span>
                  {' de '}
                  <span className="font-mono">{visiveis.length}</span>
                  {' '}{visiveis.length === 1 ? 'selecionado' : 'selecionados'}
                </>
              ) : (
                <>
                  <span className="font-mono tabular" style={{ color: 'var(--text-secondary)' }}>{beats.length}</span>{' '}
                  {beats.length === 1 ? 'beat' : 'beats'} na biblioteca
                </>
              )}
            </p>
          </div>

          {modoSelecao ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selecionarTodos}
                className="btn-ghost"
                style={{ padding: '7px 12px', fontSize: 12 }}
              >
                Todos ({visiveis.length})
              </button>
              <button
                type="button"
                onClick={pedirDeleteLote}
                disabled={selecionados.size === 0}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'var(--led-error)', border: '1px solid var(--led-error)' }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Deletar ({selecionados.size})
              </button>
              <button
                type="button"
                onClick={sairModoSelecao}
                className="btn-ghost"
                style={{ padding: '7px 12px', fontSize: 12 }}
              >
                <X className="h-3.5 w-3.5" />
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Toggle grade/lista */}
              <div
                className="flex items-center rounded-lg p-0.5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <button
                  type="button"
                  onClick={() => vizualizacao !== 'grade' && toggleVizualizacao()}
                  title="Ver como grade"
                  className="flex h-7 w-7 items-center justify-center rounded-md transition"
                  style={{
                    background: vizualizacao === 'grade' ? 'var(--bg-elevated)' : 'transparent',
                    color: vizualizacao === 'grade' ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => vizualizacao !== 'lista' && toggleVizualizacao()}
                  title="Ver como lista"
                  className="flex h-7 w-7 items-center justify-center rounded-md transition"
                  style={{
                    background: vizualizacao === 'lista' ? 'var(--bg-elevated)' : 'transparent',
                    color: vizualizacao === 'lista' ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
              <button type="button" onClick={entrarModoSelecao} className="btn-ghost" style={{ padding: '7px 12px', fontSize: 12 }}>
                <CheckSquare className="h-3.5 w-3.5" />
                Selecionar
              </button>
              <Link href="/upload" className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>
                <Plus className="h-4 w-4" strokeWidth={2.4} />
                Novo beat
              </Link>
            </div>
          )}
        </div>

        {/* Chips de filtro */}
        <div className="flex flex-wrap gap-2 rise rise-2">
          {FILTROS.map((f) => {
            const count = contagens[f.key]
            const ativo = filtro === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltro(f.key)}
                className="group inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[14px] transition-colors"
                style={{
                  background: ativo ? 'rgba(255,255,255,0.06)' : 'transparent',
                  border: '1px solid',
                  borderColor: ativo ? 'var(--border-strong)' : 'var(--border)',
                  color: ativo ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: ativo ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!ativo) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!ativo) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }
                }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background: f.cor,
                    opacity: ativo ? 1 : 0.55,
                    boxShadow: ativo ? `0 0 8px ${f.cor}` : 'none',
                  }}
                />
                <span>{f.label}</span>
                {count > 0 && (
                  <span
                    className="tabular text-[13px]"
                    style={{ color: ativo ? 'var(--text-secondary)' : 'var(--text-subtle)' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Conteúdo */}
        {visiveis.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-16 text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-subtle)' }}>
              filtro vazio
            </span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum beat neste estado.</p>
          </div>
        ) : vizualizacao === 'grade' ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 rise rise-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
          <div
            className="overflow-hidden rounded-xl rise rise-3"
            style={{ borderColor: 'var(--border)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
          >
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
