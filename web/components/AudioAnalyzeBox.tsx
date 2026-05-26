'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react'
import { KEYS, SCALES, type Key, type Scale } from '@/lib/essentia/types'

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

  async function handleAnalyze() {
    if (!audioFile || disabled) return
    setState('loading')
    setError(null)
    try {
      const { analyzeAudio } = await import('@/lib/essentia/analyzer')
      const result = await analyzeAudio(audioFile)
      if (result.bpm > 0) setBpm(String(result.bpm))
      setMusicKey(result.key)
      setScale(result.scale)
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
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            disabled={disabled}
            min={40}
            max={300}
            placeholder="140"
            className="field-input"
            style={{
              fontSize: 16,
              fontWeight: 500,
              textAlign: 'center',
              padding: '10px 8px',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
        </FieldBlock>

        <FieldBlock label="Key" required>
          <select
            value={musicKey}
            onChange={(e) => setMusicKey(e.target.value as Key | '')}
            disabled={disabled}
            className="field-input"
            style={{
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'center',
              padding: '10px 8px',
              appearance: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">—</option>
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </FieldBlock>

        <FieldBlock label="Scale" required>
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value as Scale | '')}
            disabled={disabled}
            className="field-input"
            style={{
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'center',
              padding: '10px 8px',
              appearance: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">—</option>
            {SCALES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
      {state === 'done' && (
        <p
          className="mt-2 font-mono uppercase"
          style={{
            fontSize: 9.5,
            letterSpacing: '0.2em',
            color: 'var(--text-subtle)',
          }}
        >
          Pode ajustar manualmente se discordar
        </p>
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
