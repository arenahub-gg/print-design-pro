import { describe, expect, it } from 'vitest'
import { computeSheetLayout, SHEET_GAP_MM, SHEET_MARGIN_MM } from '../sheet-layout'

describe('computeSheetLayout', () => {
  it('tiles 100x150 shipping labels 2-up on landscape A4', () => {
    // portrait usable 200x287 fits 1x1; landscape usable 287x200 fits 2x1
    const layout = computeSheetLayout(100, 150)
    expect(layout.orientation).toBe('landscape')
    expect(layout.columns).toBe(2)
    expect(layout.rowsPerSheet).toBe(1)
    expect(layout.perSheet).toBe(2)
    expect(layout.sheet).toEqual({ widthMm: 297, heightMm: 210 })
  })

  it('tiles small 50x30 product labels in a dense grid', () => {
    const layout = computeSheetLayout(50, 30)
    // portrait: cols floor(202/52)=3, rows floor(289/32)=9 -> 27
    // landscape: cols floor(289/52)=5, rows floor(202/32)=6 -> 30
    expect(layout.perSheet).toBe(30)
    expect(layout.orientation).toBe('landscape')
    expect(layout.positions).toHaveLength(30)
  })

  it('positions cells with margin + gap spacing, row-major', () => {
    const layout = computeSheetLayout(100, 150)
    expect(layout.positions[0]).toEqual({ xMm: SHEET_MARGIN_MM, yMm: SHEET_MARGIN_MM })
    expect(layout.positions[1]).toEqual({
      xMm: SHEET_MARGIN_MM + 100 + SHEET_GAP_MM,
      yMm: SHEET_MARGIN_MM,
    })
  })

  it('returns perSheet 0 when the label exceeds the sheet in every orientation', () => {
    expect(computeSheetLayout(300, 300).perSheet).toBe(0)
    expect(computeSheetLayout(300, 300).positions).toEqual([])
  })

  it('keeps every cell inside the usable area', () => {
    const layout = computeSheetLayout(50, 30)
    for (const position of layout.positions) {
      expect(position.xMm + 50).toBeLessThanOrEqual(layout.sheet.widthMm - SHEET_MARGIN_MM + 1e-9)
      expect(position.yMm + 30).toBeLessThanOrEqual(layout.sheet.heightMm - SHEET_MARGIN_MM + 1e-9)
    }
  })
})
