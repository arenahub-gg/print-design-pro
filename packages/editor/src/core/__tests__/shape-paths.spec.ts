import { describe, expect, it } from 'vitest'
import { SHAPE_KINDS } from '../schema/elements'
import { dashPattern, lineArrowGeometry, shapePoints } from '../shape-paths'

describe('shapePoints', () => {
  const EXPECTED_COUNTS = {
    triangle: 3,
    diamond: 4,
    star: 10,
    arrow: 7,
    pentagon: 5,
    hexagon: 6,
  } as const

  it('returns the expected vertex count per kind', () => {
    for (const kind of SHAPE_KINDS)
      expect(shapePoints(kind, 30, 20)).toHaveLength(EXPECTED_COUNTS[kind])
  })

  it('keeps every vertex inside the element box', () => {
    for (const kind of SHAPE_KINDS) {
      for (const [x, y] of shapePoints(kind, 30, 20)) {
        expect(x).toBeGreaterThanOrEqual(-1e-9)
        expect(x).toBeLessThanOrEqual(30 + 1e-9)
        expect(y).toBeGreaterThanOrEqual(-1e-9)
        expect(y).toBeLessThanOrEqual(20 + 1e-9)
      }
    }
  })

  it('scales with the box (diamond midpoints land on edge centers)', () => {
    const points = shapePoints('diamond', 40, 10)
    expect(points).toEqual([[20, 0], [40, 5], [20, 10], [0, 5]])
  })
})

describe('dashPattern', () => {
  it('is empty for solid (canvas/SVG both read [] as no dashing)', () => {
    expect(dashPattern('solid', 1)).toEqual([])
  })

  it('scales with stroke width', () => {
    expect(dashPattern('dashed', 0.5)).toEqual([2, 1])
    expect(dashPattern('dotted', 0.5)).toEqual([0.5, 0.75])
  })

  it('clamps hairline widths so gaps stay visible', () => {
    expect(dashPattern('dashed', 0)).toEqual([0.4, 0.2])
  })
})

describe('lineArrowGeometry', () => {
  it('spans the full width with no caps and produces no heads', () => {
    const g = lineArrowGeometry(60, 4, 0.5, 'none', 'none')
    expect(g).toEqual({ x1Mm: 0, x2Mm: 60, heads: [] })
  })

  it('shortens the shaft under each arrowhead', () => {
    const g = lineArrowGeometry(60, 4, 0.5, 'arrow', 'arrow')
    const headLength = Math.max(0.5 * 4, 1.5) // = 2
    expect(g.x1Mm).toBe(headLength)
    expect(g.x2Mm).toBe(60 - headLength)
    expect(g.heads).toHaveLength(2)
    // Tips sit exactly at the element's ends.
    expect(g.heads[0]![0]).toEqual([0, 2])
    expect(g.heads[1]![0]).toEqual([60, 2])
  })

  it('keeps a hairline arrow visible via the minimum head size', () => {
    const g = lineArrowGeometry(60, 4, 0.1, 'none', 'arrow')
    expect(g.x2Mm).toBe(60 - 1.5)
  })

  it('collapses the shaft instead of inverting on a degenerate box', () => {
    const g = lineArrowGeometry(2, 4, 1, 'arrow', 'arrow') // heads 4mm each > 2mm box
    expect(g.x1Mm).toBe(g.x2Mm)
  })
})
