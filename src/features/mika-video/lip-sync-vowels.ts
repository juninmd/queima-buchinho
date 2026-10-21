// Cópia de juninmd/mika (apps/desktop/src/renderer/src) — mantenha em sincronia com a origem.
const F1_LOW_HZ = 250
const F1_HIGH_HZ = 1000

const F2_LOW_HZ = 900
const F2_HIGH_HZ = 3000

const SILENCE_DBFS = -55
const LOUD_DBFS = -12

const VOWEL_MIN_LOUDNESS = 0.12

export interface VowelWeights {
  a: number
  i: number
  u: number
  e: number
  o: number
}

export const SILENT_VOWELS: VowelWeights = { a: 0, i: 0, u: 0, e: 0, o: 0 }

const VOWEL_FORMANTS: Record<keyof VowelWeights, readonly [f1: number, f2: number]> = {
  a: [750, 1300],

  i: [300, 2400],

  u: [350, 800],
  e: [500, 1900],
  o: [500, 950],
}

export function rmsLoudness(timeDomain: Float32Array): number {
  if (timeDomain.length === 0) return 0
  let sum = 0
  for (let i = 0; i < timeDomain.length; i++) {
    const sample = timeDomain[i] ?? 0
    sum += sample * sample
  }
  return Math.sqrt(sum / timeDomain.length)
}

export function loudnessToOpenness(rms: number): number {
  if (rms <= 0) return 0
  const dbfs = 20 * Math.log10(rms)
  if (dbfs <= SILENCE_DBFS) return 0
  if (dbfs >= LOUD_DBFS) return 1
  return (dbfs - SILENCE_DBFS) / (LOUD_DBFS - SILENCE_DBFS)
}

function peakHzInRange(freqData: Uint8Array, binSize: number, lowHz: number, highHz: number): number {
  const lowBin = Math.max(1, Math.floor(lowHz / binSize))
  const highBin = Math.min(Math.floor(highHz / binSize), freqData.length - 1)
  if (highBin < lowBin) return 0

  let peakBin = lowBin
  let peakValue = -1
  for (let bin = lowBin; bin <= highBin; bin++) {
    const value = freqData[bin] ?? 0
    if (value > peakValue) {
      peakValue = value
      peakBin = bin
    }
  }

  return peakValue < 8 ? 0 : peakBin * binSize
}

export interface Formants {
  f1: number
  f2: number
}

export function estimateFormants(freqData: Uint8Array, sampleRate: number, fftSize: number): Formants {
  const binSize = sampleRate / fftSize
  if (!Number.isFinite(binSize) || binSize <= 0) return { f1: 0, f2: 0 }
  return {
    f1: peakHzInRange(freqData, binSize, F1_LOW_HZ, F1_HIGH_HZ),
    f2: peakHzInRange(freqData, binSize, F2_LOW_HZ, F2_HIGH_HZ),
  }
}

const toMel = (hz: number) => 2595 * Math.log10(1 + hz / 700)

/** Centros das vogais já em mel: `vowelWeights` roda a cada frame enquanto a Mika fala. */
const VOWEL_CENTERS_MEL = (
  Object.entries(VOWEL_FORMANTS) as Array<[keyof VowelWeights, readonly [number, number]]>
).map(([vowel, [f1, f2]]) => [vowel, toMel(f1), toMel(f2)] as const)

export function vowelWeights(formants: Formants, loudness: number): VowelWeights {
  if (loudness < VOWEL_MIN_LOUDNESS || formants.f1 <= 0 || formants.f2 <= 0) return { ...SILENT_VOWELS }

  const f1Mel = toMel(formants.f1)
  const f2Mel = toMel(formants.f2)

  const scores: Array<[keyof VowelWeights, number]> = []
  let total = 0
  for (const [vowel, centerF1Mel, centerF2Mel] of VOWEL_CENTERS_MEL) {
    const d1 = f1Mel - centerF1Mel
    const d2 = f2Mel - centerF2Mel
    const distance = Math.sqrt(d1 * d1 + d2 * d2)

    const score = 1 / (1 + (distance / 100) ** 2)
    scores.push([vowel, score])
    total += score
  }

  const weights: VowelWeights = { ...SILENT_VOWELS }
  if (total <= 0) return weights
  for (const [vowel, score] of scores) weights[vowel] = score / total
  return weights
}

export function dominantVowel(weights: VowelWeights): { vowel: keyof VowelWeights; weight: number } {
  let best: keyof VowelWeights = 'a'
  let bestWeight = -1
  for (const [vowel, weight] of Object.entries(weights) as Array<[keyof VowelWeights, number]>) {
    if (weight > bestWeight) {
      bestWeight = weight
      best = vowel
    }
  }
  return { vowel: best, weight: bestWeight }
}
