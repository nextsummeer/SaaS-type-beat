'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
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

// Catmull-Rom -> Bezier: gera path SVG suave a partir de N pontos.
// tension entre 0 (lineares retos) e 0.5 (curvas pronunciadas). 0.3
// da resultado natural sem oscilacao excessiva.
function smoothPathSegment(
  points: Array<[number, number]>,
  tension = 0.3,
): string {
  if (points.length < 2) return ''
  const cmds: string[] = []
  cmds.push(`${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`)
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension
    cmds.push(
      `C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`,
    )
  }
  return cmds.join(' ')
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

  // Path SVG com curvas Bezier suaves (Catmull-Rom -> Bezier) gerado dos
  // N pontos da waveform, espelhado em torno do eixo central y=50.
  // Resultado: shape lenticular liso, sem facetas angulosas.
  const pathD = useMemo(() => {
    const N = waveform.length
    if (N < 2) return ''
    const topPoints: Array<[number, number]> = []
    const bottomPoints: Array<[number, number]> = []
    for (let i = 0; i < N; i += 1) {
      const x = (i / (N - 1)) * 100
      const halfAmp = waveform[i] * 46
      topPoints.push([x, 50 - halfAmp])
      bottomPoints.push([x, 50 + halfAmp])
    }
    // Top: esquerda -> direita. Bottom: direita -> esquerda (reverse) pra
    // fechar suavemente. Comeca em M (move), Z fecha o path.
    const topPath = smoothPathSegment(topPoints, 0.32)
    const bottomReversed = bottomPoints.slice().reverse()
    const bottomPath = smoothPathSegment(bottomReversed, 0.32)
    // Note: bottomPath comeca com x,y do primeiro ponto reversed; usamos L
    // pra conectar do ultimo top ao primeiro bottom (que ja eh proximo)
    return `M ${topPath} L ${bottomPath} Z`
  }, [waveform])

  // IDs unicos por instancia (useful pra SVG defs nao conflitarem
  // quando dois AudioPlayer aparecem na mesma pagina)
  const reactId = useId().replace(/:/g, '')
  const gradientId = `aw-grad-${reactId}`
  const clipId = `aw-clip-${reactId}`
  const glowId = `aw-glow-${reactId}`

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
        @keyframes audio-btn-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(124,58,237,0.55); }
          70%  { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
          100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
        }
        @keyframes audio-wave-glow-pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes audio-wave-breathe {
          0%, 100% { transform: scaleY(1); }
          50%      { transform: scaleY(1.05); }
        }
        .audio-btn-playing {
          animation: audio-btn-pulse 1.8s ease-out infinite;
        }
        .audio-wave-playing .audio-wave-glow {
          animation: audio-wave-glow-pulse 1.6s ease-in-out infinite;
        }
        .audio-wave-playing svg {
          animation: audio-wave-breathe 2.4s ease-in-out infinite;
          transform-origin: center;
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
            className={`relative h-9 select-none touch-none ${playing ? 'audio-wave-playing' : ''}`}
            style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
              aria-hidden
            >
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="22%" stopColor="#7c3aed" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="78%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                {/* Glow elaborado: aura externa larga + halo medio + sharp
                  * em cima. Cria sensacao de luz vazando ao redor do shape
                  * sem perder nitidez. */}
                <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="bigGlow" />
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="midGlow" />
                  <feMerge>
                    <feMergeNode in="bigGlow" />
                    <feMergeNode in="midGlow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <clipPath id={clipId}>
                  <rect
                    x="0"
                    y="0"
                    width={Math.max(0.001, progress * 100)}
                    height="100"
                  />
                </clipPath>
                <clipPath id={`${clipId}-hover`}>
                  <rect
                    x="0"
                    y="0"
                    width={
                      hoverRatio !== null
                        ? Math.max(0.001, hoverRatio * 100)
                        : 0
                    }
                    height="100"
                  />
                </clipPath>
              </defs>

              {/* Camada dim -- waveform completa em opacity baixa */}
              <path
                d={pathD}
                fill={`url(#${gradientId})`}
                opacity="0.16"
              />

              {/* Camada hover preview (entre dim e tocada) */}
              {hoverRatio !== null && !isDragging && (
                <path
                  d={pathD}
                  fill={`url(#${gradientId})`}
                  opacity="0.38"
                  clipPath={`url(#${clipId}-hover)`}
                />
              )}

              {/* Camada glow magico (tocada) -- filter aplica aura+halo+sharp */}
              <path
                d={pathD}
                fill={`url(#${gradientId})`}
                filter={`url(#${glowId})`}
                clipPath={`url(#${clipId})`}
                className="audio-wave-glow"
              />
            </svg>
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
