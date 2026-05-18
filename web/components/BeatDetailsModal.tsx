'use client'

import { useEffect, useState } from 'react'
import {
  X,
  RefreshCw,
  Eye,
  Heart,
  MessageSquare,
  Clock,
  ExternalLink,
  Calendar,
  TrendingUp,
  Lock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AnalyticsMyBeatItem } from '@/lib/api'
import { formatDuration, engagementRate, totalAge } from '@/lib/utils'

interface Props {
  beat: AnalyticsMyBeatItem | null
  onClose: () => void
  onReload: () => Promise<void>
  reloading?: boolean
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function privacyLabel(status: string): string {
  if (status === 'private') return 'Privado'
  if (status === 'unlisted') return 'Não listado'
  return 'Público'
}

function MetricCard({
  label,
  sublabel,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string
  sublabel?: string
  value: string | number
  icon: React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>
  accent?: boolean
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl px-4 py-3.5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3" style={{ color: 'var(--text-subtle)' }} />
        <span
          className="font-mono text-[9px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--text-subtle)' }}
        >
          {label}
        </span>
      </div>
      <span
        className="font-display text-[26px] font-semibold leading-none tabular"
        style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)' }}
      >
        {value}
      </span>
      {sublabel && (
        <span
          className="font-mono text-[9px] uppercase tracking-wider"
          style={{ color: 'var(--text-subtle)' }}
        >
          {sublabel}
        </span>
      )}
    </div>
  )
}

export function BeatDetailsModal({ beat, onClose, onReload, reloading = false }: Props) {
  const supabase = createClient()
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    if (!beat?.cover_path) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCoverUrl(null)
      return
    }
    supabase.storage
      .from('covers')
      .createSignedUrl(beat.cover_path, 3600)
      .then(({ data }) => {
        if (!cancelado && data?.signedUrl) setCoverUrl(data.signedUrl)
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat?.cover_path])

  useEffect(() => {
    if (!beat) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !reloading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [beat, reloading, onClose])

  useEffect(() => {
    if (!beat) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [beat])

  if (!beat) return null

  const engagement = engagementRate(beat.view_count, beat.like_count, beat.comment_count)
  const age = totalAge(beat.published_at)
  const inicial = (beat.artista_nome ?? beat.titulo ?? '?').trim().charAt(0).toUpperCase()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={() => !reloading && onClose()}
    >
      <div
        className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl shadow-2xl lg:grid-cols-[360px_1fr]"
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border)',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ESQUERDA — preview do beat */}
        <div
          className="flex flex-col gap-5 overflow-y-auto p-6 lg:border-r"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          {/* Thumbnail */}
          <div
            className="relative aspect-square w-full overflow-hidden rounded-xl"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-muted)',
            }}
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt={beat.titulo ?? ''} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-overlay))',
                }}
              >
                <span
                  className="font-display text-7xl font-semibold"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {inicial}
                </span>
              </div>
            )}
          </div>

          {/* Titulo + artista */}
          <div className="flex flex-col gap-1.5">
            <h2
              className="font-display text-[22px] font-semibold leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {beat.titulo ?? '(sem título)'}
            </h2>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {beat.artista_nome ?? 'sem artista'}
            </p>
          </div>

          {/* Chips de stats compactas */}
          <div className="flex flex-wrap gap-2">
            <span
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <Eye className="h-3 w-3" />
              {beat.view_count.toLocaleString('pt-BR')}
            </span>
            <span
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <Heart className="h-3 w-3" />
              {beat.like_count.toLocaleString('pt-BR')}
            </span>
            <span
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px]"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <MessageSquare className="h-3 w-3" />
              {beat.comment_count.toLocaleString('pt-BR')}
            </span>
          </div>

          {/* Data + privacy */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--text-subtle)' }} />
            <span className="font-mono text-[11px] tabular" style={{ color: 'var(--text-muted)' }}>
              {formatDate(beat.published_at)}
            </span>
            {beat.privacy_status !== 'public' && (
              <span
                className="ml-auto rounded-md px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider"
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {privacyLabel(beat.privacy_status)}
              </span>
            )}
          </div>

          {/* Link YouTube */}
          {beat.youtube_url && (
            <a
              href={beat.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] transition"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.color = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
            >
              <ExternalLink className="h-3 w-3" />
              Abrir no YouTube
            </a>
          )}
        </div>

        {/* DIREITA — metricas detalhadas */}
        <div className="flex flex-col gap-5 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span
                className="font-mono text-[10px] uppercase tracking-[0.22em]"
                style={{ color: 'var(--text-subtle)' }}
              >
                video intelligence
              </span>
              <h3
                className="font-display text-[18px] font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Daily Reports
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onReload()}
                disabled={reloading}
                className="flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] transition"
                style={{
                  background: 'var(--text-primary)',
                  color: 'var(--bg-base)',
                  opacity: reloading ? 0.5 : 1,
                  cursor: reloading ? 'not-allowed' : 'pointer',
                }}
              >
                <RefreshCw
                  className="h-3 w-3"
                  style={{ animation: reloading ? 'spin 0.8s linear infinite' : undefined }}
                />
                Reload
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={reloading}
                className="flex h-9 w-9 items-center justify-center rounded-full transition"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="h-px w-full" style={{ background: 'var(--border)' }} />

          {/* Cards principais (4) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              icon={Eye}
              label="Views"
              sublabel="Total Reach"
              value={beat.view_count.toLocaleString('pt-BR')}
              accent
            />
            <MetricCard
              icon={Heart}
              label="Likes"
              sublabel="Engagement"
              value={beat.like_count.toLocaleString('pt-BR')}
            />
            <MetricCard
              icon={MessageSquare}
              label="Comments"
              sublabel="Feedback"
              value={beat.comment_count.toLocaleString('pt-BR')}
            />
            <MetricCard
              icon={Clock}
              label="Duration"
              sublabel="Total Length"
              value={formatDuration(beat.duration_seconds)}
            />
          </div>

          {/* Cards secundarios (3) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard
              icon={TrendingUp}
              label="Engagement Rate"
              sublabel="likes + comments / views"
              value={`${engagement.toFixed(1)}%`}
            />
            <MetricCard
              icon={Calendar}
              label="Total Age"
              sublabel="Desde a publicação"
              value={age}
            />
            <MetricCard
              icon={Lock}
              label="Privacy"
              sublabel="Visibilidade no YouTube"
              value={privacyLabel(beat.privacy_status)}
            />
          </div>

          {/* Footer informativo */}
          <div
            className="mt-auto rounded-xl px-4 py-3"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-muted)',
            }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
              Dados em tempo quase real via YouTube Data API. Métricas avançadas como curva de
              retenção e progressão histórica de views serão adicionadas em versões futuras.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
