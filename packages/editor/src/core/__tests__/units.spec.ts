import { describe, expect, it } from 'vitest'
import { mmToPx, pxToMm, roundMm } from '../units'

describe('units', () => {
  it('converts A4 dimensions mm -> px at 96dpi', () => {
    expect(mmToPx(210)).toBeCloseTo(793.7008, 3)
    expect(mmToPx(297)).toBeCloseTo(1122.5197, 3)
  })

  it('applies zoom factor', () => {
    expect(mmToPx(100, 2)).toBeCloseTo(mmToPx(100) * 2, 6)
    expect(mmToPx(100, 0.5)).toBeCloseTo(mmToPx(100) / 2, 6)
  })

  it('pxToMm is the inverse of mmToPx at any zoom', () => {
    for (const zoom of [0.1, 0.5, 1, 2, 4]) {
      expect(pxToMm(mmToPx(123.4, zoom), zoom)).toBeCloseTo(123.4, 6)
    }
  })

  it('rounds to 0.1mm', () => {
    expect(roundMm(1.234)).toBe(1.2)
    expect(roundMm(1.25)).toBe(1.3)
    expect(roundMm(-0.04)).toBe(0)
    expect(roundMm(10)).toBe(10)
  })
})
