/**
 * Wrapper async pra essentia.js (WebAssembly) — analisa BPM + KEY + SCALE
 * client-side no browser do producer.
 *
 * Descoberto via DevTools no concorrente typebeat.fun (essentia-wasm.web.js):
 * biblioteca C++ do Music Technology Group de Barcelona portada pra WASM,
 * mesma usada internamente em features do Spotify.
 *
 * Estrategia de carga: CDN dinamica via <script> tag. O pacote npm tem
 * `require('fs')` embutido no glue code Emscripten que quebra o bundler
 * client do Next.js. Carregando via CDN o bundler nao toca nem analisa
 * o codigo, e o browser cacheia entre sites.
 *
 * Licenca AGPL-3.0 (DSP classico). NAO usar modelos ML pre-treinados
 * (esses tem CC BY-NC-ND 4.0 e exigem licenca comercial).
 */

import type { Key, Scale } from './types'

const ESSENTIA_VERSION = '0.1.3'
const CDN_WASM = `https://cdn.jsdelivr.net/npm/essentia.js@${ESSENTIA_VERSION}/dist/essentia-wasm.web.js`
const CDN_CORE = `https://cdn.jsdelivr.net/npm/essentia.js@${ESSENTIA_VERSION}/dist/essentia.js-core.js`

let essentiaPromise: Promise<unknown> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    )
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve()
      else {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener(
          'error',
          () => reject(new Error(`Falha carregando ${src}`)),
          { once: true },
        )
      }
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`Falha carregando ${src}`))
    document.head.appendChild(script)
  })
}

async function getEssentia(): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  essentia: any
}> {
  if (!essentiaPromise) {
    essentiaPromise = (async () => {
      // Carrega WASM primeiro (cria globals EssentiaWASM e EssentiaModule),
      // depois core (cria global Essentia).
      await loadScript(CDN_WASM)
      await loadScript(CDN_CORE)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any
      if (!win.EssentiaWASM || !win.Essentia) {
        throw new Error('essentia.js nao expos globals esperados')
      }
      // O EssentiaWASM exportado eh uma funcao factory que precisa ser
      // chamada pra retornar a instancia inicializada do WASM.
      const wasmInstance =
        typeof win.EssentiaWASM === 'function'
          ? await win.EssentiaWASM()
          : win.EssentiaWASM
      const essentia = new win.Essentia(wasmInstance)
      return { essentia }
    })()
  }
  return essentiaPromise as Promise<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    essentia: any
  }>
}

export type BpmConfidence = 'high' | 'medium' | 'low'

export interface AudioAnalysisResult {
  bpm: number
  key: Key
  scale: Scale
  /**
   * Confianca da deteccao de BPM:
   * - high: 2 algoritmos concordam dentro de 2 BPM
   * - medium: divergencia 3-5 BPM, usa RhythmExtractor2013
   * - low: divergencia > 5 BPM OU confidence interna baixa
   */
  bpmConfidence: BpmConfidence
}

const KEY_MAP: Record<string, Key> = {
  C: 'C',
  'C#': 'C#',
  Db: 'C#',
  D: 'D',
  'D#': 'D#',
  Eb: 'D#',
  E: 'E',
  F: 'F',
  'F#': 'F#',
  Gb: 'F#',
  G: 'G',
  'G#': 'G#',
  Ab: 'G#',
  A: 'A',
  'A#': 'A#',
  Bb: 'A#',
  B: 'B',
}

function normalizeKey(raw: string): Key {
  const trimmed = (raw || '').trim()
  return KEY_MAP[trimmed] ?? 'C'
}

function normalizeScale(raw: string): Scale {
  const lower = (raw || '').toLowerCase()
  return lower === 'minor' ? 'Minor' : 'Major'
}

/**
 * Decodifica o File pra Float32Array mono e roda RhythmExtractor2013 +
 * KeyExtractor. Tempo tipico: 2-4s pra MP3 de 3min apos o WASM carregar.
 *
 * Lanca erro se decode falhar ou WASM nao carregar (ex: browser muito
 * antigo sem WebAssembly).
 */
