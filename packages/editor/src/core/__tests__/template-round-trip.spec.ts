import { describe, expect, it } from 'vitest'
import type { TextElement } from '../schema/elements'
import { PAGE_PRESETS } from '../schema/page'
import { createEmptyTemplate, newId } from '../schema/template'
import { exportTemplate, importTemplate, parseTemplate } from '../schema/validate'

function makeText(): TextElement {
  return {
    id: newId(),
    type: 'text',
    name: 'Title',
    xMm: 10,
    yMm: 12.5,
    widthMm: 80,
    heightMm: 10,
    rotation: 15,
    locked: false,
    visible: true,
    content: 'Xin chào — hello',
    fontSizePt: 14,
    fontWeight: 700,
    align: 'center',
    color: '#111111',
  }
}

describe('template export/import round-trip', () => {
  it('round-trips losslessly', () => {
    const doc = createEmptyTemplate('Invoice', PAGE_PRESETS.a5)
    doc.elements.push(makeText())
    doc.guides.push({ id: newId(), orientation: 'horizontal', positionMm: 20 })

    const restored = importTemplate(exportTemplate(doc))
    expect(restored).toEqual(doc)
  })

  it('export is deterministic (stable key order)', () => {
    const doc = createEmptyTemplate()
    doc.elements.push(makeText())
    expect(exportTemplate(doc)).toBe(exportTemplate(importTemplate(exportTemplate(doc))))
  })

  it('rejects invalid JSON with a clear error', () => {
    expect(() => importTemplate('{not json')).toThrow('not valid JSON')
  })

  it('rejects schema violations with readable issue paths', () => {
    const doc = createEmptyTemplate()
    doc.elements.push({ ...makeText(), widthMm: -5 })
    let error: unknown
    try {
      parseTemplate(JSON.parse(JSON.stringify(doc)))
    }
    catch (caught) {
      error = caught
    }
    expect(error).toBeDefined()
    const zodError = error as { issues: Array<{ path: Array<string | number> }> }
    expect(zodError.issues[0]?.path).toEqual(['elements', 0, 'widthMm'])
  })

  it('rejects duplicate element ids on import', () => {
    const doc = createEmptyTemplate()
    const text = makeText()
    doc.elements.push(text, { ...makeText(), id: text.id })
    let error: unknown
    try {
      parseTemplate(JSON.parse(exportTemplate(doc)))
    }
    catch (caught) {
      error = caught
    }
    const zodError = error as { issues: Array<{ path: Array<string | number>, message: string }> }
    expect(zodError.issues[0]?.path).toEqual(['elements', 1, 'id'])
    expect(zodError.issues[0]?.message).toContain('Duplicate')
  })

  it('rejects unknown schema versions', () => {
    const doc = JSON.parse(exportTemplate(createEmptyTemplate())) as Record<string, unknown>
    doc.schemaVersion = 99
    expect(() => parseTemplate(doc)).toThrow()
  })
})
