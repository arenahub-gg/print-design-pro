import type { LineCapStyle, ShapeKind, StrokeStyle } from './schema/elements'

// Single geometry source for the polygon shape family and line decorations.
// Everything here works in mm; the SVG view converts to px per coordinate,
// the print engine consumes mm directly - same parity contract as
// computeTableLayout. Strokes straddle these paths in BOTH renderers (no
// inset), so a stroked shape may overflow its box by strokeWidth/2.

export type PointMm = readonly [x: number, y: number]

/** Regular polygon on the box's inscribed ellipse, first vertex at `startAngle`. */
function regularPolygon(sides: number, w: number, h: number, startAngle: number): PointMm[] {
  const cx = w / 2
  const cy = h / 2
  return Array.from({ length: sides }, (_, i) => {
    const angle = startAngle + (i * 2 * Math.PI) / sides
    return [cx + (w / 2) * Math.cos(angle), cy + (h / 2) * Math.sin(angle)] as const
  })
}

/** 5-point star: outer vertices on the box ellipse, inner at `innerRatio`. */
function star(w: number, h: number, points = 5, innerRatio = 0.4): PointMm[] {
  const cx = w / 2
  const cy = h / 2
  const result: PointMm[] = []
  for (let i = 0; i < points * 2; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / points
    const ratio = i % 2 === 0 ? 1 : innerRatio
    result.push([cx + (w / 2) * ratio * Math.cos(angle), cy + (h / 2) * ratio * Math.sin(angle)])
  }
  return result
}

/** Block arrow pointing right: shaft 50% of height, head 40% of width. */
function blockArrow(w: number, h: number): PointMm[] {
  const headX = w * 0.6
  const shaftTop = h * 0.25
  const shaftBottom = h * 0.75
  return [
    [0, shaftTop],
    [headX, shaftTop],
    [headX, 0],
    [w, h / 2],
    [headX, h],
    [headX, shaftBottom],
    [0, shaftBottom],
  ]
}

/** Closed polygon vertices (mm) for a shape kind inside a w x h box. */
export function shapePoints(kind: ShapeKind, widthMm: number, heightMm: number): PointMm[] {
  switch (kind) {
    case 'triangle':
      return [[widthMm / 2, 0], [widthMm, heightMm], [0, heightMm]]
    case 'diamond':
      return [[widthMm / 2, 0], [widthMm, heightMm / 2], [widthMm / 2, heightMm], [0, heightMm / 2]]
    case 'star':
      return star(widthMm, heightMm)
    case 'arrow':
      return blockArrow(widthMm, heightMm)
    case 'pentagon':
      return regularPolygon(5, widthMm, heightMm, -Math.PI / 2)
    case 'hexagon':
      return regularPolygon(6, widthMm, heightMm, 0)
  }
}

/**
 * Dash pattern (mm) for a stroke style, proportional to the stroke width so
 * thick strokes keep readable gaps. Empty array = solid (both SVG and
 * canvas treat [] as no dashing).
 */
export function dashPattern(style: StrokeStyle, strokeWidthMm: number): number[] {
  const w = Math.max(strokeWidthMm, 0.1)
  switch (style) {
    case 'dashed':
      return [w * 4, w * 2]
    case 'dotted':
      return [w, w * 1.5]
    default:
      return []
  }
}

export interface LineArrowGeometry {
  /** Shaft span - shortened under arrowheads so dash gaps never poke through. */
  x1Mm: number
  x2Mm: number
  /** Filled arrowhead triangles (mm), empty when both caps are 'none'. */
  heads: PointMm[][]
}

/**
 * Horizontal line decoration geometry. The line element draws a horizontal
 * stroke at heightMm/2 across widthMm; arrowheads are filled triangles
 * scaled from the stroke width (min 1.5mm so hairlines stay visible).
 */
export function lineArrowGeometry(
  widthMm: number,
  heightMm: number,
  strokeWidthMm: number,
  startCap: LineCapStyle,
  endCap: LineCapStyle,
): LineArrowGeometry {
  const y = heightMm / 2
  const headLength = Math.max(strokeWidthMm * 4, 1.5)
  const headHalfWidth = Math.max(strokeWidthMm * 1.6, 0.75)
  const heads: PointMm[][] = []
  let x1 = 0
  let x2 = widthMm

  if (startCap === 'arrow') {
    heads.push([[0, y], [headLength, y - headHalfWidth], [headLength, y + headHalfWidth]])
    x1 = headLength
  }
  if (endCap === 'arrow') {
    heads.push([[widthMm, y], [widthMm - headLength, y - headHalfWidth], [widthMm - headLength, y + headHalfWidth]])
    x2 = widthMm - headLength
  }
  // Degenerate box (shorter than its arrowheads): keep a zero-length shaft.
  if (x1 > x2)
    x1 = x2 = (x1 + x2) / 2

  return { x1Mm: x1, x2Mm: x2, heads }
}
