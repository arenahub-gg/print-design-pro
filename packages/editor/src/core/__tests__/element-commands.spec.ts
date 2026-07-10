import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import {
  addElementCommand,
  addGuideCommand,
  moveGuideCommand,
  removeElementsCommand,
  removeGuideCommand,
  renameTemplateCommand,
  reorderElementCommand,
  setPageSettingsCommand,
  updateElementsCommand,
} from '../commands/element-commands'
import type { RectElement } from '../schema/elements'
import { PAGE_PRESETS } from '../schema/page'
import { newId, type Guide } from '../schema/template'

function makeRect(overrides: Partial<RectElement> = {}): RectElement {
  return {
    id: newId(),
    type: 'rect',
    name: 'Rect',
    xMm: 10,
    yMm: 10,
    widthMm: 40,
    heightMm: 20,
    rotation: 0,
    locked: false,
    visible: true,
    fillColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidthMm: 0.5,
    cornerRadiusMm: 0,
    ...overrides,
  }
}

describe('element commands through history store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('add + undo + redo', () => {
    const doc = useDocumentStore()
    const history = useHistoryStore()
    const rect = makeRect()

    history.dispatch(addElementCommand(doc, rect))
    expect(doc.elements).toHaveLength(1)

    history.undo()
    expect(doc.elements).toHaveLength(0)

    history.redo()
    expect(doc.elements).toHaveLength(1)
    expect(doc.getElementById(rect.id)?.type).toBe('rect')
  })

  it('rejects direct store mutation outside a command (dev guard)', () => {
    const doc = useDocumentStore()
    expect(() => doc._insertElement(makeRect(), 0)).toThrow('outside a command')
  })

  it('remove restores elements at their original indices on undo', () => {
    const doc = useDocumentStore()
    const history = useHistoryStore()
    const [a, b, c] = [makeRect({ name: 'a' }), makeRect({ name: 'b' }), makeRect({ name: 'c' })]
    for (const el of [a, b, c])
      history.dispatch(addElementCommand(doc, el))

    history.dispatch(removeElementsCommand(doc, [a.id, c.id]))
    expect(doc.elements.map(e => e.name)).toEqual(['b'])

    history.undo()
    expect(doc.elements.map(e => e.name)).toEqual(['a', 'b', 'c'])
  })

  it('update patches props and undo restores exact prior values', () => {
    const doc = useDocumentStore()
    const history = useHistoryStore()
    const rect = makeRect({ xMm: 5, yMm: 5 })
    history.dispatch(addElementCommand(doc, rect))

    history.dispatch(updateElementsCommand(doc, [{ id: rect.id, patch: { xMm: 50, yMm: 60 } }]))
    const updated = doc.getElementById(rect.id)!
    expect(updated.xMm).toBe(50)
    expect(updated.yMm).toBe(60)

    history.undo()
    const reverted = doc.getElementById(rect.id)!
    expect(reverted.xMm).toBe(5)
    expect(reverted.yMm).toBe(5)
  })

  it('a transaction groups multi-element drag into one undo step', () => {
    const doc = useDocumentStore()
    const history = useHistoryStore()
    const a = makeRect({ name: 'a' })
    const b = makeRect({ name: 'b' })
    history.dispatch(addElementCommand(doc, a))
    history.dispatch(addElementCommand(doc, b))

    history.transact('Move 2 elements', () => {
      history.dispatch(updateElementsCommand(doc, [{ id: a.id, patch: { xMm: 100 } }]))
      history.dispatch(updateElementsCommand(doc, [{ id: b.id, patch: { xMm: 120 } }]))
    })

    history.undo()
    expect(doc.getElementById(a.id)?.xMm).toBe(10)
    expect(doc.getElementById(b.id)?.xMm).toBe(10)
    // Only the transaction was undone - the two adds remain.
    expect(doc.elements).toHaveLength(2)
  })

  it('reorder moves paint order and undoes to original index', () => {
    const doc = useDocumentStore()
    const history = useHistoryStore()
    const [a, b, c] = [makeRect({ name: 'a' }), makeRect({ name: 'b' }), makeRect({ name: 'c' })]
    for (const el of [a, b, c])
      history.dispatch(addElementCommand(doc, el))

    history.dispatch(reorderElementCommand(doc, a.id, 2))
    expect(doc.elements.map(e => e.name)).toEqual(['b', 'c', 'a'])

    history.undo()
    expect(doc.elements.map(e => e.name)).toEqual(['a', 'b', 'c'])
  })

  it('page settings swap and undo', () => {
    const doc = useDocumentStore()
    const history = useHistoryStore()
    expect(doc.page.widthMm).toBe(210)

    history.dispatch(setPageSettingsCommand(doc, PAGE_PRESETS.label100x150))
    expect(doc.page.widthMm).toBe(100)

    history.undo()
    expect(doc.page.widthMm).toBe(210)
  })

  it('add→update→remove→undo×3→redo keeps document consistent with history (no shared-reference corruption)', () => {
    const doc = useDocumentStore()
    const history = useHistoryStore()
    const rect = makeRect({ xMm: 10 })

    history.dispatch(addElementCommand(doc, rect))
    history.dispatch(updateElementsCommand(doc, [{ id: rect.id, patch: { xMm: 50 } }]))
    history.dispatch(removeElementsCommand(doc, [rect.id]))

    history.undo() // un-remove -> x=50
    history.undo() // un-update -> x=10
    history.undo() // un-add -> empty
    expect(doc.elements).toHaveLength(0)

    history.redo() // re-add: must restore ORIGINAL add payload (x=10)
    expect(doc.getElementById(rect.id)?.xMm).toBe(10)

    history.redo() // re-update -> x=50
    expect(doc.getElementById(rect.id)?.xMm).toBe(50)

    history.redo() // re-remove
    expect(doc.elements).toHaveLength(0)

    // Full rewind still lands on pristine state.
    history.undo()
    history.undo()
    history.undo()
    expect(doc.elements).toHaveLength(0)
  })

  it('cross-variant patch keys are ignored (no phantom properties)', () => {
    const doc = useDocumentStore()
    const history = useHistoryStore()
    const rect = makeRect()
    history.dispatch(addElementCommand(doc, rect))

    // content/fontSizePt belong to text elements - must not stick to a rect.
    history.dispatch(updateElementsCommand(doc, [
      { id: rect.id, patch: { xMm: 99, content: 'nope', fontSizePt: 12 } as never },
    ]))
    const element = doc.getElementById(rect.id)!
    expect(element.xMm).toBe(99)
    expect('content' in element).toBe(false)

    history.undo()
    const reverted = doc.getElementById(rect.id)!
    expect(reverted.xMm).toBe(10)
    expect('content' in reverted).toBe(false)
  })

  it('rename template is undoable and ticks edit version', () => {
    const doc = useDocumentStore()
    const history = useHistoryStore()
    const versionBefore = history.editVersion

    history.dispatch(renameTemplateCommand(doc, 'Shipping label'))
    expect(doc.document.name).toBe('Shipping label')
    expect(history.editVersion).toBeGreaterThan(versionBefore)

    history.undo()
    expect(doc.document.name).toBe('Untitled template')
  })

  it('guide add/move/remove are each undoable', () => {
    const doc = useDocumentStore()
    const history = useHistoryStore()
    const guide: Guide = { id: newId(), orientation: 'vertical', positionMm: 30 }

    history.dispatch(addGuideCommand(doc, guide))
    history.dispatch(moveGuideCommand(doc, guide.id, 55))
    expect(doc.guides[0]?.positionMm).toBe(55)

    history.dispatch(removeGuideCommand(doc, guide.id))
    expect(doc.guides).toHaveLength(0)

    history.undo() // un-remove
    expect(doc.guides[0]?.positionMm).toBe(55)
    history.undo() // un-move
    expect(doc.guides[0]?.positionMm).toBe(30)
    history.undo() // un-add
    expect(doc.guides).toHaveLength(0)
  })
})
