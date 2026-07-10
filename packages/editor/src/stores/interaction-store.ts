import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { ElementPatch, TemplateElement } from '../core/schema/elements'

/**
 * Transient gesture state. During a drag/resize/rotate the document is NOT
 * mutated - renderers merge these preview patches on top of schema state,
 * and the gesture commits one undoable command on release. Never persisted.
 */
export const useInteractionStore = defineStore('pp-interaction', () => {
  /** Geometry overrides per element id while a gesture is live. */
  const previewPatches = shallowRef<ReadonlyMap<string, ElementPatch>>(new Map())
  /** Snap lines to render while a gesture is live (mm). */
  const activeSnapVertical = ref<number | null>(null)
  const activeSnapHorizontal = ref<number | null>(null)
  /** Marquee rect in page mm while rubber-band selecting. */
  const marquee = ref<{ xMm: number, yMm: number, widthMm: number, heightMm: number } | null>(null)

  const hasPreview = computed(() => previewPatches.value.size > 0)

  function setPreview(patches: Map<string, ElementPatch>): void {
    previewPatches.value = patches
  }

  function setSnapLines(vertical: number | null, horizontal: number | null): void {
    activeSnapVertical.value = vertical
    activeSnapHorizontal.value = horizontal
  }

  function clearGesture(): void {
    previewPatches.value = new Map()
    activeSnapVertical.value = null
    activeSnapHorizontal.value = null
  }

  /** Element geometry with any live preview merged in. */
  function effectiveElement<T extends TemplateElement>(element: T): T {
    const patch = previewPatches.value.get(element.id)
    return patch ? { ...element, ...patch } : element
  }

  return {
    previewPatches,
    activeSnapVertical,
    activeSnapHorizontal,
    marquee,
    hasPreview,
    setPreview,
    setSnapLines,
    clearGesture,
    effectiveElement,
  }
})

export type InteractionStore = ReturnType<typeof useInteractionStore>
