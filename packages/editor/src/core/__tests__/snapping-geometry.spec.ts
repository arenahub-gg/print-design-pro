import { describe, expect, it } from 'vitest'
import {
  aabbsIntersect,
  combinedAabb,
  normalizedRect,
  rotatePoint,
  rotatedRectAabb,
} from '../geometry'
import { collectSnapCandidates, snapAabb } from '../snapping'
import { PAGE_PRESETS } from '../schema/page'
import type { RectElement } from '../schema/elements'

function rect(x: number, y: number, w: number, h: number, rotation = 0): RectElement {
  return {
    id: `r-${x}-${y}`,
    type: 'rect',
    name: 'r',
    xMm: x,
    yMm: y,
    widthMm: w,
    heightMm: h,
    rotation,
    locked: false,
    visible: true,
    fillColor: '#fff',
    strokeColor: '#000',
    strokeWidthMm: 0,
    strokeStyle: 'solid',
    cornerRadiusMm: 0,
  }
}

describe('geometry', () => {
  it('rotatePoint rotates 90deg around a center', () => {
    const p = rotatePoint({ xMm: 10, yMm: 0 }, { xMm: 0, yMm: 0 }, 90)
    expect(p.xMm).toBeCloseTo(0, 6)
    expect(p.yMm).toBeCloseTo(10, 6)
  })

  it('rotatedRectAabb equals the rect when unrotated', () => {
    const box = rotatedRectAabb({ xMm: 10, yMm: 20, widthMm: 40, heightMm: 20 }, 0)
    expect(box).toEqual({ left: 10, top: 20, right: 50, bottom: 40, centerX: 30, centerY: 30 })
  })

  it('rotatedRectAabb expands for a 45deg square correctly', () => {
    // 10x10 square rotated 45deg -> AABB side = 10*sqrt(2), same center
    const box = rotatedRectAabb({ xMm: 0, yMm: 0, widthMm: 10, heightMm: 10 }, 45)
    const half = (10 * Math.SQRT2) / 2
    expect(box.left).toBeCloseTo(5 - half, 6)
    expect(box.right).toBeCloseTo(5 + half, 6)
    expect(box.centerX).toBeCloseTo(5, 6)
  })

  it('combinedAabb spans all boxes; null for empty', () => {
    const a = rotatedRectAabb({ xMm: 0, yMm: 0, widthMm: 10, heightMm: 10 }, 0)
    const b = rotatedRectAabb({ xMm: 50, yMm: 30, widthMm: 10, heightMm: 10 }, 0)
    expect(combinedAabb([a, b])).toEqual({ left: 0, top: 0, right: 60, bottom: 40, centerX: 30, centerY: 20 })
    expect(combinedAabb([])).toBeNull()
  })

  it('aabbsIntersect detects overlap and rejects touch-free boxes', () => {
    const a = rotatedRectAabb({ xMm: 0, yMm: 0, widthMm: 10, heightMm: 10 }, 0)
    const b = rotatedRectAabb({ xMm: 5, yMm: 5, widthMm: 10, heightMm: 10 }, 0)
    const c = rotatedRectAabb({ xMm: 20, yMm: 20, widthMm: 5, heightMm: 5 }, 0)
    expect(aabbsIntersect(a, b)).toBe(true)
    expect(aabbsIntersect(a, c)).toBe(false)
  })

  it('normalizedRect handles drags in any direction', () => {
    expect(normalizedRect({ xMm: 10, yMm: 10 }, { xMm: 4, yMm: 2 }))
      .toEqual({ xMm: 4, yMm: 2, widthMm: 6, heightMm: 8 })
  })
})

describe('snapping', () => {
  const page = PAGE_PRESETS.a4

  it('collects page edges/centers, element lines, and guides; excludes moving ids', () => {
    const stationary = rect(10, 10, 20, 10)
    const moving = rect(100, 100, 10, 10)
    const candidates = collectSnapCandidates(
      page,
      [stationary, moving],
      [{ id: 'g1', orientation: 'vertical', positionMm: 77 }],
      new Set([moving.id]),
    )
    expect(candidates.vertical).toContain(0)
    expect(candidates.vertical).toContain(105) // page center
    expect(candidates.vertical).toContain(210)
    expect(candidates.vertical).toContain(10) // stationary left
    expect(candidates.vertical).toContain(20) // stationary centerX
    expect(candidates.vertical).toContain(30) // stationary right
    expect(candidates.vertical).toContain(77) // guide
    expect(candidates.vertical).not.toContain(100) // moving excluded
  })

  it('snaps the nearest edge within tolerance, axes independent', () => {
    const candidates = { vertical: [50], horizontal: [80] }
    const box = { left: 48.5, right: 58.5, top: 100, bottom: 110, centerX: 53.5, centerY: 105 }
    const result = snapAabb(box, candidates, 2)
    expect(result.dxMm).toBeCloseTo(1.5, 6) // left 48.5 -> 50
    expect(result.dyMm).toBe(0) // 80 is beyond tolerance from any y edge
    expect(result.activeVertical).toBe(50)
    expect(result.activeHorizontal).toBeNull()
  })

  it('prefers the closest of several matches', () => {
    const candidates = { vertical: [10, 11], horizontal: [] }
    const box = { left: 10.4, right: 20.4, top: 0, bottom: 5, centerX: 15.4, centerY: 2.5 }
    const result = snapAabb(box, candidates, 2)
    expect(result.activeVertical).toBe(10)
    expect(result.dxMm).toBeCloseTo(-0.4, 6)
  })

  it('returns zero deltas when nothing is in range', () => {
    const result = snapAabb(
      { left: 40, right: 50, top: 40, bottom: 50, centerX: 45, centerY: 45 },
      { vertical: [0], horizontal: [0] },
      1,
    )
    expect(result).toEqual({ dxMm: 0, dyMm: 0, activeVertical: null, activeHorizontal: null })
  })
})
