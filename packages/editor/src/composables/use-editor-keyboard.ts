import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import {
  addElementCommand,
  removeElementsCommand,
  updateElementsCommand,
} from '../core/commands/element-commands'
import { cloneJson } from '../core/clone'
import { clipboardHasElements, copyElements, pasteElements } from '../core/element-clipboard'
import type { ElementPatch } from '../core/schema/elements'
import { newId } from '../core/schema/template'
import { roundMm } from '../core/units'
import type { DocumentStore } from '../stores/document-store'
import type { HistoryStore } from '../stores/history-store'
import type { InteractionStore } from '../stores/interaction-store'
import type { SelectionStore } from '../stores/selection-store'

const NUDGE_MM = 1
const NUDGE_LARGE_MM = 10
const DUPLICATE_OFFSET_MM = 5

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement))
    return false
  return target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
}

/**
 * Canvas keyboard map (scoped to the focused viewport container):
 * arrows nudge 1mm (shift 10mm) - Delete removes - Ctrl+D duplicates -
 * Ctrl+C/X/V copy/cut/paste (internal clipboard, works across documents) -
 * Ctrl+A selects all unlocked - Ctrl+Z/Y (or Ctrl+Shift+Z) undo/redo -
 * Escape clears selection. Editable children are never intercepted.
 */
export function useEditorKeyboard(
  containerRef: Ref<HTMLElement | null>,
  stores: {
    doc: DocumentStore
    history: HistoryStore
    selection: SelectionStore
    interaction: InteractionStore
  },
) {
  const { doc, history, selection, interaction } = stores

  /**
   * Consecutive same-selection nudges within this window collapse into one
   * history entry - key auto-repeat would otherwise flood the 100-entry cap.
   */
  const NUDGE_COALESCE_MS = 800
  let nudgeRun: {
    key: string
    baseline: Map<string, { xMm: number, yMm: number }>
    accumX: number
    accumY: number
    at: number
  } | null = null

  function selectedUnlockedIds(): string[] {
    return [...selection.selectedIds].filter((id) => {
      const element = doc.getElementById(id)
      return element && !element.locked
    })
  }

  function nudge(dxMm: number, dyMm: number): void {
    const ids = selectedUnlockedIds()
    if (ids.length === 0)
      return
    const key = [...ids].sort().join(',')
    const now = Date.now()

    if (nudgeRun && nudgeRun.key === key && now - nudgeRun.at < NUDGE_COALESCE_MS && history.undoLabel === 'Nudge') {
      // Continue the run: revert the previous nudge entry, then re-dispatch
      // one command covering the whole accumulated distance.
      history.undo()
      nudgeRun.accumX += dxMm
      nudgeRun.accumY += dyMm
    }
    else {
      const baseline = new Map<string, { xMm: number, yMm: number }>()
      for (const id of ids) {
        const element = doc.getElementById(id)
        if (element)
          baseline.set(id, { xMm: element.xMm, yMm: element.yMm })
      }
      nudgeRun = { key, baseline, accumX: dxMm, accumY: dyMm, at: now }
    }

    nudgeRun.at = now
    const patches = ids.flatMap((id) => {
      const base = nudgeRun!.baseline.get(id)
      if (!base)
        return []
      const patch: ElementPatch = {
        xMm: roundMm(base.xMm + nudgeRun!.accumX),
        yMm: roundMm(base.yMm + nudgeRun!.accumY),
      }
      return [{ id, patch }]
    })
    history.dispatch(updateElementsCommand(doc, patches, 'Nudge'))
  }

  function removeSelected(): void {
    const ids = selectedUnlockedIds()
    if (ids.length === 0)
      return
    history.dispatch(removeElementsCommand(doc, ids))
    selection.clear()
  }

  function duplicateSelected(): void {
    const ids = selectedUnlockedIds()
    if (ids.length === 0)
      return
    const clones = ids.flatMap((id) => {
      const element = doc.getElementById(id)
      if (!element)
        return []
      const clone = cloneJson(element)
      clone.id = newId()
      clone.xMm = roundMm(clone.xMm + DUPLICATE_OFFSET_MM)
      clone.yMm = roundMm(clone.yMm + DUPLICATE_OFFSET_MM)
      return [clone]
    })
    history.transact(clones.length === 1 ? 'Duplicate element' : `Duplicate ${clones.length} elements`, () => {
      for (const clone of clones)
        history.dispatch(addElementCommand(doc, clone))
    })
    selection.setSelection(clones.map(clone => clone.id))
  }

  function copySelected(): void {
    const elements = [...selection.selectedIds]
      .map(id => doc.getElementById(id))
      .filter((element): element is NonNullable<typeof element> => element !== undefined)
    copyElements(elements)
  }

  function cutSelected(): void {
    // Copy everything selected, but only unlocked elements leave the canvas.
    copySelected()
    removeSelected()
  }

  function pasteClipboard(): void {
    if (!clipboardHasElements())
      return
    const clones = pasteElements()
    history.transact(clones.length === 1 ? 'Paste element' : `Paste ${clones.length} elements`, () => {
      for (const clone of clones)
        history.dispatch(addElementCommand(doc, clone))
    })
    selection.setSelection(clones.map(clone => clone.id))
  }

  function selectAll(): void {
    selection.setSelection(
      doc.elements.filter(el => el.visible && !el.locked).map(el => el.id),
    )
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (isEditableTarget(event.target))
      return
    // Never mutate the document while a pointer gesture is live - Delete or
    // undo mid-drag would leave the gesture committing against dead ids.
    if (interaction.hasPreview || interaction.marquee)
      return
    const ctrl = event.ctrlKey || event.metaKey
    const step = event.shiftKey ? NUDGE_LARGE_MM : NUDGE_MM

    switch (event.key) {
      case 'ArrowLeft': return handled(event, () => nudge(-step, 0))
      case 'ArrowRight': return handled(event, () => nudge(step, 0))
      case 'ArrowUp': return handled(event, () => nudge(0, -step))
      case 'ArrowDown': return handled(event, () => nudge(0, step))
      case 'Delete':
      case 'Backspace': return handled(event, removeSelected)
      case 'Escape': return handled(event, () => selection.clear())
    }

    if (!ctrl)
      return
    switch (event.key.toLowerCase()) {
      case 'd': return handled(event, duplicateSelected)
      case 'c': return handled(event, copySelected)
      case 'x': return handled(event, cutSelected)
      case 'v': return handled(event, pasteClipboard)
      case 'a': return handled(event, selectAll)
      case 'z': return handled(event, () => (event.shiftKey ? history.redo() : history.undo()))
      case 'y': return handled(event, () => history.redo())
    }
  }

  function handled(event: KeyboardEvent, action: () => void): void {
    event.preventDefault()
    event.stopPropagation()
    action()
  }

  onMounted(() => containerRef.value?.addEventListener('keydown', onKeyDown))
  onBeforeUnmount(() => containerRef.value?.removeEventListener('keydown', onKeyDown))
}