export async function analyzeAudio(file: File): Promise<AudioAnalysisResult> {
  if (typeof window === 'undefined') {
    throw new Error('analyzeAudio so funciona no browser')
  }
  if (typeof AudioContext === 'undefined') {
    throw new Error('Browser nao suporta Web Audio API')
  }

  const arrayBuffer = await file.arrayBuffer()
  const ctx = new AudioContext()
  let audioBuffer: AudioBuffer
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    try {
      await ctx.close()
    } catch {
      // sem-op
    }
  }

  // Mono: usa canal 0 (se stereo, perdemos info do segundo mas BPM/KEY nao
  // precisam dele).
  // BPM: pula primeiros 10s (intro/build-up sem hi-hat completo confunde
  // o algoritmo) e analisa do 10s ao 70s -- 60s eh suficiente.
  // KEY: usa do inicio ao 60s -- harmonia geralmente ja se estabelece.
  const sampleRate = audioBuffer.sampleRate
  const totalSamples = audioBuffer.length
  const channel0 = audioBuffer.getChannelData(0)

  // BPM window: 10s ate 70s (ou ate o fim do audio se for menor)
  const bpmStart = Math.min(totalSamples, sampleRate * 10)
  const bpmEnd = Math.min(totalSamples, sampleRate * 70)
  const bpmSignal = channel0.slice(bpmStart, bpmEnd)

  // KEY window: 0 ate 60s
  const keyEnd = Math.min(totalSamples, sampleRate * 60)
  const keySignal = channel0.slice(0, keyEnd)

  const { essentia } = await getEssentia()
  const bpmVector = essentia.arrayToVector(bpmSignal)
  const keyVector = essentia.arrayToVector(keySignal)

  let bpm = 0
  let bpmConfidence: BpmConfidence = 'low'
  let key: Key = 'C'
  let scale: Scale = 'Major'

  try {
    // Cruza 2 algoritmos pra detectar divergencias. RhythmExtractor2013
    // eh mais geral, PercivalBpmEstimator eh especifico pra tempo loops.
    const r2013 = essentia.RhythmExtractor2013(bpmVector)
    const percival = essentia.PercivalBpmEstimator(bpmVector)

    const r2013Bpm = Math.round(r2013?.bpm ?? 0)
    const r2013Conf = typeof r2013?.confidence === 'number' ? r2013.confidence : 0
    const percivalBpm = Math.round(percival?.bpm ?? 0)

    console.log('[essentia] BPM detection:', {
      RhythmExtractor2013: { bpm: r2013Bpm, confidence: r2013Conf.toFixed(2) },
      PercivalBpmEstimator: { bpm: percivalBpm },
    })

    const diff = Math.abs(r2013Bpm - percivalBpm)

    if (r2013Bpm > 0 && percivalBpm > 0) {
      if (diff <= 2 && r2013Conf >= 1.5) {
        // Alta concordancia + alta confidence interna -- usa media
        bpm = Math.round((r2013Bpm + percivalBpm) / 2)
        bpmConfidence = 'high'
      } else if (diff <= 5) {
        // Divergencia moderada -- prefere RhythmExtractor2013
        bpm = r2013Bpm
        bpmConfidence = 'medium'
      } else {
        // Divergem muito -- usa RhythmExtractor mas marca baixa confianca
        bpm = r2013Bpm
        bpmConfidence = 'low'
      }
    } else if (r2013Bpm > 0) {
      bpm = r2013Bpm
      bpmConfidence = r2013Conf >= 1.5 ? 'medium' : 'low'
    } else if (percivalBpm > 0) {
      bpm = percivalBpm
      bpmConfidence = 'low'
    }
  } catch (e) {
    console.warn('[essentia] BPM detection falhou:', e)
  }

  try {
    const keyResult = essentia.KeyExtractor(keyVector)
    if (keyResult?.key) key = normalizeKey(keyResult.key)
    if (keyResult?.scale) scale = normalizeScale(keyResult.scale)
    console.log('[essentia] Key detection:', { key, scale })
  } catch (e) {
    console.warn('[essentia] KeyExtractor falhou:', e)
  }

  return { bpm, key, scale, bpmConfidence }
}
