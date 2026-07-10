import { degToRad, rectCenter, rotatePoint, type PointMm, type RectMm } from './geometry'

// Resize math for possibly-rotated rects, in pure functions so it is fully
// unit-testable. Approach: hold the anchor (the point opposite the grabbed
// handle) fixed in WORLD space, work in the element's local (rotated) frame,
// then recompute the world center from the new size.

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

/** Direction each handle pulls, in local units (-1 | 0 | 1). */
export const HANDLE_DIRECTIONS: Record<HandleId, { dx: number, dy: number }> = {
  nw: { dx: -1, dy: -1 },
  n: { dx: 0, dy: -1 },
  ne: { dx: 1, dy: -1 },
  e: { dx: 1, dy: 0 },
  se: { dx: 1, dy: 1 },
  s: { dx: 0, dy: 1 },
  sw: { dx: -1, dy: 1 },
  w: { dx: -1, dy: 0 },
}

export interface ResizeInput {
  rect: RectMm
  rotationDeg: number
  handle: HandleId
  /** Current pointer position in page mm. */
  pointer: PointMm
  /** Keep aspect ratio (shift). */
  lockAspect: boolean
  /** Resize symmetrically around the center (alt). */
  fromCenter: boolean
  minSizeMm?: number
}

/**
 * New rect for a resize gesture. The grabbed handle follows the pointer,
 * the anchor stays fixed (opposite point, or the center with `fromCenter`).
 */
export function resizeRect(input: ResizeInput): RectMm {
  const { rect, rotationDeg, handle, pointer, lockAspect, fromCenter } = input
  const minSize = input.minSizeMm ?? 1
  const { dx, dy } = HANDLE_DIRECTIONS[handle]
  const center = rectCenter(rect)

  // Anchor in world space: center, or the point opposite the handle.
  const anchorLocal: PointMm = fromCenter
    ? { xMm: 0, yMm: 0 }
    : { xMm: (-dx * rect.widthMm) / 2, yMm: (-dy * rect.heightMm) / 2 }
  const anchorWorld = rotatePoint(
    { xMm: center.xMm + anchorLocal.xMm, yMm: center.yMm + anchorLocal.yMm },
    center,
    rotationDeg,
  )

  // Pointer relative to the anchor, expressed in the element's local frame.
  const rad = degToRad(-rotationDeg)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rel = { x: pointer.xMm - anchorWorld.xMm, y: pointer.yMm - anchorWorld.yMm }
  const local = { x: rel.x * cos - rel.y * sin, y: rel.x * sin + rel.y * cos }

  // Distance from anchor to pointer along each local axis IS the new extent
  // (double it when the anchor is the center).
  const extentScale = fromCenter ? 2 : 1
  let widthMm = Math.max(minSize, dx !== 0 ? Math.abs(local.x) * extentScale : rect.widthMm)
  let heightMm = Math.max(minSize, dy !== 0 ? Math.abs(local.y) * extentScale : rect.heightMm)

  if (lockAspect && dx !== 0 && dy !== 0) {
    const ratio = rect.widthMm / rect.heightMm
    if (widthMm / ratio >= heightMm)
      heightMm = widthMm / ratio
    else
      widthMm = heightMm * ratio
  }

  // Which side of the anchor the box now extends toward, in local space.
  const signX = dx !== 0 ? Math.sign(local.x) || 1 : 0
  const signY = dy !== 0 ? Math.sign(local.y) || 1 : 0

  // New center in world = anchor + rotated local offset to the box center.
  const centerLocal: PointMm = fromCenter
    ? { xMm: 0, yMm: 0 }
    : {
        xMm: dx !== 0 ? (signX * widthMm) / 2 : rotateBackAxis(center, anchorWorld, rotationDeg).x,
        yMm: dy !== 0 ? (signY * heightMm) / 2 : rotateBackAxis(center, anchorWorld, rotationDeg).y,
      }
  const newCenter = rotatePoint(
    { xMm: anchorWorld.xMm + centerLocal.xMm, yMm: anchorWorld.yMm + centerLocal.yMm },
    anchorWorld,
    rotationDeg,
  )

  return {
    xMm: newCenter.xMm - widthMm / 2,
    yMm: newCenter.yMm - heightMm / 2,
    widthMm,
    heightMm,
  }
}

/** Original center expressed in the anchor's local frame (for edge handles). */
function rotateBackAxis(center: PointMm, anchorWorld: PointMm, rotationDeg: number): { x: number, y: number } {
  const rad = degToRad(-rotationDeg)
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rel = { x: center.xMm - anchorWorld.xMm, y: center.yMm - anchorWorld.yMm }
  return { x: rel.x * cos - rel.y * sin, y: rel.x * sin + rel.y * cos }
}

/** Pointer angle (deg) around a center, for the rotate gesture. */
export function pointerAngleDeg(center: PointMm, pointer: PointMm): number {
  return (Math.atan2(pointer.yMm - center.yMm, pointer.xMm - center.xMm) * 180) / Math.PI
}

/** Normalize to [0, 360) and optionally snap to a step (shift = 15deg). */
export function normalizeAngle(deg: number, stepDeg?: number): number {
  let angle = deg % 360
  if (angle < 0)
    angle += 360
  if (stepDeg)
    angle = Math.round(angle / stepDeg) * stepDeg % 360
  return angle
}
