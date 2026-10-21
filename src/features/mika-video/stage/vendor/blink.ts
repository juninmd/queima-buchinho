// Cópia de juninmd/mika (apps/desktop/src/renderer/src) — mantenha em sincronia com a origem.
/** Piscada do VRM: pausa quando a expressão já fecha o olho e às vezes pisca duas vezes. */

export const BLINK_SEC = 0.15
/** A pálpebra desce em ~1/3 da piscada e sobe no resto, como a de verdade. */
const CLOSE_SHARE = 0.35
/** Acima disso, happy/relaxed já fecham o olho; somar a piscada empurra a pálpebra através da bochecha. */
export const EYES_BUSY_THRESHOLD = 0.5
const DOUBLE_BLINK_CHANCE = 0.18
const DOUBLE_BLINK_GAP = 0.09

export class BlinkDriver {
  private timer = 0
  private nextIn: number
  private doublePending = false

  constructor(private readonly random: () => number = Math.random) {
    this.nextIn = this.interval()
  }

  /** Peso de `blink` (0..1). `eyesBusy` é o quanto a expressão atual já fecha os olhos. */
  advance(dt: number, eyesBusy: number): number {
    if (eyesBusy >= EYES_BUSY_THRESHOLD) {
      this.timer = 0
      return 0
    }
    this.timer += dt
    const progress = (this.timer - this.nextIn) / BLINK_SEC
    if (progress < 0) return 0
    if (progress >= 1) {
      this.scheduleNext()
      return 0
    }
    return blinkCurve(progress)
  }

  private scheduleNext(): void {
    this.timer = 0
    this.doublePending = !this.doublePending && this.random() < DOUBLE_BLINK_CHANCE
    this.nextIn = this.doublePending ? DOUBLE_BLINK_GAP : this.interval()
  }

  private interval(): number {
    return 2.8 + this.random() * 3.4
  }
}

const smoothstep = (t: number) => t * t * (3 - 2 * t)

/** Fecha rápido (ease-in), abre devagar (ease-out). */
export function blinkCurve(progress: number): number {
  if (progress < CLOSE_SHARE) return smoothstep(progress / CLOSE_SHARE)
  return 1 - smoothstep((progress - CLOSE_SHARE) / (1 - CLOSE_SHARE))
}
