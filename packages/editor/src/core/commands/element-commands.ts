import type { DocumentStore } from '../../stores/document-store'
import type { ElementPatch, TemplateElement } from '../schema/elements'
import type { PageSettings } from '../schema/page'
import type { Guide } from '../schema/template'
import type { Command } from './command'

// Command factories: each returns a Command closing over the document store.
// Creation PAYLOADS are snapshotted at factory time (they describe the edit
// itself); undo state (snapshots of prior document state, indices) is
// captured inside execute() so redo replays against current reality. The
// store must never receive a caller-held reference: every insert passes a
// fresh clone, otherwise later in-place updates would mutate the shared
// object and corrupt redo.

import { cloneJson } from '../clone'

export function addElementCommand(
  store: DocumentStore,
  element: TemplateElement,
  index?: number,
): Command {
  const payload = cloneJson(element)
  return {
    label: `Add ${element.type}`,
    execute: () => store._insertElement(cloneJson(payload), index ?? store.elements.length),
    undo: () => store._removeElement(payload.id),
  }
}

export function removeElementsCommand(store: DocumentStore, ids: string[]): Command {
  let removed: Array<{ element: TemplateElement, index: number }> = []
  return {
    label: ids.length === 1 ? 'Remove element' : `Remove ${ids.length} elements`,
    execute: () => {
      removed = ids
        .map(id => ({ element: store.getElementById(id), index: store.getElementIndex(id) }))
        .filter((entry): entry is { element: TemplateElement, index: number } =>
          entry.element !== undefined && entry.index !== -1)
        .sort((a, b) => a.index - b.index)
      // Snapshot before mutation - the store objects are removed in place.
      removed = removed.map(entry => ({ ...entry, element: cloneJson(entry.element) }))
      for (const { element } of removed)
        store._removeElement(element.id)
    },
    undo: () => {
      // Reinsert ascending so earlier indices are valid for later ones.
      for (const { element, index } of removed)
        store._insertElement(element, index)
    },
  }
}

export function updateElementsCommand(
  store: DocumentStore,
  patches: Array<{ id: string, patch: ElementPatch }>,
  label = patches.length === 1 ? 'Edit element' : `Edit ${patches.length} elements`,
): Command {
  let before: Array<{ id: string, patch: ElementPatch }> = []
  return {
    label,
    execute: () => {
      // Only keys the target element actually owns are applied/snapshotted -
      // a cross-variant patch (e.g. fillColor onto a line) must not create
      // phantom properties that break schema round-tripping.
      const effective = patches.flatMap(({ id, patch }) => {
        const element = store.getElementById(id)
        if (!element)
          return []
        const keys = Object.keys(patch).filter(key => key in element)
        if (keys.length === 0)
          return []
        const applied = Object.fromEntries(
          keys.map(key => [key, patch[key as keyof typeof patch]]),
        ) as ElementPatch
        const snapshot = Object.fromEntries(
          keys.map(key => [key, element[key as keyof TemplateElement]]),
        ) as ElementPatch
        return [{ id, applied, snapshot }]
      })
      before = effective.map(({ id, snapshot }) => ({ id, patch: snapshot }))
      for (const { id, applied } of effective)
        store._updateElement(id, applied)
    },
    undo: () => {
      for (const { id, patch } of before)
        store._updateElement(id, patch)
    },
  }
}

export function reorderElementCommand(store: DocumentStore, id: string, toIndex: number): Command {
  let fromIndex = -1
  return {
    label: 'Reorder element',
    execute: () => {
      fromIndex = store.getElementIndex(id)
      store._moveElement(id, toIndex)
    },
    undo: () => {
      if (fromIndex !== -1)
        store._moveElement(id, fromIndex)
    },
  }
}

export function renameTemplateCommand(store: DocumentStore, name: string): Command {
  let before: string | null = null
  return {
    label: 'Rename template',
    execute: () => {
      before = store.document.name
      store._rename(name)
    },
    undo: () => {
      if (before !== null)
        store._rename(before)
    },
  }
}

export function setPageSettingsCommand(store: DocumentStore, settings: PageSettings): Command {
  let before: PageSettings | null = null
  return {
    label: 'Change page settings',
    execute: () => {
      before = { ...store.page }
      store._setPage(settings)
    },
    undo: () => {
      if (before)
        store._setPage(before)
    },
  }
}

export function addGuideCommand(store: DocumentStore, guide: Guide): Command {
  const payload = cloneJson(guide)
  return {
    label: 'Add guide',
    execute: () => store._insertGuide(cloneJson(payload)),
    undo: () => store._removeGuide(payload.id),
  }
}

export function removeGuideCommand(store: DocumentStore, id: string): Command {
  let removed: Guide | null = null
  return {
    label: 'Remove guide',
    execute: () => {
      const found = store.guides.find(guide => guide.id === id)
      removed = found ? cloneJson(found) : null
      store._removeGuide(id)
    },
    undo: () => {
      if (removed)
        store._insertGuide(removed)
    },
  }
}

export function moveGuideCommand(store: DocumentStore, id: string, positionMm: number): Command {
  let before: number | null = null
  return {
    label: 'Move guide',
    execute: () => {
      before = store.guides.find(guide => guide.id === id)?.positionMm ?? null
      store._updateGuide(id, positionMm)
    },
    undo: () => {
      if (before !== null)
        store._updateGuide(id, before)
    },
  }
}
