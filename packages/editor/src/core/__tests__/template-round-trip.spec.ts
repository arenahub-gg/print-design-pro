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
    fontFamily: '',
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

  it('round-trips qr, barcode, and image elements', async () => {
    const { createBarcode, createImage, createQr } = await import('../element-factories')
    const doc = createEmptyTemplate()
    doc.elements.push(
      createQr({ centerXMm: 30, centerYMm: 30 }, 'https://pro.print/vi?x=1'),
      createBarcode({ centerXMm: 60, centerYMm: 60 }, '4006381333931'),
      createImage({ centerXMm: 90, centerYMm: 90 }, 'data:image/png;base64,AAA', 1.5),
    )
    const restored = importTemplate(exportTemplate(doc))
    expect(restored).toEqual(doc)
  })

  it('round-trips a table element', async () => {
    const { createTable } = await import('../element-factories')
    const doc = createEmptyTemplate()
    doc.elements.push(createTable({ centerXMm: 100, centerYMm: 100 }))
    const restored = importTemplate(exportTemplate(doc))
    expect(restored).toEqual(doc)
  })

  it('round-trips shape elements and stroke/cap styles', async () => {
    const { createLine, createShape } = await import('../element-factories')
    const doc = createEmptyTemplate()
    const star = createShape({ centerXMm: 40, centerYMm: 40 }, 'star')
    star.strokeStyle = 'dashed'
    const line = createLine({ centerXMm: 80, centerYMm: 80 })
    line.strokeStyle = 'dotted'
    line.endCap = 'arrow'
    doc.elements.push(star, line)
    const restored = importTemplate(exportTemplate(doc))
    expect(restored).toEqual(doc)
  })

  it('applies stroke defaults to documents saved before round 6', () => {
    // Legacy rect/line lack strokeStyle/startCap/endCap entirely.
    const doc = JSON.parse(exportTemplate(createEmptyTemplate())) as {
      elements: Array<Record<string, unknown>>
    }
    doc.elements.push(
      {
        id: newId(),
        type: 'rect',
        name: 'Old rect',
        xMm: 5,
        yMm: 5,
        widthMm: 20,
        heightMm: 10,
        rotation: 0,
        locked: false,
        visible: true,
        fillColor: '#fff',
        strokeColor: '#000',
        strokeWidthMm: 0.4,
        cornerRadiusMm: 0,
      },
      {
        id: newId(),
        type: 'line',
        name: 'Old line',
        xMm: 5,
        yMm: 30,
        widthMm: 40,
        heightMm: 4,
        rotation: 0,
        locked: false,
        visible: true,
        strokeColor: '#000',
        strokeWidthMm: 0.5,
      },
    )
    const parsed = parseTemplate(doc)
    expect(parsed.elements[0]).toMatchObject({ strokeStyle: 'solid' })
    expect(parsed.elements[1]).toMatchObject({ strokeStyle: 'solid', startCap: 'none', endCap: 'none' })
  })

  it('rejects duplicate table column ids', async () => {
    const { createTable } = await import('../element-factories')
    const doc = createEmptyTemplate()
    const table = createTable({ centerXMm: 50, centerYMm: 50 })
    table.columns[1]!.id = table.columns[0]!.id
    doc.elements.push(table)
    expect(() => parseTemplate(JSON.parse(JSON.stringify(doc)))).toThrow()
  })

  it('rejects unknown barcode formats', async () => {
    const { createBarcode } = await import('../element-factories')
    const doc = createEmptyTemplate()
    const barcode = createBarcode({ centerXMm: 30, centerYMm: 30 })
    doc.elements.push({ ...barcode, format: 'QRQR' as never })
    expect(() => parseTemplate(JSON.parse(JSON.stringify(doc)))).toThrow()
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
