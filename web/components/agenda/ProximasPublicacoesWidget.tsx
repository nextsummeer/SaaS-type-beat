'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchBeats, type BeatListItem } from '@/lib/api'
import {
  dataDoBeatNoCalendario,
  ehAgendadoFuturo,
  ehDeletadoYoutube,
} from '@/lib/agenda'
import { useCoverUrl } from '@/components/BeatCard'

const MAX_ITENS = 5

function formatarTempoAteData(d: Date): string {
  const agora = new Date()
  const diffMs = d.getTime() - agora.getTime()
  if (diffMs <= 0) return 'agora'
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 60) return `em ${diffMin} min`
  const diffHoras = Math.round(diffMin / 60)
  if (diffHoras < 24) return diffHoras === 1 ? 'em 1 hora' : `em ${diffHoras} horas`
  // Calcula dias considerando meia-noite local (não 24h cravados)
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
        const proximos = lista
          .filter((b) => !ehDeletadoYoutube(b) && ehAgendadoFuturo(b))
          .sort((a, b) => {
            const da = dataDoBeatNoCalendario(a)?.getTime() ?? 0
            const db = dataDoBeatNoCalendario(b)?.getTime() ?? 0
            return da - db
          })
          .slice(0, MAX_ITENS)
        setBeats(proximos)
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

  return (
    <section
      className="rise rise-2 overflow-hidden rounded-2xl"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-muted)',
          background: 'var(--bg-base)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <CalendarClock size={14} style={{ color: 'var(--accent)' }} />
          <p
            className="font-mono uppercase"
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.2em',
              color: 'var(--text-secondary)',
            }}
          >
            Próximas publicações
          </p>
        </div>
        <Link
          href="/agenda"
          className="flex items-center gap-1 font-mono uppercase transition"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'var(--text-muted)',
          }}
        >
          Ver agenda
          <ChevronRight size={12} />
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
      ) : beats.length === 0 ? (
        <EmptyState />
      ) : (
        <ul style={{ padding: '4px 0' }}>
          {beats.map((beat) => (
            <ItemPublicacao key={beat.id} beat={beat} />
          ))}
        </ul>
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
        style={{
          padding: '12px 20px',
          borderTop: '1px solid transparent',
          borderBottom: '1px solid transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        {/* Thumb */}
        <span
          className="relative shrink-0 overflow-hidden"
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </span>

        {/* Titulo + artista */}
        <div className="min-w-0 flex-1">
          <p
            className="line-clamp-1 text-[13.5px] font-medium leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {beat.titulo ?? 'Aguardando IA'}
          </p>
          <p
            className="line-clamp-1 text-[11.5px] leading-tight"
            style={{ color: 'var(--text-muted)', marginTop: 2 }}
          >
            {beat.artista_nome ?? '—'}
          </p>
        </div>

        {/* Tempo relativo + data */}
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.12em',
              color: 'var(--accent)',
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

        {/* Chevron */}
        <ChevronRight
          size={14}
          className="shrink-0 transition group-hover:translate-x-0.5"
          style={{ color: 'var(--text-subtle)' }}
        />
      </Link>
    </li>
  )
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center gap-3 text-center"
      style={{ padding: '32px 20px' }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
        }}
      >
        <CalendarClock size={16} strokeWidth={1.75} />
      </div>
      <div className="flex flex-col gap-0.5">
        <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>
          Nenhuma publicação agendada.
        </p>
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          Programe seus beats na agenda pra manter o canal consistente.
        </p>
      </div>
      <Link
        href="/agenda"
        className="font-mono uppercase transition"
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          color: 'var(--accent)',
          marginTop: 4,
        }}
      >
        Ir pra agenda →
      </Link>
    </div>
  )
}
