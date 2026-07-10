import { mmToPx } from './units'

/** Candidate tick steps in mm, coarse to fine. */
const STEPS_MM = [1, 2, 5, 10, 20, 50, 100] as const

export interface RulerScale {
  /** Distance between minor ticks in mm. */
  minorStepMm: number
  /** Labels (and taller ticks) go on multiples of this, in mm. */
  majorStepMm: number
}

/**
 * Pick tick density for the current zoom so minor ticks never crowd below
 * `minTickPx` on screen. Majors are 5x the minor step (or the step itself
 * when already coarse).
 */
export function rulerScaleForZoom(zoom: number, minTickPx = 5): RulerScale {
  for (const step of STEPS_MM) {
    if (mmToPx(step, zoom) >= minTickPx) {
      return { minorStepMm: step, majorStepMm: step >= 50 ? step : step * 5 }
    }
  }
  const last = STEPS_MM[STEPS_MM.length - 1]!
  return { minorStepMm: last, majorStepMm: last }
}
