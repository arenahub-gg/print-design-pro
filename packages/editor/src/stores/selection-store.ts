import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/** Marquee (rubber-band) rectangle in mm page coordinates while dragging. */
export interface MarqueeRect {
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
}

// Selection is UI state, not document state: it is never persisted and never
// part of undo history.
export const useSelectionStore = defineStore('pp-selection', () => {
  const selectedIds = ref<Set<string>>(new Set())
  const marquee = ref<MarqueeRect | null>(null)

  const hasSelection = computed(() => selectedIds.value.size > 0)
  const selectionCount = computed(() => selectedIds.value.size)

  function isSelected(id: string): boolean {
    return selectedIds.value.has(id)
  }

  function select(id: string, options: { additive?: boolean } = {}): void {
    if (options.additive) {
      selectedIds.value.add(id)
    }
    else {
      selectedIds.value = new Set([id])
    }
  }

  function toggle(id: string): void {
    if (selectedIds.value.has(id))
      selectedIds.value.delete(id)
    else
      selectedIds.value.add(id)
  }

  function setSelection(ids: Iterable<string>): void {
    selectedIds.value = new Set(ids)
  }

  function clear(): void {
    selectedIds.value = new Set()
  }

  function prune(existingIds: Iterable<string>): void {
    const existing = new Set(existingIds)
    selectedIds.value = new Set([...selectedIds.value].filter(id => existing.has(id)))
  }

  return {
    selectedIds,
    marquee,
    hasSelection,
    selectionCount,
    isSelected,
    select,
    toggle,
    setSelection,
    clear,
    prune,
  }
})

export type SelectionStore = ReturnType<typeof useSelectionStore>
