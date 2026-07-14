import { beforeEach, describe, expect, it } from 'vitest'
import { alignPatches, distributePatches } from '../align'
import { clearClipboard, clipboardHasElements, copyElements, pasteElements } from '../element-clipboard'
import { createRect } from '../element-factories'

function rectAt(x: number, y: number, w = 10, h = 10) {
  const rect = createRect({ centerXMm: 0, centerYMm: 0 })
  rect.xMm = x
  rect.yMm = y
  rect.widthMm = w
  rect.heightMm = h
  return rect
}

describe('alignPatches', () => {
  it('aligns left edges to the selection minimum and skips no-ops', () => {
    const a = rectAt(10, 0)
    const b = rectAt(30, 20)
    const patches = alignPatches([a, b], 'left')
    expect(patches).toEqual([{ id: b.id, patch: { xMm: 10, yMm: 20 } }])
  })

  it('centers vertically on the selection middle', () => {
    const a = rectAt(0, 0, 10, 10) // centerY 5
    const b = rectAt(0, 30, 10, 10) // centerY 35 -> middle 20
    const patches = alignPatches([a, b], 'middle')
    expect(patches).toEqual([
      { id: a.id, patch: { xMm: 0, yMm: 15 } },
      { id: b.id, patch: { xMm: 0, yMm: 15 } },
    ])
  })

  it('uses the ROTATED bounding box (a tilted element aligns by what is seen)', () => {
    const straight = rectAt(0, 0, 10, 10)
    const tilted = rectAt(30, 0, 20, 10)
    tilted.rotation = 90 // visual box: 10 wide centered at (40, 5) -> left 35
    const patches = alignPatches([straight, tilted], 'left')
    // tilted must move so its VISUAL left (35) lands at 0 -> dx = -35
    expect(patches).toEqual([{ id: tilted.id, patch: { xMm: -5, yMm: 0 } }])
  })

  it('returns nothing for fewer than two elements', () => {
    expect(alignPatches([rectAt(0, 0)], 'left')).toEqual([])
  })
})

describe('distributePatches', () => {
  it('spreads centers evenly, keeping the outermost elements fixed', () => {
    const a = rectAt(0, 0) // center 5
    const b = rectAt(8, 0) // center 13 -> target 25
    const c = rectAt(40, 0) // center 45
    const patches = distributePatches([a, b, c], 'horizontal')
    expect(patches).toEqual([{ id: b.id, patch: { xMm: 20 } }])
  })

  it('needs at least three elements', () => {
    expect(distributePatches([rectAt(0, 0), rectAt(20, 0)], 'horizontal')).toEqual([])
  })
})

describe('element clipboard', () => {
  beforeEach(clearClipboard)

  it('pastes fresh ids with a cascading offset and unlocks clones', () => {
    const source = rectAt(10, 10)
    source.locked = true
    copyElements([source])
    expect(clipboardHasElements()).toBe(true)

    const first = pasteElements()
    expect(first[0]!.id).not.toBe(source.id)
    expect(first[0]!.xMm).toBe(15)
    expect(first[0]!.locked).toBe(false)

    const second = pasteElements()
    expect(second[0]!.xMm).toBe(20)
    expect(second[0]!.id).not.toBe(first[0]!.id)
  })

  it('snapshots at copy time - later source edits do not leak in', () => {
    const source = rectAt(10, 10)
    copyElements([source])
    source.xMm = 99
    expect(pasteElements()[0]!.xMm).toBe(15)
  })

  it('copying resets the paste cascade', () => {
    const source = rectAt(10, 10)
    copyElements([source])
    pasteElements()
    pasteElements()
    copyElements([source])
    expect(pasteElements()[0]!.xMm).toBe(15)
  })
})
