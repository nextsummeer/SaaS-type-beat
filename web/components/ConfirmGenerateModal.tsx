'use client'

import { useEffect, useRef } from 'react'
import { Loader2, Sparkles, X, AlertCircle, Gift } from 'lucide-react'

type Props = {
  open: boolean
  lote: 1 | 3
  remaining: number
  isOnboardingFree: boolean
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Modal pequeno de confirmação antes de disparar geração.
 * Mostra custo em créditos, restantes apos consumo, e CTA de confirmar.
 * Se isOnboardingFree=true, primeira capa do user e gratis — modal mostra
 * banner "Sua primeira capa e por nossa conta".
 */
export function ConfirmGenerateModal({
  open,
  lote,
  remaining,
  isOnboardingFree,
  loading,
  onCancel,
  onConfirm,
}: Props) {
  const mouseDownOnBackdropRef = useRef(false)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
      if (e.key === 'Enter' && !loading) onConfirm()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, loading, onCancel, onConfirm])

  if (!open) return null

  // Calcula creditos a consumir considerando onboarding free.
  // Onboarding free: primeira capa nao consome. Lote 3 com onboarding = consome 2.
  const creditsToConsume = isOnboardingFree ? Math.max(0, lote - 1) : lote
  const remainingAfter = Math.max(0, remaining - creditsToConsume)
  const insufficient = remaining < creditsToConsume

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
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
        aria-label="Confirmar geração de capa"
        className="relative w-full max-w-md overflow-hidden rounded-2xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              color: 'var(--text-subtle)',
            }}
          >
            Confirmar geração
          </span>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Cancelar"
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
        <div className="px-6 py-7 space-y-6">
          {/* Pergunta principal */}
          <div>
            <h3
              className="font-display text-[20px] font-semibold leading-snug"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.018em' }}
            >
              {lote === 1 ? 'Gerar 1 capa?' : 'Gerar 3 capas?'}
            </h3>
            <p
              className="mt-2 text-[13px] leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              {lote === 1
                ? 'Vamos criar uma capa baseada no seu estilo padrão.'
                : 'Vamos criar 3 capas variadas baseadas no seu estilo padrão. Cada uma é única.'}
            </p>
          </div>

          {/* Banner onboarding free */}
          {isOnboardingFree && (
            <div
              className="flex items-start gap-3 rounded-lg px-4 py-3"
              style={{
                background: 'rgba(199,181,255,0.08)',
                border: '1px solid var(--border-purple)',
              }}
            >
              <Gift
                size={16}
                strokeWidth={1.8}
                style={{ color: 'var(--purple-soft)', marginTop: 1 }}
              />
              <div>
                <p
                  className="font-medium text-[13px]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Sua primeira capa é por nossa conta
                </p>
                <p
                  className="mt-0.5 text-[12px] leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {lote === 1
                    ? 'Esta geração não consome créditos do seu plano.'
                    : 'A primeira das 3 é grátis. As outras 2 consomem 2 créditos.'}
                </p>
              </div>
            </div>
          )}

          {/* Custo + saldo */}
          <div
            className="rounded-lg px-4 py-3.5"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: 'var(--text-muted)',
                }}
              >
                Consumo
              </span>
              <span
                className="num-hero"
                style={{
                  fontSize: 18,
                  color: creditsToConsume === 0 ? 'var(--led-success)' : 'var(--text-primary)',
                  lineHeight: 1,
                }}
              >
                {creditsToConsume === 0 ? 'grátis' : `${creditsToConsume} ${creditsToConsume === 1 ? 'crédito' : 'créditos'}`}
              </span>
            </div>

            <div className="my-2 hairline" />

            <div className="flex items-center justify-between gap-3">
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: 'var(--text-muted)',
                }}
              >
                Restantes após
              </span>
              <span
                className="font-mono tabular"
                style={{
                  fontSize: 13,
                  color: insufficient ? 'var(--led-error)' : 'var(--text-primary)',
                }}
              >
                {remainingAfter} {remainingAfter === 1 ? 'crédito' : 'créditos'}
              </span>
            </div>
          </div>

          {/* Aviso insuficiente */}
          {insufficient && (
            <div
              className="flex items-center gap-2 text-[12px]"
              style={{ color: 'var(--led-error)' }}
            >
              <AlertCircle size={12} strokeWidth={2} />
              <span>
                Créditos insuficientes — você tem {remaining} e precisa de {creditsToConsume}
              </span>
            </div>
          )}
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
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || insufficient}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={13} strokeWidth={2.2} className="animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Sparkles size={13} strokeWidth={2.2} />
                Confirmar
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
