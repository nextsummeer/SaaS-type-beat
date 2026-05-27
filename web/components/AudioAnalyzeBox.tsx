'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Loader2, Check, AlertCircle, AlertTriangle } from 'lucide-react'
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
