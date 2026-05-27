'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

type Props = {
  /** URL do audio (object URL local ou signed URL remoto) */
  src: string
  /** Nome do arquivo exibido em mono no canto -- opcional */
  fileName?: string
  /** Quantas barras a waveform falsa tem (mais barras = mais resolucao visual) */
  bars?: number
  /** Remove o container (border + bg) -- pra usar embarcado em outra superficie */
  flat?: boolean
}

// Gera waveform pseudo-aleatoria deterministica a partir de um seed.
// Mesma string sempre gera a mesma onda -- evita "tremor" entre renders.
// Usa envelope senoidal pra parecer um audio real (centro mais alto que pontas).
function generateWaveform(seed: string, bars: number): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  const heights: number[] = []
  for (let i = 0; i < bars; i += 1) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0
    const v = ((h >>> 8) & 0xffff) / 0xffff
    const env = Math.sin((i / (bars - 1)) * Math.PI)
    const raw = 0.18 + v * 0.55 * env + 0.27 * env
    heights.push(Math.max(0.08, Math.min(1, raw)))
  }
  return heights
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${ss}`
}

// ─────────────────────────────────────────────────────────────────────
// Multi-color gradient ao longo da waveform.
// Stops: azul -> roxo -> rosa (centro quente) -> roxo -> azul (simetrico)
// Cada barra pega a cor interpolada da sua posicao (0 a 1).
// ─────────────────────────────────────────────────────────────────────

const COLOR_STOPS: Array<{ pos: number; rgb: [number, number, number] }> = [
  { pos: 0.0, rgb: [99, 102, 241] }, // indigo-500
  { pos: 0.22, rgb: [124, 58, 237] }, // roxo-violet
  { pos: 0.5, rgb: [236, 72, 153] }, // pink-500 (centro quente)
  { pos: 0.78, rgb: [124, 58, 237] }, // roxo-violet
  { pos: 1.0, rgb: [99, 102, 241] }, // indigo-500
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function getBarColor(ratio: number): { r: number; g: number; b: number } {
  for (let i = 0; i < COLOR_STOPS.length - 1; i += 1) {
    const a = COLOR_STOPS[i]
    const b = COLOR_STOPS[i + 1]
    if (ratio >= a.pos && ratio <= b.pos) {
      const t = (ratio - a.pos) / (b.pos - a.pos)
      return {
        r: Math.round(lerp(a.rgb[0], b.rgb[0], t)),
        g: Math.round(lerp(a.rgb[1], b.rgb[1], t)),
        b: Math.round(lerp(a.rgb[2], b.rgb[2], t)),
      }
    }
  }
  const last = COLOR_STOPS[COLOR_STOPS.length - 1].rgb
  return { r: last[0], g: last[1], b: last[2] }
}

/**
 * Player de audio custom com waveform fake estetica.
 * Editorial Mono -- preto, hairlines, mono uppercase em timestamps.
 * Click na waveform faz seek. Click no botao redondo toca/pausa.
 */
export function AudioPlayer({ src, fileName, bars = 56, flat = false }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const wasPlayingRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [hoverRatio, setHoverRatio] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const waveform = useMemo(
    () => generateWaveform(fileName ?? src ?? 'x', bars),
    [src, fileName, bars],
  )

  // Pre-calcula cores de cada barra (azul->roxo->rosa->roxo->azul) -- 1x
  // por mudanca em `bars`. Evita recalcular interpolacao 56x por render.
  const barColors = useMemo(() => {
    return waveform.map((_, i) => {
      const r = bars > 1 ? i / (bars - 1) : 0
      return getBarColor(r)
    })
  }, [waveform, bars])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    function handleTime() {
      setCurrentTime(audio!.currentTime)
    }
    function handleMeta() {
      setDuration(audio!.duration)
    }
    function handleEnd() {
      setPlaying(false)
    }
    audio.addEventListener('timeupdate', handleTime)
    audio.addEventListener('loadedmetadata', handleMeta)
    audio.addEventListener('ended', handleEnd)
    return () => {
      audio.removeEventListener('timeupdate', handleTime)
      audio.removeEventListener('loadedmetadata', handleMeta)
      audio.removeEventListener('ended', handleEnd)
    }
  }, [src])

  // Quando src muda, reseta o estado pra evitar herdar timestamp de outro arquivo
  useEffect(() => {
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
  }, [src])

  async function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  function seekToClientX(clientX: number) {
    const track = trackRef.current
    const audio = audioRef.current
    if (!track || !audio || !duration) return
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
    setCurrentTime(ratio * duration)
  }

  // Pointer events unificados (mouse + touch). setPointerCapture mantem
  // o drag funcionando mesmo se o cursor sair do track. Pausa o audio
  // durante o drag pra scrub limpo, retoma se estava tocando antes.
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    const track = trackRef.current
    if (!track) return
    track.setPointerCapture(e.pointerId)
    setIsDragging(true)
    if (playing && audioRef.current) {
      audioRef.current.pause()
      wasPlayingRef.current = true
      setPlaying(false)
    } else {
      wasPlayingRef.current = false
    }
    seekToClientX(e.clientX)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    setHoverRatio(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)))
    if (isDragging) seekToClientX(e.clientX)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return
    const track = trackRef.current
    if (track && track.hasPointerCapture(e.pointerId)) {
      track.releasePointerCapture(e.pointerId)
    }
    setIsDragging(false)
    if (wasPlayingRef.current && audioRef.current) {
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
      wasPlayingRef.current = false
    }
  }

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <div
      className={flat ? '' : 'rounded-xl'}
      style={
        flat
          ? undefined
          : {
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              padding: 12,
            }
      }
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <style>{`
        @keyframes audio-bar-pulse {
          0%, 100% { transform: scaleY(0.92); }
          50%      { transform: scaleY(1.08); }
        }
        @keyframes audio-btn-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(124,58,237,0.55); }
          70%  { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
          100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
        }
        .audio-bar-playing {
          animation: audio-bar-pulse 1.4s ease-in-out infinite;
          animation-delay: var(--bar-delay, 0s);
          transform-origin: center;
        }
        .audio-btn-playing {
          animation: audio-btn-pulse 1.8s ease-out infinite;
        }
      `}</style>

      <div className="flex items-center gap-3.5">
        {/* play/pause */}
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pausar' : 'Tocar'}
          className={`group flex shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
            playing ? 'audio-btn-playing' : ''
          }`}
          style={{
            width: 40,
            height: 40,
            background: playing
              ? 'linear-gradient(135deg, #7c3aed 0%, #d946ef 100%)'
              : 'var(--text-primary)',
            color: playing ? '#FFFFFF' : 'var(--bg-base)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          {playing ? (
            <Pause size={15} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play
              size={15}
              fill="currentColor"
              strokeWidth={0}
              style={{ marginLeft: 2 }}
            />
          )}
        </button>

        {/* waveform + meta */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div
            ref={trackRef}
            role="slider"
            aria-label="Posicao do audio"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={currentTime}
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() => setHoverRatio(null)}
            className="relative flex h-9 items-center gap-[2px] select-none touch-none"
            style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
          >
            {waveform.map((h, i) => {
              const barRatio = i / (waveform.length - 1)
              const played = barRatio <= progress
              const hovered = hoverRatio !== null && barRatio <= hoverRatio
              const animatePlaying = playing && played
              const color = barColors[i]
              const colorStr = `rgb(${color.r}, ${color.g}, ${color.b})`
              const colorGlowStr = `rgba(${color.r}, ${color.g}, ${color.b}, 0.55)`
              const colorDimStr = `rgba(${color.r}, ${color.g}, ${color.b}, ${hovered ? 0.4 : 0.18})`
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-full ${animatePlaying ? 'audio-bar-playing' : ''}`}
                  style={
                    {
                      height: `${h * 100}%`,
                      minHeight: 2,
                      background: played ? colorStr : colorDimStr,
                      boxShadow: played ? `0 0 8px ${colorGlowStr}` : 'none',
                      transition:
                        'background 120ms ease, box-shadow 120ms ease',
                      '--bar-delay': `${(i % 8) * 0.06}s`,
                    } as React.CSSProperties
                  }
                />
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span
              className="font-mono uppercase tabular-nums"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.16em',
                color: 'var(--text-muted)',
              }}
            >
              {formatTime(currentTime)}{' '}
              <span style={{ color: 'var(--text-subtle)' }}>/ {formatTime(duration)}</span>
            </span>
            {fileName && (
              <span
                className="truncate font-mono"
                style={{
                  fontSize: 10.5,
                  color: 'var(--text-subtle)',
                  maxWidth: 220,
                }}
                title={fileName}
              >
                {fileName}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
