'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Modal genérico de confirmação no estilo Editorial Mono BeatPost.
 *
 * UX detail importante: backdrop fecha SOMENTE se mousedown TAMBÉM
 * foi no backdrop. Sem isso, drag de texto de dentro pra fora do modal
 * fecharia ele (mouseup acabaria caindo no backdrop = click).
 *
 * Esc cancela. Enter NÃO confirma (pra evitar delete acidental — usar mouse).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const mouseDownOnBackdropRef = useRef(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
      style={{
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(8px)',
      }}
      onMouseDown={(e) => {
        mouseDownOnBackdropRef.current = e.target === e.currentTarget
      }}
      onMouseUp={(e) => {
        if (
          mouseDownOnBackdropRef.current &&
          e.target === e.currentTarget &&
          !loading
        ) {
          onCancel()
        }
        mouseDownOnBackdropRef.current = false
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header — só o X de fechar */}
        <header className="flex items-center justify-end px-5 pt-5 pb-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-30"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </header>

        {/* Body */}
        <div className="px-6 pb-5 pt-2">
          {danger && (
            <div
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: 'rgba(248,113,113,0.10)' }}
            >
              <AlertTriangle
                size={18}
                strokeWidth={2}
                style={{ color: 'var(--led-error)' }}
              />
            </div>
          )}

          <h3
            className="font-display text-[19px] font-semibold leading-snug"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.018em' }}
          >
            {title}
          </h3>

          <p
            className="mt-2 text-[13px] leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {description}
          </p>
        </div>

        {/* Footer */}
        <footer
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-ghost disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              danger
                ? 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'
                : 'btn-primary disabled:cursor-not-allowed disabled:opacity-50'
            }
            style={
              danger
                ? {
                    background: 'rgba(248,113,113,0.12)',
                    color: '#FCA5A5',
                    border: '1px solid rgba(248,113,113,0.35)',
                  }
                : undefined
            }
            onMouseEnter={(e) => {
              if (danger && !loading) {
                e.currentTarget.style.background = 'rgba(248,113,113,0.20)'
                e.currentTarget.style.borderColor = 'rgba(248,113,113,0.55)'
              }
            }}
            onMouseLeave={(e) => {
              if (danger) {
                e.currentTarget.style.background = 'rgba(248,113,113,0.12)'
                e.currentTarget.style.borderColor = 'rgba(248,113,113,0.35)'
              }
            }}
          >
            {loading && (
              <Loader2 size={13} strokeWidth={2.2} className="animate-spin" />
            )}
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
