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

export interface AudioAnalysisResult {
  bpm: number
  key: Key
  scale: Scale
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
  // precisam dele). Truncamos pra 60s pra acelerar -- KeyExtractor converge
  // rapido e nao precisa do beat inteiro.
  const sampleRate = audioBuffer.sampleRate
  const maxSamples = Math.min(audioBuffer.length, sampleRate * 60)
  const signal = audioBuffer.getChannelData(0).slice(0, maxSamples)

  const { essentia } = await getEssentia()
  const vector = essentia.arrayToVector(signal)

  let bpm = 0
  let key: Key = 'C'
  let scale: Scale = 'Major'

  try {
    const rhythm = essentia.RhythmExtractor2013(vector)
    if (rhythm && typeof rhythm.bpm === 'number' && rhythm.bpm > 0) {
      bpm = Math.round(rhythm.bpm)
    }
  } catch (e) {
    console.warn('[essentia] RhythmExtractor2013 falhou:', e)
  }

  try {
    const keyResult = essentia.KeyExtractor(vector)
    if (keyResult?.key) key = normalizeKey(keyResult.key)
    if (keyResult?.scale) scale = normalizeScale(keyResult.scale)
  } catch (e) {
    console.warn('[essentia] KeyExtractor falhou:', e)
  }

  return { bpm, key, scale }
}
