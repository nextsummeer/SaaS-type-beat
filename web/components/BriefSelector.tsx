'use client'

import { ArrowUpRight } from 'lucide-react'
import type { BriefPreset } from '@/lib/api'

type Props = {
  presets: BriefPreset[]
  activeId: string | null
  loading: boolean
  onOpenManager: () => void
}

/**
 * Card editorial do brief ativo — protagonista visual do header de /capas.
 * Sem brief selecionado, o produtor não consegue gerar capas, então a peça
 * precisa puxar o olho.
 *
 * Estados:
 *   loading: skeleton retangular
 *   active : nome em display + subhead (artista · mood) + LED verde pulsante
 *   empty  : mesmo card em amber com CTA "Escolher brief"
 *
 * Clique abre o ManageBriefsModal (substituiu dropdown floating em 2026-05-21
 * por bug de stacking context com SectionLabel).
 */
export function BriefSelector({
  presets,
  activeId,
  loading,
  onOpenManager,
}: Props) {
  if (loading) {
    return <BriefSelectorSkeleton />
  }

  const active = presets.find((p) => p.id === activeId) ?? null

  if (!active) {
    return <BriefSelectorEmpty onOpen={onOpenManager} />
  }

  const artista = active.brief?.artista_primario?.trim() ?? ''
  const mood = active.brief?.mood?.trim() ?? ''
  const subline = [artista, mood].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={onOpenManager}
      aria-label={`Brief ativo: ${active.name}. Clique pra trocar.`}
      className="group relative block w-full overflow-hidden rounded-2xl text-left transition-all"
      style={{
        background:
          'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)',
        border: '1px solid var(--border-medium)',
        padding: '18px 22px',
        minWidth: 320,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-purple)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-medium)'
      }}
    >
      {/* Top row: eyebrow + LED ativo */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: '0.24em',
            color: 'var(--text-subtle)',
          }}
        >
          / Brief em uso
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
              style={{ background: 'var(--led-success)' }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: 'var(--led-success)' }}
            />
          </span>
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 9.5,
              letterSpacing: '0.22em',
              color: 'var(--led-success)',
            }}
          >
            ativo
          </span>
        </span>
      </div>

      {/* Headline: nome do brief em display */}
      <h3
        className="font-display truncate"
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: '-0.018em',
          lineHeight: 1.1,
          color: 'var(--text-primary)',
        }}
      >
        {active.name}
      </h3>

      {/* Subhead: artista · mood (omite se brief não tem esses campos) */}
      {subline ? (
        <p
          className="mt-1.5 truncate font-mono uppercase"
          style={{
            fontSize: 10.5,
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
          }}
        >
          {subline}
        </p>
      ) : (
        <p
          className="mt-1.5 truncate"
          style={{
            fontSize: 12,
            color: 'var(--text-subtle)',
            fontStyle: 'italic',
          }}
        >
          sem artista/mood definidos
        </p>
      )}

      {/* Hairline + CTA "trocar" */}
      <div
        className="mt-4 flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <span
          className="text-[11.5px]"
          style={{ color: 'var(--text-subtle)' }}
        >
          {presets.length}{' '}
          {presets.length === 1 ? 'brief salvo' : 'briefs salvos'}
        </span>
        <span
          className="inline-flex items-center gap-1 font-mono uppercase transition-transform group-hover:translate-x-0.5"
          style={{
            fontSize: 10,
            letterSpacing: '0.20em',
            color: 'var(--text-primary)',
          }}
        >
          Trocar brief
          <ArrowUpRight size={11} strokeWidth={2.2} />
        </span>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Estado vazio (nenhum brief ativo) — amber call-to-action
// ─────────────────────────────────────────────────────────────────────
function BriefSelectorEmpty({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-2xl text-left transition-all"
      style={{
        background: 'rgba(245, 158, 11, 0.04)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        padding: '18px 22px',
        minWidth: 320,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(245, 158, 11, 0.04)'
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: '0.24em',
            color: '#FCD34D',
          }}
        >
          / Nenhum brief ativo
        </span>
        <span
          className="inline-flex h-2 w-2 rounded-full"
          style={{ background: '#FCD34D' }}
        />
      </div>

      <h3
        className="font-display"
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: '-0.018em',
          lineHeight: 1.1,
          color: 'var(--text-primary)',
        }}
      >
        Selecione um brief
      </h3>

      <p
        className="mt-1.5 text-[12.5px]"
        style={{ color: 'var(--text-muted)' }}
      >
        Você precisa de um brief ativo pra gerar capas.
      </p>

      <div
        className="mt-4 flex items-center justify-end pt-3"
        style={{ borderTop: '1px solid rgba(245, 158, 11, 0.20)' }}
      >
        <span
          className="inline-flex items-center gap-1 font-mono uppercase transition-transform group-hover:translate-x-0.5"
          style={{
            fontSize: 10,
            letterSpacing: '0.20em',
            color: 'var(--text-primary)',
          }}
        >
          Escolher brief
          <ArrowUpRight size={11} strokeWidth={2.2} />
        </span>
      </div>
    </button>
  )
}

function BriefSelectorSkeleton() {
  return (
    <div
      className="shimmer rounded-2xl"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        minWidth: 320,
        height: 128,
      }}
    />
  )
}
