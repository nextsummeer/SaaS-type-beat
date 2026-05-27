'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, Loader2, Check, AlertCircle, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import { KEYS, SCALES, type Key, type Scale } from '@/lib/essentia/types'
import type { BpmConfidence } from '@/lib/essentia/analyzer'
import { MonoSelect } from './MonoSelect'

type Props = {
  audioFile: File | null
  bpm: string
  setBpm: (v: string) => void
  musicKey: Key | ''
  setMusicKey: (v: Key | '') => void
  scale: Scale | ''
  setScale: (v: Scale | '') => void
  disabled?: boolean
}

type AnalyzeState = 'idle' | 'loading' | 'done' | 'error'

/**
 * Bloco de BPM + KEY + SCALE com botao "Auto-detect" que roda essentia.js
 * client-side. Producer pode editar manual a qualquer momento.
 *
 * Visual: 3 campos lado a lado + eyebrow "ANALISE TECNICA" + botao no canto
 * direito que muda label segundo o estado (idle/loading/done).
 */
export function AudioAnalyzeBox({
  audioFile,
  bpm,
  setBpm,
  musicKey,
  setMusicKey,
  scale,
  setScale,
  disabled = false,
}: Props) {
  const [state, setState] = useState<AnalyzeState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [bpmConfidence, setBpmConfidence] = useState<BpmConfidence | null>(null)

  // Quando o producer troca o arquivo, a analise anterior fica invalida --
  // volta pro estado idle e some o badge "Detectado". Os campos BPM/KEY/
  // SCALE ficam preservados (caso o producer prefira reusar manualmente).
  useEffect(() => {
    setState('idle')
    setError(null)
    setBpmConfidence(null)
  }, [audioFile])

  async function handleAnalyze() {
    if (!audioFile || disabled) return
    setState('loading')
    setError(null)
    setBpmConfidence(null)
    try {
      const { analyzeAudio } = await import('@/lib/essentia/analyzer')
      const result = await analyzeAudio(audioFile)
      if (result.bpm > 0) setBpm(String(result.bpm))
      setMusicKey(result.key)
      setScale(result.scale)
      setBpmConfidence(result.bpmConfidence)
      setState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro na analise')
      setState('error')
    }
  }

  const canAnalyze = !!audioFile && !disabled && state !== 'loading'

  return (
    <div
      className="rounded-xl"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        padding: 14,
      }}
    >
      {/* Header eyebrow + botao auto-detect */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className="font-mono uppercase"
          style={{
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--text-subtle)',
          }}
        >
          / Analise tecnica
        </span>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="inline-flex items-center gap-1.5 rounded-md font-mono uppercase transition-all disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            fontSize: 10,
            letterSpacing: '0.2em',
            padding: '6px 12px',
            color:
              state === 'done'
                ? 'var(--led-success)'
                : state === 'error'
                  ? '#FCD34D'
                  : 'var(--text-primary)',
            background:
              state === 'done'
                ? 'rgba(52,211,153,0.08)'
                : state === 'error'
                  ? 'rgba(245,158,11,0.08)'
                  : 'var(--bg-elevated)',
            border: `1px solid ${
              state === 'done'
                ? 'rgba(52,211,153,0.30)'
                : state === 'error'
                  ? 'rgba(245,158,11,0.30)'
                  : 'var(--border-medium)'
            }`,
          }}
        >
          {state === 'loading' ? (
            <>
              <Loader2 size={11} className="animate-spin" />
              Analisando…
            </>
          ) : state === 'done' ? (
            <>
              <Check size={11} strokeWidth={3} />
              Detectado
            </>
          ) : state === 'error' ? (
            <>
              <AlertCircle size={11} strokeWidth={2.4} />
              Tentar de novo
            </>
          ) : (
            <>
              <Sparkles size={11} strokeWidth={2} />
              Auto-detect
            </>
          )}
        </button>
      </div>

      {/* 3 campos: BPM | KEY | SCALE */}
      <div className="grid grid-cols-3 gap-2">
        <FieldBlock label="BPM" required>
          <BpmInput value={bpm} onChange={setBpm} disabled={disabled} />
        </FieldBlock>

        <FieldBlock label="Key" required>
          <MonoSelect<Key>
            value={musicKey}
            onChange={setMusicKey}
            options={KEYS}
            disabled={disabled}
            ariaLabel="Tonalidade musical"
          />
        </FieldBlock>

        <FieldBlock label="Scale" required>
          <MonoSelect<Scale>
            value={scale}
            onChange={setScale}
            options={SCALES}
            disabled={disabled}
            ariaLabel="Modo musical"
          />
        </FieldBlock>
      </div>

      {/* hint + erro */}
      {!audioFile && (
        <p
          className="mt-2.5 font-mono uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: '0.2em',
            color: 'var(--text-subtle)',
          }}
        >
          Sobe o audio primeiro pra usar Auto-detect
        </p>
      )}
      {state === 'error' && error && (
        <p
          className="mt-2 text-[11px]"
          style={{ color: '#FCD34D' }}
        >
          {error}
        </p>
      )}
      {state === 'done' && bpmConfidence === 'low' && (
        <div
          className="mt-2.5 flex items-start gap-2 rounded-md px-2.5 py-2"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
          }}
        >
          <AlertTriangle
            size={11}
            strokeWidth={2.2}
            style={{ color: '#FCD34D', marginTop: 2 }}
          />
          <div className="flex flex-col gap-0.5">
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 9.5,
                letterSpacing: '0.2em',
                color: '#FCD34D',
                fontWeight: 600,
              }}
            >
              Deteccao incerta
            </span>
            <span
              className="text-[11px]"
              style={{ color: '#FCD34D', opacity: 0.85 }}
            >
              Confirme o BPM manualmente se souber o valor exato.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function FieldBlock({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="font-mono uppercase"
        style={{
          fontSize: 9.5,
          letterSpacing: '0.22em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--led-error)', marginLeft: 4 }}>*</span>
        )}
      </label>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// BpmInput — input numero com spinners custom (esconde os nativos do
