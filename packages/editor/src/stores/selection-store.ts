import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// Selection is UI state, not document state: it is never persisted and never
// part of undo history. (Marquee state lives in the interaction store.)
export const useSelectionStore = defineStore('pp-selection', () => {
  const selectedIds = ref<Set<string>>(new Set())

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
