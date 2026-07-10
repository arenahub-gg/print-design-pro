import { describe, expect, it } from 'vitest'
import { normalizeAngle, pointerAngleDeg, resizeRect } from '../resize-math'

const BASE = { xMm: 10, yMm: 10, widthMm: 40, heightMm: 20 }

describe('resizeRect (unrotated)', () => {
  it('se handle follows the pointer, nw anchor stays fixed', () => {
    const next = resizeRect({
      rect: BASE,
      rotationDeg: 0,
      handle: 'se',
      pointer: { xMm: 70, yMm: 50 },
      lockAspect: false,
      fromCenter: false,
    })
    expect(next).toEqual({ xMm: 10, yMm: 10, widthMm: 60, heightMm: 40 })
  })

  it('e edge handle changes width only', () => {
    const next = resizeRect({
      rect: BASE,
      rotationDeg: 0,
      handle: 'e',
      pointer: { xMm: 90, yMm: 999 },
      lockAspect: false,
      fromCenter: false,
    })
    expect(next.widthMm).toBeCloseTo(80, 6)
    expect(next.heightMm).toBe(20)
    expect(next.yMm).toBeCloseTo(10, 6)
  })

  it('nw handle keeps the se corner anchored', () => {
    const next = resizeRect({
      rect: BASE,
      rotationDeg: 0,
      handle: 'nw',
      pointer: { xMm: 20, yMm: 15 },
      lockAspect: false,
      fromCenter: false,
    })
    // se corner (50, 30) must not move
    expect(next.xMm + next.widthMm).toBeCloseTo(50, 6)
    expect(next.yMm + next.heightMm).toBeCloseTo(30, 6)
    expect(next.widthMm).toBeCloseTo(30, 6)
    expect(next.heightMm).toBeCloseTo(15, 6)
  })

  it('enforces the minimum size', () => {
    const next = resizeRect({
      rect: BASE,
      rotationDeg: 0,
      handle: 'se',
      pointer: { xMm: 10.1, yMm: 10.1 },
      lockAspect: false,
      fromCenter: false,
      minSizeMm: 1,
    })
    expect(next.widthMm).toBe(1)
    expect(next.heightMm).toBe(1)
  })

  it('shift locks the aspect ratio', () => {
    const next = resizeRect({
      rect: BASE, // ratio 2:1
      rotationDeg: 0,
      handle: 'se',
      pointer: { xMm: 90, yMm: 20 },
      lockAspect: true,
      fromCenter: false,
    })
    expect(next.widthMm / next.heightMm).toBeCloseTo(2, 6)
    expect(next.widthMm).toBeCloseTo(80, 6)
  })

  it('alt resizes symmetrically around the center', () => {
    const next = resizeRect({
      rect: BASE, // center (30, 20)
      rotationDeg: 0,
      handle: 'e',
      pointer: { xMm: 55, yMm: 20 },
      lockAspect: false,
      fromCenter: true,
    })
    expect(next.widthMm).toBeCloseTo(50, 6) // 2 * |55-30|
    expect(next.xMm + next.widthMm / 2).toBeCloseTo(30, 6) // center preserved
  })
})

describe('resizeRect (review-flagged branches)', () => {
  it('rotated EDGE handle preserves the cross axis (rotateBackAxis path)', () => {
    const rotation = 30
    const next = resizeRect({
      rect: BASE, // 40x20 at (10,10), center (30,20)
      rotationDeg: rotation,
      handle: 'e',
      pointer: { xMm: 80, yMm: 45 },
      lockAspect: false,
      fromCenter: false,
    })
    // Height must be untouched by an east-edge drag.
    expect(next.heightMm).toBe(20)
    // The west-edge midpoint (anchor) must stay fixed in world space.
    const worldPoint = (rect: typeof BASE, localX: number, deg: number) => {
      const cx = rect.xMm + rect.widthMm / 2
      const cy = rect.yMm + rect.heightMm / 2
      const rad = (deg * Math.PI) / 180
      return {
        x: cx + localX * Math.cos(rad),
        y: cy + localX * Math.sin(rad),
      }
    }
    const anchorBefore = worldPoint(BASE, -BASE.widthMm / 2, rotation)
    const anchorAfter = worldPoint(next, -next.widthMm / 2, rotation)
    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x, 4)
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y, 4)
  })

  it('dragging through the anchor mirrors the box instead of collapsing', () => {
    // se handle dragged past the nw anchor (10,10): box flips to the other side.
    const next = resizeRect({
      rect: BASE,
      rotationDeg: 0,
      handle: 'se',
      pointer: { xMm: -20, yMm: -5 },
      lockAspect: false,
      fromCenter: false,
    })
    expect(next.widthMm).toBeCloseTo(30, 6)
    expect(next.heightMm).toBeCloseTo(15, 6)
    // Box now extends to the negative side of the anchor.
    expect(next.xMm).toBeCloseTo(-20, 6)
    expect(next.yMm).toBeCloseTo(-5, 6)
  })

  it('lockAspect + fromCenter keeps both the ratio and the center', () => {
    const next = resizeRect({
      rect: BASE, // ratio 2:1, center (30,20)
      rotationDeg: 0,
      handle: 'se',
      pointer: { xMm: 55, yMm: 22 },
      lockAspect: true,
      fromCenter: true,
    })
    expect(next.widthMm / next.heightMm).toBeCloseTo(2, 6)
    expect(next.xMm + next.widthMm / 2).toBeCloseTo(30, 6)
    expect(next.yMm + next.heightMm / 2).toBeCloseTo(20, 6)
  })
})

describe('resizeRect (rotated)', () => {
  it('anchor corner stays fixed in world space for a rotated rect', () => {
    const rotation = 30
    const next = resizeRect({
      rect: BASE,
      rotationDeg: rotation,
      handle: 'se',
      pointer: { xMm: 80, yMm: 60 },
      lockAspect: false,
      fromCenter: false,
    })
    // The nw corner in world space must be identical before and after.
    const worldCorner = (rect: typeof BASE, deg: number): { x: number, y: number } => {
      const cx = rect.xMm + rect.widthMm / 2
      const cy = rect.yMm + rect.heightMm / 2
      const rad = (deg * Math.PI) / 180
      const dx = rect.xMm - cx
      const dy = rect.yMm - cy
      return { x: cx + dx * Math.cos(rad) - dy * Math.sin(rad), y: cy + dx * Math.sin(rad) + dy * Math.cos(rad) }
    }
    const before = worldCorner(BASE, rotation)
    const after = worldCorner(next, rotation)
    expect(after.x).toBeCloseTo(before.x, 4)
    expect(after.y).toBeCloseTo(before.y, 4)
  })
})

describe('angles', () => {
  it('pointerAngleDeg measures from the center', () => {
    expect(pointerAngleDeg({ xMm: 0, yMm: 0 }, { xMm: 10, yMm: 0 })).toBeCloseTo(0, 6)
    expect(pointerAngleDeg({ xMm: 0, yMm: 0 }, { xMm: 0, yMm: 10 })).toBeCloseTo(90, 6)
  })

  it('normalizeAngle wraps into [0,360) and snaps to steps', () => {
    expect(normalizeAngle(-30)).toBe(330)
    expect(normalizeAngle(370)).toBe(10)
    expect(normalizeAngle(52, 15)).toBe(45)
    expect(normalizeAngle(53, 15)).toBe(60)
  })
})
