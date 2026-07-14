import { cloneJson } from './clone'
import type { TemplateElement } from './schema/elements'
import { newId } from './schema/template'
import { roundMm } from './units'

// Internal element clipboard (round 14). Module-level, NOT the system
// clipboard: no permission prompts, and documents never leave the page.
// Survives switching documents within the session - paste across templates
// works. One editor instance per page is an existing library invariant.

const PASTE_OFFSET_MM = 5

let clipboard: TemplateElement[] = []
/** Grows per paste so repeated pastes cascade instead of stacking. */
let pasteCount = 0

/** Snapshot elements (deep clones - later edits must not leak in). */
export function copyElements(elements: TemplateElement[]): void {
  if (elements.length === 0)
    return
  clipboard = elements.map(element => cloneJson(element))
  pasteCount = 0
}

export function clipboardHasElements(): boolean {
  return clipboard.length > 0
}

/**
 * Fresh clones with new ids, offset by a growing cascade. Pasted elements
 * are always unlocked - a locked paste could not even be selected away.
 */
export function pasteElements(): TemplateElement[] {
  if (clipboard.length === 0)
    return []
  pasteCount += 1
  const offset = PASTE_OFFSET_MM * pasteCount
  return clipboard.map((element) => {
    const clone = cloneJson(element)
    clone.id = newId()
    clone.xMm = roundMm(clone.xMm + offset)
    clone.yMm = roundMm(clone.yMm + offset)
    clone.locked = false
    return clone
  })
}

/** Test hook: reset module state between specs. */
export function clearClipboard(): void {
  clipboard = []
  pasteCount = 0
}
