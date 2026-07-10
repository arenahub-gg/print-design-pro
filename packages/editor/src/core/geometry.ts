import type { TemplateElement } from './schema/elements'

// Pure geometry helpers shared by interaction composables and snapping.
// Everything operates in page mm; rotation in degrees clockwise.

export interface PointMm {
  xMm: number
  yMm: number
}

export interface RectMm {
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

/** Axis-aligned bounds with derived centers - the shape snapping works on. */
export interface AabbMm {
  left: number
  top: number
  right: number
  bottom: number
  centerX: number
  centerY: number
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function rotatePoint(point: PointMm, center: PointMm, deg: number): PointMm {
  const rad = degToRad(deg)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = point.xMm - center.xMm
  const dy = point.yMm - center.yMm
  return {
    xMm: center.xMm + dx * cos - dy * sin,
    yMm: center.yMm + dx * sin + dy * cos,
  }
}

export function rectCenter(rect: RectMm): PointMm {
  return { xMm: rect.xMm + rect.widthMm / 2, yMm: rect.yMm + rect.heightMm / 2 }
}

/** Axis-aligned bounding box of a possibly-rotated rect. */
export function rotatedRectAabb(rect: RectMm, rotationDeg: number): AabbMm {
  const center = rectCenter(rect)
  if (rotationDeg % 360 === 0) {
    return {
      left: rect.xMm,
      top: rect.yMm,
      right: rect.xMm + rect.widthMm,
      bottom: rect.yMm + rect.heightMm,
      centerX: center.xMm,
      centerY: center.yMm,
    }
  }
  const corners = [
    { xMm: rect.xMm, yMm: rect.yMm },
    { xMm: rect.xMm + rect.widthMm, yMm: rect.yMm },
    { xMm: rect.xMm + rect.widthMm, yMm: rect.yMm + rect.heightMm },
    { xMm: rect.xMm, yMm: rect.yMm + rect.heightMm },
  ].map(corner => rotatePoint(corner, center, rotationDeg))
  const xs = corners.map(c => c.xMm)
  const ys = corners.map(c => c.yMm)
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
    centerX: center.xMm,
    centerY: center.yMm,
  }
}

export function elementAabb(element: TemplateElement): AabbMm {
  return rotatedRectAabb(
    { xMm: element.xMm, yMm: element.yMm, widthMm: element.widthMm, heightMm: element.heightMm },
    element.rotation,
  )
}

/** Combined AABB of several elements (multi-selection bounds). */
export function combinedAabb(boxes: AabbMm[]): AabbMm | null {
  if (boxes.length === 0)
    return null
  const left = Math.min(...boxes.map(b => b.left))
  const top = Math.min(...boxes.map(b => b.top))
  const right = Math.max(...boxes.map(b => b.right))
  const bottom = Math.max(...boxes.map(b => b.bottom))
  return { left, top, right, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 }
}

export function aabbsIntersect(a: AabbMm, b: AabbMm): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

/** Normalize a possibly-negative drag rect (marquee) to positive extents. */
export function normalizedRect(start: PointMm, end: PointMm): RectMm {
  return {
    xMm: Math.min(start.xMm, end.xMm),
    yMm: Math.min(start.yMm, end.yMm),
    widthMm: Math.abs(end.xMm - start.xMm),
    heightMm: Math.abs(end.yMm - start.yMm),
  }
}
