'use client'

import { ChevronDown } from 'lucide-react'
import type { BriefPreset } from '@/lib/api'

type Props = {
  presets: BriefPreset[]
  activeId: string | null
  loading: boolean
  onOpenManager: () => void
}

/**
 * Botão clicável que abre o ManageBriefsModal.
 * Substituiu o dropdown floating original (2026-05-21) — o dropdown tinha
 * bug de stacking context com a SectionLabel abaixo, mesmo com z-index alto
 * e isolation. Modal direto é mais simples e robusto.
 */
export function BriefSelector({
  presets,
  activeId,
  loading,
  onOpenManager,
}: Props) {
  const active = presets.find((p) => p.id === activeId) ?? null

  return (
    <button
      type="button"
      onClick={onOpenManager}
      disabled={loading}
      className="group/btn inline-flex items-center gap-2 rounded-lg px-3 py-2 transition-all disabled:opacity-50"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-subtle)',
        minWidth: 220,
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.borderColor = 'var(--border-medium)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
      }}
      aria-label="Gerenciar briefs"
    >
      <span
        className="flex-1 truncate text-left text-[14px] font-medium"
        style={{
          color: active ? 'var(--text-primary)' : 'var(--text-muted)',
          letterSpacing: '-0.005em',
        }}
      >
        {loading ? 'Carregando…' : active?.name ?? 'Selecione um brief'}
      </span>
      <ChevronDown
        size={14}
        strokeWidth={2}
        style={{ color: 'var(--text-muted)' }}
        className="transition-transform group-hover/btn:translate-y-0.5"
      />
    </button>
  )
}
