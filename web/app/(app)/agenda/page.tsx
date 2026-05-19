'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CalendarRange, Loader2, Upload, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchBeats, reschedulePost, patchPost, type BeatListItem } from '@/lib/api'
import {
  chaveLocal,
  dataDoBeatNoCalendario,
  ehAgendadoFuturo,
  ehDeletadoYoutube,
  ehMesmoMes,
  ehPublicadoEfetivo,
} from '@/lib/agenda'
import { AgendaHeader } from '@/components/agenda/AgendaHeader'
import { MonthCalendar } from '@/components/agenda/MonthCalendar'
import { BeatChipOverlay } from '@/components/agenda/BeatChip'
import { QuickScheduleModal } from '@/components/agenda/QuickScheduleModal'

interface PostIdsByBeat {
  [beatId: string]: string
}

export default function AgendaPage() {
  const supabase = createClient()
  const hoje = useMemo(() => new Date(), [])
  const [token, setToken] = useState<string | null>(null)
  const [beats, setBeats] = useState<BeatListItem[]>([])
  const [postIds, setPostIds] = useState<PostIdsByBeat>({})
  const [carregando, setCarregando] = useState(true)
  const [erroGlobal, setErroGlobal] = useState<string | null>(null)
  const [mesVisivel, setMesVisivel] = useState({
    ano: hoje.getFullYear(),
    mes: hoje.getMonth(),
  })
  const [arrastandoBeat, setArrastandoBeat] = useState<BeatListItem | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [dataClicada, setDataClicada] = useState<Date | null>(null)
  const [flash, setFlash] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  // Carrega beats + token + post_ids
  useEffect(() => {
    let cancelado = false
    async function carrega() {
      try {
        setCarregando(true)
        setErroGlobal(null)
        const { data: sessionData } = await supabase.auth.getSession()
        const tk = sessionData.session?.access_token ?? null
        if (!tk) {
          setErroGlobal('Faça login pra ver a agenda')
          return
        }
        const lista = await fetchBeats(tk)
        if (cancelado) return
        setToken(tk)
        setBeats(lista)

        // Busca post_id (variacao=A) por beat — só pros que importam (agendados ou em rascunho)
        const ids: PostIdsByBeat = {}
        const relevantes = lista.filter(
          (b) => b.post_status === 'scheduled' || b.status === 'ready_for_review',
        )
        const { data: postsRows } = await supabase
          .from('posts')
          .select('id, beat_id')
          .in('beat_id', relevantes.map((b) => b.id))
          .eq('variacao', 'A')
        if (postsRows) {
          for (const row of postsRows) ids[row.beat_id] = row.id
        }
        if (!cancelado) setPostIds(ids)
      } catch (e) {
        if (!cancelado) {
          setErroGlobal(e instanceof Error ? e.message : 'Erro ao carregar agenda')
        }
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    carrega()
    return () => {
      cancelado = true
    }
  }, [supabase])

  // Auto-dismiss do flash
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 3200)
    return () => clearTimeout(t)
  }, [flash])

  // Beats que aparecem como chip em alguma celula (precisam ter data e estado
  // que indique presenca no calendario). Beats deletados do YouTube saem da agenda.
  const beatsNoCalendario = useMemo(
    () =>
      beats.filter((b) => {
        if (ehDeletadoYoutube(b)) return false
        if (dataDoBeatNoCalendario(b) === null) return false
        return ehAgendadoFuturo(b) || ehPublicadoEfetivo(b)
      }),
    [beats],
  )

  // Agrupado por dia (chave local YYYY-MM-DD)
  const beatsPorDia = useMemo(() => {
    const mapa = new Map<string, BeatListItem[]>()
    for (const b of beatsNoCalendario) {
      const d = dataDoBeatNoCalendario(b)
      if (!d) continue
      const chave = chaveLocal(d)
      const arr = mapa.get(chave)
      if (arr) arr.push(b)
      else mapa.set(chave, [b])
    }
    for (const arr of mapa.values()) {
      arr.sort((a, b) => {
        const da = dataDoBeatNoCalendario(a)?.getTime() ?? 0
        const db = dataDoBeatNoCalendario(b)?.getTime() ?? 0
        return da - db
      })
    }
    return mapa
  }, [beatsNoCalendario])

  // Contadores no mes visivel
  const contadores = useMemo(() => {
    const { ano, mes } = mesVisivel
    let agendados = 0
    let publicando = 0
    let publicadosNoMes = 0
    let rascunhos = 0
    for (const b of beats) {
      const d = dataDoBeatNoCalendario(b)
      const noMes = d ? ehMesmoMes(d, ano, mes) : false
      if (
        b.status === 'ready_for_review' &&
        b.post_status !== 'scheduled' &&
        b.post_status !== 'published'
      ) {
        rascunhos++
      }
      if (b.status === 'publishing' && noMes) publicando++
      if (noMes && ehAgendadoFuturo(b)) agendados++
      if (noMes && ehPublicadoEfetivo(b)) publicadosNoMes++
    }
    return { agendados, publicando, publicadosNoMes, rascunhos }
  }, [beats, mesVisivel])

  // Drafts pro modal (rascunhos sem agendamento)
  const draftsDisponiveis = useMemo(
    () =>
      beats.filter(
        (b) =>
          b.status === 'ready_for_review' &&
          b.post_status !== 'scheduled' &&
          b.post_status !== 'published',
      ),
    [beats],
  )

  function irParaMesAnterior() {
    setMesVisivel((prev) => {
      const novaData = new Date(prev.ano, prev.mes - 1, 1)
      return { ano: novaData.getFullYear(), mes: novaData.getMonth() }
    })
  }

  function irParaProximoMes() {
    setMesVisivel((prev) => {
      const novaData = new Date(prev.ano, prev.mes + 1, 1)
      return { ano: novaData.getFullYear(), mes: novaData.getMonth() }
    })
  }

  function irParaHoje() {
    setMesVisivel({ ano: hoje.getFullYear(), mes: hoje.getMonth() })
  }

  function handleDragStart(event: DragStartEvent) {
    const beat = event.active.data.current?.beat as BeatListItem | undefined
    if (beat) setArrastandoBeat(beat)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const beat = event.active.data.current?.beat as BeatListItem | undefined
    const dropData = event.over?.data.current as { date?: Date } | undefined
    setArrastandoBeat(null)

    if (!beat || !dropData?.date || !token) return
    if (ehPublicadoEfetivo(beat)) {
      setFlash({
        tipo: 'erro',
        msg: 'Beat já publicado no YouTube — edite pelo YouTube Studio.',
      })
      return
    }
    const dataAnterior = dataDoBeatNoCalendario(beat)
    if (!dataAnterior) return

    const novaData = new Date(dropData.date)
    novaData.setHours(
      dataAnterior.getHours(),
      dataAnterior.getMinutes(),
      0,
      0,
    )

    // Sem mudança
    if (novaData.getTime() === dataAnterior.getTime()) return
    if (novaData.getTime() < Date.now()) {
      setFlash({ tipo: 'erro', msg: 'Não dá pra reagendar pro passado.' })
      return
    }

    const postId = postIds[beat.id]
    if (!postId) {
      setFlash({ tipo: 'erro', msg: 'Post não encontrado pra esse beat.' })
      return
    }

    // Otimistico: atualiza local primeiro
    const isoNovo = novaData.toISOString()
    setBeats((prev) =>
      prev.map((b) => (b.id === beat.id ? { ...b, scheduled_at: isoNovo } : b)),
    )

    try {
      await reschedulePost(postId, token, novaData)
      setFlash({
        tipo: 'ok',
        msg: `${beat.titulo ?? 'Beat'} reagendado pra ${novaData.toLocaleDateString('pt-BR')}.`,
      })
    } catch (e) {
      // Rollback
      setBeats((prev) =>
        prev.map((b) =>
          b.id === beat.id ? { ...b, scheduled_at: dataAnterior.toISOString() } : b,
        ),
      )
      setFlash({
        tipo: 'erro',
        msg: e instanceof Error ? e.message : 'Erro ao reagendar',
      })
    }
  }

  function handleDiaVazioClick(data: Date) {
    setDataClicada(data)
    setModalAberto(true)
  }

  async function handleConfirmarAgendamento(beat: BeatListItem, scheduledAt: Date) {
    if (!token) throw new Error('Sessão expirou')
    const postId = postIds[beat.id]
    if (!postId) throw new Error('Post não encontrado pra esse beat')

    // Usa o PATCH /posts/{id} com status=scheduled (dispara worker)
    await patchPost(postId, token, {
      scheduled_at: scheduledAt.toISOString(),
      status: 'scheduled',
    })

    setBeats((prev) =>
      prev.map((b) =>
        b.id === beat.id
          ? {
              ...b,
              scheduled_at: scheduledAt.toISOString(),
              post_status: 'scheduled',
            }
          : b,
      ),
    )
    setModalAberto(false)
    setFlash({
      tipo: 'ok',
      msg: `${beat.titulo ?? 'Beat'} agendado pra ${scheduledAt.toLocaleDateString('pt-BR')}.`,
    })
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Flash messages */}
      {flash && (
        <div
          role="status"
          className="rise"
          style={{
            padding: '10px 14px',
            background:
              flash.tipo === 'ok' ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${flash.tipo === 'ok' ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
            borderRadius: 'var(--radius-md)',
            color: flash.tipo === 'ok' ? '#86efac' : '#fca5a5',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            className="led"
            style={{
              color: flash.tipo === 'ok' ? 'var(--led-success)' : 'var(--led-error)',
            }}
          />
          {flash.msg}
        </div>
      )}

      <AgendaHeader
        ano={mesVisivel.ano}
        mes={mesVisivel.mes}
        hoje={hoje}
        contadores={contadores}
        onMesAnterior={irParaMesAnterior}
        onProximoMes={irParaProximoMes}
        onHoje={irParaHoje}
      />

      {carregando ? (
        <div
          className="flex items-center justify-center gap-2"
          style={{
            padding: 60,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)',
          }}
        >
          <Loader2 size={16} className="animate-spin" />
          <span style={{ fontSize: 13 }}>Carregando agenda…</span>
        </div>
      ) : erroGlobal ? (
        <div
          className="flex items-center gap-2"
          style={{
            padding: 16,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: 13,
          }}
        >
          <AlertCircle size={14} />
          {erroGlobal}
        </div>
      ) : beats.length === 0 ? (
        <EmptyState />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <MonthCalendar
            ano={mesVisivel.ano}
            mes={mesVisivel.mes}
            hoje={hoje}
            beatsPorDia={beatsPorDia}
            onDiaVazioClick={handleDiaVazioClick}
          />
          <DragOverlay dropAnimation={null}>
            {arrastandoBeat ? <BeatChipOverlay beat={arrastandoBeat} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Rodape: hint */}
      {!carregando && !erroGlobal && beats.length > 0 && (
        <p
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'var(--text-subtle)',
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          Arraste chips entre dias pra reagendar · Clique num dia vazio pra agendar um rascunho
        </p>
      )}

      <QuickScheduleModal
        aberto={modalAberto}
        dataInicial={dataClicada}
        draftsDisponiveis={draftsDisponiveis}
        onConfirmar={handleConfirmarAgendamento}
        onFechar={() => setModalAberto(false)}
      />
    </div>
  )
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center gap-4 text-center"
      style={{
        padding: '64px 20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--accent)',
        }}
      >
        <CalendarRange size={20} strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-1">
        <h2
          className="font-display"
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}
        >
          Sua agenda começa aqui
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360 }}>
          Suba um beat, escolha quando publicar e ele aparece nesse calendário pra
          você reorganizar à vontade.
        </p>
      </div>
      <Link href="/upload" className="btn-primary">
        <Upload size={14} strokeWidth={2} />
        Subir primeiro beat
      </Link>
    </div>
  )
}
