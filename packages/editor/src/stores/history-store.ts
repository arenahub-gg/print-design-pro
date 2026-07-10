import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Command } from '../core/commands/command'
import { HistoryManager } from '../core/commands/history-manager'

/**
 * Reactive facade over the (plain-class) HistoryManager. A version counter is
 * bumped after every operation so computed state stays in sync without making
 * the manager itself reactive.
 */
export const useHistoryStore = defineStore('pp-history', () => {
  const manager = new HistoryManager()
  const version = ref(0)

  function touch(): void {
    version.value++
  }

  const canUndo = computed(() => {
    void version.value
    return manager.canUndo
  })

  const canRedo = computed(() => {
    void version.value
    return manager.canRedo
  })

  const undoLabel = computed(() => {
    void version.value
    return manager.undoLabel
  })

  const redoLabel = computed(() => {
    void version.value
    return manager.redoLabel
  })

  /** Monotonic edit counter - the app layer keys autosave/dirty checks off it. */
  const editVersion = computed(() => version.value)

  function dispatch(command: Command): void {
    manager.execute(command)
    touch()
  }

  function transact(label: string, fn: () => void): void {
    manager.transact(label, fn)
    touch()
  }

  function undo(): void {
    manager.undo()
    touch()
  }

  function redo(): void {
    manager.redo()
    touch()
  }

  function clear(): void {
    manager.clear()
    touch()
  }

  return { canUndo, canRedo, undoLabel, redoLabel, editVersion, dispatch, transact, undo, redo, clear }
})

export type HistoryStore = ReturnType<typeof useHistoryStore>
