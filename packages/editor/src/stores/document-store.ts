import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { isExecutingCommand } from '../core/commands/history-manager'
import type { ElementPatch, TemplateElement } from '../core/schema/elements'
import type { PageSettings } from '../core/schema/page'
import { createEmptyTemplate, type Guide, type TemplateDocument } from '../core/schema/template'

/**
 * Holds the open template document. All `_`-prefixed mutators are internal:
 * they must only be called from commands (enforced in dev via the history
 * manager's execution flag) so every change is undoable by construction.
 * `loadTemplate` is the single intentional bypass (opening a document is not
 * an undoable edit - callers must clear history alongside it).
 */
export const useDocumentStore = defineStore('pp-document', () => {
  const document = ref<TemplateDocument>(createEmptyTemplate())

  const page = computed(() => document.value.page)
  const elements = computed(() => document.value.elements)
  const guides = computed(() => document.value.guides)

  function getElementById(id: string): TemplateElement | undefined {
    return document.value.elements.find(element => element.id === id)
  }

  function getElementIndex(id: string): number {
    return document.value.elements.findIndex(element => element.id === id)
  }

  /**
   * Replace the open document. Not undoable by design - use the exported
   * `openTemplate()` helper, which also clears history and selection, instead
   * of calling this directly.
   */
  function loadTemplate(doc: TemplateDocument): void {
    document.value = doc
  }

  function assertCommandContext(): void {
    if (import.meta.env.DEV && !isExecutingCommand()) {
      throw new Error(
        'Document mutated outside a command - dispatch through the history store so the change is undoable',
      )
    }
  }

  function _rename(name: string): void {
    assertCommandContext()
    document.value.name = name
  }

  function _insertElement(element: TemplateElement, index: number): void {
    assertCommandContext()
    document.value.elements.splice(index, 0, element)
  }

  function _removeElement(id: string): void {
    assertCommandContext()
    const index = getElementIndex(id)
    if (index !== -1)
      document.value.elements.splice(index, 1)
  }

  function _updateElement(id: string, patch: ElementPatch): void {
    assertCommandContext()
    const element = getElementById(id)
    if (element)
      Object.assign(element, patch)
  }

  function _moveElement(id: string, toIndex: number): void {
    assertCommandContext()
    const fromIndex = getElementIndex(id)
    if (fromIndex === -1)
      return
    const [element] = document.value.elements.splice(fromIndex, 1)
    document.value.elements.splice(toIndex, 0, element!)
  }

  function _setPage(settings: PageSettings): void {
    assertCommandContext()
    document.value.page = { ...settings }
  }

  function _insertGuide(guide: Guide): void {
    assertCommandContext()
    document.value.guides.push(guide)
  }

  function _removeGuide(id: string): void {
    assertCommandContext()
    const index = document.value.guides.findIndex(guide => guide.id === id)
    if (index !== -1)
      document.value.guides.splice(index, 1)
  }

  function _updateGuide(id: string, positionMm: number): void {
    assertCommandContext()
    const guide = document.value.guides.find(entry => entry.id === id)
    if (guide)
      guide.positionMm = positionMm
  }

  return {
    document,
    page,
    elements,
    guides,
    getElementById,
    getElementIndex,
    loadTemplate,
    _rename,
    _insertElement,
    _removeElement,
    _updateElement,
    _moveElement,
    _setPage,
    _insertGuide,
    _removeGuide,
    _updateGuide,
  }
})

export type DocumentStore = ReturnType<typeof useDocumentStore>
