'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Option = { value: string; label: string }

type Props<T extends string> = {
  value: T | ''
  onChange: (v: T | '') => void
  options: readonly (T | Option)[]
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}

/**
 * Custom dropdown estilo Editorial Mono pra substituir <select> HTML nativo
 * (que abre com fundo branco do sistema operacional em qualquer tema).
 *
 * Trigger: mesmo height/padding do input ao lado, valor centralizado em
 * mono. Caret minusculo a direita.
 * Dropdown: abre abaixo, preto puro + hairline, anima fade + scaleY do
 * topo. Selected = LED dot roxo a esquerda do texto.
 *
 * Acessibilidade: role combobox + listbox, keyboard nav (Up/Down/Enter/Esc).
 */
export function MonoSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = '—',
  disabled = false,
  ariaLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState<number>(-1)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  // Normaliza options pra { value, label }
  const normalized: Option[] = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o,
  )

  const selectedIdx = normalized.findIndex((o) => o.value === value)
  const selectedLabel = selectedIdx >= 0 ? normalized[selectedIdx].label : ''

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIdx((i) => Math.min(normalized.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIdx((i) => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightIdx >= 0 && highlightIdx < normalized.length) {
          onChange(normalized[highlightIdx].value as T)
          setOpen(false)
        }
      }
    }
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, normalized, highlightIdx, onChange])

  // Scroll automatico do item highlighted pra dentro da viewport do dropdown
  useEffect(() => {
    if (!open || highlightIdx < 0 || !listRef.current) return
    const child = listRef.current.children[highlightIdx] as HTMLElement | undefined
    if (child) child.scrollIntoView({ block: 'nearest' })
  }, [open, highlightIdx])

  const toggleOpen = useCallback(() => {
    if (disabled) return
    setOpen((prev) => {
      const next = !prev
      if (next) setHighlightIdx(selectedIdx >= 0 ? selectedIdx : 0)
      return next
    })
  }, [disabled, selectedIdx])

  function selectOption(idx: number) {
    onChange(normalized[idx].value as T)
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
          color: 'var(--text-primary)',
          padding: '10px 8px',
          minHeight: 42,
        }}
        onMouseEnter={(e) => {
          if (!disabled && !open) {
            e.currentTarget.style.borderColor = 'var(--border-medium)'
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !open) {
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
          }
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: 14,
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            color: selectedLabel ? 'var(--text-primary)' : 'var(--text-subtle)',
          }}
        >
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          style={{
            color: 'var(--text-muted)',
            transition: 'transform 160ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
      </button>

      {open && !disabled && (
        <div
          className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-lg"
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 16px 36px rgba(0,0,0,0.55)',
            animation: 'mono-select-rise 140ms ease-out',
            transformOrigin: 'top center',
          }}
          role="listbox"
        >
          <style>{`
            @keyframes mono-select-rise {
              from { opacity: 0; transform: translateY(-3px) scaleY(0.92); }
              to   { opacity: 1; transform: translateY(0) scaleY(1); }
            }
            .mono-select-list::-webkit-scrollbar { width: 4px }
            .mono-select-list::-webkit-scrollbar-track { background: transparent }
            .mono-select-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px }
          `}</style>
          <div
            ref={listRef}
            className="mono-select-list overflow-y-auto"
            style={{ maxHeight: 280 }}
          >
            {normalized.map((opt, idx) => {
              const isSelected = idx === selectedIdx
              const isHighlight = idx === highlightIdx
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(idx)}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  className="relative flex w-full items-center justify-center gap-2 transition-colors"
                  style={{
                    background: isHighlight
                      ? 'var(--bg-surface)'
                      : 'transparent',
                    borderBottom:
                      idx < normalized.length - 1
                        ? '1px solid var(--border-subtle)'
                        : 'none',
                    padding: '10px 12px',
                  }}
                >
                  {/* LED dot roxo a esquerda do selected -- sutil */}
                  <span
                    className="absolute left-3 flex h-1.5 w-1.5 items-center justify-center rounded-full"
                    style={{
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      boxShadow: isSelected
                        ? '0 0 6px rgba(124,58,237,0.7)'
                        : 'none',
                      transition: 'background 140ms',
                    }}
                    aria-hidden
                  />
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 13.5,
                      fontWeight: isSelected ? 600 : 500,
                      fontVariantNumeric: 'tabular-nums',
                      color: isSelected
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
