import { elementAabb } from './geometry'
import type { ElementPatch, TemplateElement } from './schema/elements'
import { roundMm } from './units'

// Align / distribute math (round 14). Works on ROTATED axis-aligned
// bounding boxes so a tilted element aligns by what the user actually sees;
// the returned patches translate xMm/yMm (the unrotated origin) by the
// delta between the element's AABB edge and the target edge.

export type AlignMode = 'left' | 'centerH' | 'right' | 'top' | 'middle' | 'bottom'

export interface PositionPatch {
  id: string
  patch: ElementPatch
}

/** Patches aligning every element's visual box to the selection's extremes. */
export function alignPatches(elements: TemplateElement[], mode: AlignMode): PositionPatch[] {
  if (elements.length < 2)
    return []
  const boxes = elements.map(element => ({ element, aabb: elementAabb(element) }))

  const left = Math.min(...boxes.map(box => box.aabb.left))
  const right = Math.max(...boxes.map(box => box.aabb.right))
  const top = Math.min(...boxes.map(box => box.aabb.top))
  const bottom = Math.max(...boxes.map(box => box.aabb.bottom))

  return boxes.flatMap(({ element, aabb }) => {
    let dx = 0
    let dy = 0
    switch (mode) {
      case 'left': dx = left - aabb.left
        break
      case 'centerH': dx = (left + right) / 2 - aabb.centerX
        break
      case 'right': dx = right - aabb.right
        break
      case 'top': dy = top - aabb.top
        break
      case 'middle': dy = (top + bottom) / 2 - aabb.centerY
        break
      case 'bottom': dy = bottom - aabb.bottom
        break
    }
    if (dx === 0 && dy === 0)
      return []
    return [{
      id: element.id,
      patch: { xMm: roundMm(element.xMm + dx), yMm: roundMm(element.yMm + dy) },
    }]
  })
}

/**
 * Patches spreading the elements' visual CENTERS evenly between the two
 * outermost centers along one axis. Order follows current positions.
 */
export function distributePatches(elements: TemplateElement[], axis: 'horizontal' | 'vertical'): PositionPatch[] {
  if (elements.length < 3)
    return []
  const key = axis === 'horizontal' ? 'centerX' : 'centerY'
  const boxes = elements
    .map(element => ({ element, aabb: elementAabb(element) }))
    .sort((a, b) => a.aabb[key] - b.aabb[key])

  const first = boxes[0]!.aabb[key]
  const last = boxes[boxes.length - 1]!.aabb[key]
  const step = (last - first) / (boxes.length - 1)

  return boxes.flatMap(({ element, aabb }, index) => {
    const delta = first + step * index - aabb[key]
    if (delta === 0)
      return []
    return [{
      id: element.id,
      patch: axis === 'horizontal'
        ? { xMm: roundMm(element.xMm + delta) }
        : { yMm: roundMm(element.yMm + delta) },
    }]
  })
}
