'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Settings2, Check } from 'lucide-react'
import type { BriefPreset } from '@/lib/api'

type Props = {
  presets: BriefPreset[]
  activeId: string | null
  /** -1 = ilimitado */
  limit: number
  loading: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onManage: () => void
}

/**
 * Dropdown compacto pra trocar entre briefs salvos.
 * - Botao mostra o nome do ativo (ou 'Selecione um brief' se vazio)
 * - Click abre lista com radio + 2 botoes: '+ Novo brief' e 'Gerenciar'
 * - '+ Novo brief' fica disabled se atingiu limite
 */
export function BriefSelector({
  presets,
  activeId,
  limit,
  loading,
  onSelect,
  onCreate,
  onManage,
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const active = presets.find((p) => p.id === activeId) ?? null
  const reachedLimit = limit !== -1 && presets.length >= limit
  const limitLabel = limit === -1 ? '∞' : limit

  return (
    <div
      className="relative"
      ref={containerRef}
      style={{ isolation: 'isolate', zIndex: open ? 50 : 'auto' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="group/btn inline-flex items-center gap-2 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
        style={{
          background: open ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-subtle)',
          minWidth: 220,
        }}
        onMouseEnter={(e) => {
          if (!loading && !open) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            e.currentTarget.style.borderColor = 'var(--border-medium)'
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
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
          style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 mt-1.5 overflow-hidden rounded-lg"
          style={{
            zIndex: 100,
            background: '#16161B',  // bg-elevated opaco (sem alpha) pra cobrir tudo abaixo
            border: '1px solid var(--border-medium)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(0,0,0,0.4)',
            minWidth: 260,
          }}
        >
          {/* Lista de presets */}
          {presets.length > 0 ? (
            <div className="max-h-72 overflow-y-auto py-1">
              {presets.map((p) => {
                const selected = p.id === activeId
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onSelect(p.id)
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
                    style={{
                      fontSize: 13,
                      color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: selected ? 'rgba(199,181,255,0.05)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                      style={{
                        border: selected
                          ? '1.5px solid var(--purple-light)'
                          : '1.5px solid var(--border-medium)',
                      }}
                    >
                      {selected && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: 'var(--purple-light)' }}
                        />
                      )}
                    </span>
                    <span className="flex-1 truncate font-medium" style={{ letterSpacing: '-0.005em' }}>
                      {p.name}
                    </span>
                    {selected && (
                      <Check size={12} strokeWidth={2.4} style={{ color: 'var(--purple-light)' }} />
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="px-4 py-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              Você ainda não tem briefs salvos.
            </div>
          )}

          <div className="hairline" />

          {/* Ações */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                if (!reachedLimit) {
                  onCreate()
                  setOpen(false)
                }
              }}
              disabled={reachedLimit}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed"
              style={{
                fontSize: 13,
                color: reachedLimit ? 'var(--text-subtle)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!reachedLimit) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
              title={reachedLimit ? `Limite atingido (${presets.length}/${limitLabel}) — delete um existente` : undefined}
            >
              <Plus size={13} strokeWidth={2} />
              <span className="flex-1">+ Novo brief</span>
              <span
                className="font-mono tabular"
                style={{ fontSize: 10.5, color: 'var(--text-subtle)' }}
              >
                {presets.length}/{limitLabel}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onManage()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <Settings2 size={13} strokeWidth={2} />
              Gerenciar briefs
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
