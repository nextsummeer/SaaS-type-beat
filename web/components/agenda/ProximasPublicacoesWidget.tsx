'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, ChevronRight, Loader2, FileEdit, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchBeats, type BeatListItem } from '@/lib/api'
import {
  dataDoBeatNoCalendario,
  ehAgendadoFuturo,
  ehDeletadoYoutube,
} from '@/lib/agenda'
import { useCoverUrl } from '@/components/BeatCard'

const MAX_ITENS = 5

function ehRascunhoPendente(b: BeatListItem): boolean {
  return (
    !ehDeletadoYoutube(b) &&
    b.status === 'ready_for_review' &&
    b.post_status !== 'scheduled' &&
    b.post_status !== 'published'
  )
}

function formatarTempoAteData(d: Date): string {
  const agora = new Date()
  const diffMs = d.getTime() - agora.getTime()
  if (diffMs <= 0) return 'agora'
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 60) return `em ${diffMin} min`
  const diffHoras = Math.round(diffMin / 60)
  if (diffHoras < 24) return diffHoras === 1 ? 'em 1 hora' : `em ${diffHoras} horas`
  const hoje0h = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const alvo0h = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDias = Math.round((alvo0h.getTime() - hoje0h.getTime()) / 86400000)
  if (diffDias === 1) return 'amanhã'
  if (diffDias < 7) return `em ${diffDias} dias`
  if (diffDias < 30) {
    const semanas = Math.round(diffDias / 7)
    return semanas === 1 ? 'em 1 semana' : `em ${semanas} semanas`
  }
  return `em ${diffDias} dias`
}

function formatarDataChip(d: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(d)
    .replace('.', '')
}

export function ProximasPublicacoesWidget() {
  const [beats, setBeats] = useState<BeatListItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    async function carrega() {
      try {
        const supabase = createClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) {
          if (!cancelado) setCarregando(false)
          return
        }
        const lista = await fetchBeats(token)
        if (cancelado) return
        setBeats(lista)
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro ao carregar')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    carrega()
    return () => {
      cancelado = true
    }
  }, [])

  const proximos = beats
    .filter((b) => !ehDeletadoYoutube(b) && ehAgendadoFuturo(b))
    .sort((a, b) => {
      const da = dataDoBeatNoCalendario(a)?.getTime() ?? 0
      const db = dataDoBeatNoCalendario(b)?.getTime() ?? 0
      return da - db
    })
    .slice(0, MAX_ITENS)

  const rascunhos = beats.filter(ehRascunhoPendente).length

  return (
    <section
      className="rise rise-2 overflow-hidden rounded-2xl transition-colors"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-hover)'
        e.currentTarget.style.boxShadow = 'var(--glow-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '14px 22px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <CalendarClock size={13} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
          <p
            className="font-mono uppercase"
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: '0.22em',
              color: 'var(--text-secondary)',
            }}
          >
            Próximas publicações
          </p>
        </div>
        <Link
          href="/agenda"
          className="group flex items-center gap-1 font-mono uppercase transition-colors"
          style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          Ver agenda
          <ChevronRight size={12} className="transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Body */}
      {carregando ? (
        <div
          className="flex items-center justify-center gap-2"
          style={{ padding: '32px 20px', color: 'var(--text-muted)' }}
        >
          <Loader2 size={14} className="animate-spin" />
          <span style={{ fontSize: 13 }}>Carregando…</span>
        </div>
      ) : erro ? (
        <div style={{ padding: '20px', fontSize: 13, color: 'var(--led-error)' }}>{erro}</div>
      ) : proximos.length === 0 && rascunhos > 0 ? (
        <RascunhosCallout count={rascunhos} />
      ) : proximos.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul style={{ padding: '4px 0' }}>
            {proximos.map((beat) => (
              <ItemPublicacao key={beat.id} beat={beat} />
            ))}
          </ul>
          {rascunhos > 0 && <RascunhosFooter count={rascunhos} />}
        </>
      )}
    </section>
  )
}