// browser que vinham com cara de "Windows 98"). Long-press acelera a
// taxa de incremento depois de 400ms.
// ─────────────────────────────────────────────────────────────────────

const BPM_MIN = 40
const BPM_MAX = 300

function BpmInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const current = Number(value)
  const hasValue = Number.isFinite(current) && value !== ''
  const canIncrement = !hasValue || current < BPM_MAX
  const canDecrement = !hasValue || current > BPM_MIN

  // Refs pra long-press: timeout do delay inicial (400ms) + interval
  // do auto-repeat (80ms enquanto segura).
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function adjust(delta: number) {
    const next = hasValue ? current + delta : 140
    if (next < BPM_MIN || next > BPM_MAX) return
    onChange(String(next))
  }

  function stopRepeat() {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current)
      repeatIntervalRef.current = null
    }
  }

  function startPress(delta: number) {
    if (disabled) return
    adjust(delta)
    holdTimeoutRef.current = setTimeout(() => {
      repeatIntervalRef.current = setInterval(() => adjust(delta), 80)
    }, 400)
  }

  // Cleanup ao desmontar (evita interval orfão se desmontar enquanto segurando)
  useEffect(() => () => stopRepeat(), [])

  return (
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={BPM_MIN}
        max={BPM_MAX}
        placeholder="140"
        className="bpm-input field-input"
        style={{
          fontSize: 16,
          fontWeight: 500,
          textAlign: 'center',
          padding: '10px 26px 10px 8px',
          fontVariantNumeric: 'tabular-nums',
          minHeight: 42,
        }}
      />
      <style>{`
        .bpm-input::-webkit-outer-spin-button,
        .bpm-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .bpm-input { -moz-appearance: textfield; appearance: textfield; }
      `}</style>

      <div
        className="pointer-events-none absolute inset-y-0 right-1.5 flex flex-col items-stretch justify-center"
        style={{ width: 18 }}
      >
        <BpmSpinnerButton
          direction="up"
          onPress={() => startPress(1)}
          onRelease={stopRepeat}
          disabled={disabled || !canIncrement}
        />
        <BpmSpinnerButton
          direction="down"
          onPress={() => startPress(-1)}
          onRelease={stopRepeat}
          disabled={disabled || !canDecrement}
        />
      </div>
    </div>
  )
}

function BpmSpinnerButton({
  direction,
  onPress,
  onRelease,
  disabled,
}: {
  direction: 'up' | 'down'
  onPress: () => void
  onRelease: () => void
  disabled: boolean
}) {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown
  return (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      onTouchStart={(e) => {
        e.preventDefault()
        onPress()
      }}
      onTouchEnd={onRelease}
      onTouchCancel={onRelease}
      disabled={disabled}
      aria-label={direction === 'up' ? 'Aumentar BPM' : 'Diminuir BPM'}
      className="pointer-events-auto flex flex-1 items-center justify-center rounded-[3px] transition-colors disabled:cursor-not-allowed disabled:opacity-30"
      style={{
        color: 'var(--text-subtle)',
        background: 'transparent',
        minHeight: 14,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.color = 'var(--accent)'
          e.currentTarget.style.background = 'rgba(124,58,237,0.10)'
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.color = 'var(--text-subtle)'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <Icon size={11} strokeWidth={2.4} />
    </button>
  )
}
