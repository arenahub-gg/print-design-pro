import type { AabbMm } from './geometry'
import { elementAabb } from './geometry'
import type { TemplateElement } from './schema/elements'
import type { PageSettings } from './schema/page'
import type { Guide } from './schema/template'

// Pure snapping module. Candidates are collected ONCE at gesture start
// (never per pointermove) and matched against the moving selection's AABB
// edges/centers, X and Y independently.

export interface SnapCandidates {
  /** Vertical lines: x positions in mm. */
  vertical: number[]
  /** Horizontal lines: y positions in mm. */
  horizontal: number[]
}

export interface SnapResult {
  /** Offset to add so the box lands on the nearest lines (0 when no snap). */
  dxMm: number
  dyMm: number
  /** Matched line positions for the overlay to draw. */
  activeVertical: number | null
  activeHorizontal: number | null
}

export function collectSnapCandidates(
  page: PageSettings,
  elements: TemplateElement[],
  guides: Guide[],
  excludeIds: ReadonlySet<string>,
): SnapCandidates {
  const vertical: number[] = [0, page.widthMm / 2, page.widthMm]
  const horizontal: number[] = [0, page.heightMm / 2, page.heightMm]

  for (const element of elements) {
    if (excludeIds.has(element.id) || !element.visible)
      continue
    const box = elementAabb(element)
    vertical.push(box.left, box.centerX, box.right)
    horizontal.push(box.top, box.centerY, box.bottom)
  }

  for (const guide of guides) {
    if (guide.orientation === 'vertical')
      vertical.push(guide.positionMm)
    else
      horizontal.push(guide.positionMm)
  }

  return { vertical, horizontal }
}

interface AxisSnap {
  delta: number
  line: number
}

function snapAxis(edges: number[], candidates: number[], toleranceMm: number): AxisSnap | null {
  let best: AxisSnap | null = null
  for (const edge of edges) {
    for (const line of candidates) {
      const delta = line - edge
      if (Math.abs(delta) <= toleranceMm && (best === null || Math.abs(delta) < Math.abs(best.delta)))
        best = { delta, line }
    }
  }
  return best
}

/**
 * Snap a moving box against candidate lines. `toleranceMm` should be derived
 * from a screen-px threshold divided by zoom so the feel is zoom-independent.
 */
export function snapAabb(box: AabbMm, candidates: SnapCandidates, toleranceMm: number): SnapResult {
  const xSnap = snapAxis([box.left, box.centerX, box.right], candidates.vertical, toleranceMm)
  const ySnap = snapAxis([box.top, box.centerY, box.bottom], candidates.horizontal, toleranceMm)
  return {
    dxMm: xSnap?.delta ?? 0,
    dyMm: ySnap?.delta ?? 0,
    activeVertical: xSnap?.line ?? null,
    activeHorizontal: ySnap?.line ?? null,
  }
}