function ItemPublicacao({ beat }: { beat: BeatListItem }) {
  const coverUrl = useCoverUrl(beat.cover_path)
  const data = dataDoBeatNoCalendario(beat)
  if (!data) return null
  const tempoRelativo = formatarTempoAteData(data)
  const dataChip = formatarDataChip(data)

  return (
    <li>
      <Link
        href={`/beats/${beat.id}/review`}
        className="group flex items-center gap-3 transition-colors"
        style={{ padding: '12px 22px' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <span
          className="relative shrink-0 overflow-hidden"
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className="line-clamp-1 text-[13.5px] font-medium leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {beat.titulo ?? 'Aguardando IA'}
          </p>
          <p
            className="line-clamp-1 text-[12px] leading-tight"
            style={{ color: 'var(--text-muted)', marginTop: 3 }}
          >
            {beat.artista_nome ?? '—'}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.14em',
              color: 'var(--text-primary)',
            }}
          >
            {tempoRelativo}
          </span>
          <span
            className="font-mono tabular"
            style={{ fontSize: 11, color: 'var(--text-muted)' }}
          >
            {dataChip}
          </span>
        </div>

        <ChevronRight
          size={14}
          className="shrink-0 transition group-hover:translate-x-0.5"
          style={{ color: 'var(--text-subtle)' }}
        />
      </Link>
    </li>
  )
}

/** Empty state quando nao tem nada — nem agendamento, nem rascunho. */
function EmptyState() {
  return (
    <div
      className="flex flex-col items-center gap-3 text-center"
      style={{ padding: '36px 20px' }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <CalendarClock size={16} strokeWidth={1.6} />
      </div>
      <div className="flex flex-col gap-1">
        <p style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500 }}>
          Nenhuma publicação agendada.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Programe seus beats na agenda pra manter o canal consistente.
        </p>
      </div>
      <Link
        href="/agenda"
        className="font-mono uppercase transition-colors"
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          color: 'var(--text-secondary)',
          marginTop: 6,
          borderBottom: '1px solid var(--border-medium)',
          paddingBottom: 2,
        }}
      >
        Ir pra agenda →
      </Link>
    </div>
  )
}

/** Estado especial: sem agendamentos, MAS tem rascunhos esperando. Proativo. */
function RascunhosCallout({ count }: { count: number }) {
  return (
    <div
      className="flex flex-col items-center gap-3 text-center"
      style={{ padding: '32px 20px' }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(199,181,255,0.16), rgba(247,137,203,0.08))',
          border: '1px solid rgba(199,181,255,0.30)',
          color: 'var(--purple-soft)',
        }}
      >
        <FileEdit size={17} strokeWidth={1.6} />
      </div>
      <div className="flex flex-col gap-1">
        <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
          {count === 1 ? '1 rascunho aguardando' : `${count} rascunhos aguardando`}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 320 }}>
          A IA terminou de gerar — agora é com você. Escolha quando publicar e
          revise título, descrição e tags.
        </p>
      </div>
      <Link href="/agenda" className="btn-primary group" style={{ marginTop: 6 }}>
        <CalendarClock size={13} strokeWidth={2} />
        {count === 1 ? 'Agendar rascunho' : 'Agendar rascunhos'}
        <ArrowRight size={13} strokeWidth={2.4} className="transition group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}

/** Footer sutil quando tem agendamentos + rascunhos pendentes em paralelo. */
function RascunhosFooter({ count }: { count: number }) {
  return (
    <Link
      href="/agenda"
      className="group flex items-center justify-between gap-3 transition-colors"
      style={{
        padding: '11px 22px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(199, 181, 255, 0.04)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(199, 181, 255, 0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(199, 181, 255, 0.04)'
      }}
    >
      <div className="flex items-center gap-2.5">
        <FileEdit size={12} strokeWidth={1.8} style={{ color: 'var(--purple-soft)' }} />
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10.5,
            letterSpacing: '0.16em',
            color: 'var(--text-secondary)',
          }}
        >
          + {count} {count === 1 ? 'rascunho aguardando' : 'rascunhos aguardando'}
        </span>
      </div>
      <span
        className="font-mono uppercase transition"
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          color: 'var(--purple-soft)',
        }}
      >
        agendar →
      </span>
    </Link>
  )
}
