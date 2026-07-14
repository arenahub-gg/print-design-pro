import { describe, expect, it } from 'vitest'
import { CsvParseError, parseCsv } from '../csv'
import { createBarcode, createQr, createTable, createText } from '../element-factories'
import { createEmptyTemplate } from '../schema/template'
import { parseTemplate } from '../schema/validate'
import { collectVariables, resolveDocument, substituteVariables } from '../variables'

describe('substituteVariables', () => {
  it('replaces known tokens and tolerates inner whitespace', () => {
    expect(substituteVariables('Hi {{name}}, order {{ order-id }}!', { 'name': 'An', 'order-id': '42' }))
      .toBe('Hi An, order 42!')
  })

  it('keeps unknown tokens raw (visible beats silent blanks)', () => {
    expect(substituteVariables('Hi {{name}}', {})).toBe('Hi {{name}}')
  })

  it('substitutes empty-string values (unlike unknown ones)', () => {
    expect(substituteVariables('[{{note}}]', { note: '' })).toBe('[]')
  })

  it('ignores malformed tokens', () => {
    expect(substituteVariables('{{ bad name }} {{}}', { 'bad name': 'x' }))
      .toBe('{{ bad name }} {{}}')
  })

  it('never substitutes inherited prototype keys', () => {
    // {{constructor}} must keep its raw token - not print "function Object..."
    expect(substituteVariables('{{constructor}} {{toString}} {{__proto__}}', {}))
      .toBe('{{constructor}} {{toString}} {{__proto__}}')
    // ...but an OWN key with such a name still substitutes
    expect(substituteVariables('{{constructor}}', { constructor: 'ok' } as Record<string, string>))
      .toBe('ok')
  })
})

describe('collectVariables', () => {
  it('scans text, qr, barcode and table strings in first-appearance order', () => {
    const doc = createEmptyTemplate()
    const table = createTable({ centerXMm: 50, centerYMm: 50 })
    table.columns[0]!.title = '{{col}}'
    table.rows = [['{{cell}}', '', '']]
    doc.elements.push(
      createText({ centerXMm: 10, centerYMm: 10 }, 'To: {{name}} / {{name}}'),
      createQr({ centerXMm: 30, centerYMm: 30 }, 'https://x.vn/{{tracking}}'),
      createBarcode({ centerXMm: 60, centerYMm: 60 }, '{{tracking}}'),
      table,
    )
    expect(collectVariables(doc)).toEqual(['name', 'tracking', 'col', 'cell'])
  })

  it('returns empty for a document without tokens', () => {
    expect(collectVariables(createEmptyTemplate())).toEqual([])
  })
})

describe('resolveDocument', () => {
  it('merges sample values under row data and leaves the original untouched', () => {
    const doc = createEmptyTemplate()
    doc.variables = { name: 'SAMPLE', city: 'Hanoi' }
    doc.elements.push(createText({ centerXMm: 10, centerYMm: 10 }, '{{name}} - {{city}}'))

    const resolved = resolveDocument(doc, { name: 'Binh' })
    expect((resolved.elements[0] as { content: string }).content).toBe('Binh - Hanoi')
    expect((doc.elements[0] as { content: string }).content).toBe('{{name}} - {{city}}')
  })

  it('substitutes qr/barcode content and table cells + titles', () => {
    const doc = createEmptyTemplate()
    doc.variables = { v: 'X' }
    const table = createTable({ centerXMm: 50, centerYMm: 50 })
    table.columns[0]!.title = 'T {{v}}'
    table.rows = [['c {{v}}', '', '']]
    doc.elements.push(createQr({ centerXMm: 30, centerYMm: 30 }, 'q-{{v}}'), table)

    const resolved = resolveDocument(doc)
    expect((resolved.elements[0] as { content: string }).content).toBe('q-X')
    const resolvedTable = resolved.elements[1] as { columns: Array<{ title: string }>, rows: string[][] }
    expect(resolvedTable.columns[0]!.title).toBe('T X')
    expect(resolvedTable.rows[0]![0]).toBe('c X')
  })
})

describe('parseCsv', () => {
  it('parses headers + rows with quoted commas, escaped quotes and newlines', () => {
    const csv = 'name,address,note\r\n"Ng, An","12 ""A"" St",line1\nBinh,"multi\nline",'
    expect(parseCsv(csv)).toEqual({
      headers: ['name', 'address', 'note'],
      rows: [
        { name: 'Ng, An', address: '12 "A" St', note: 'line1' },
        { name: 'Binh', address: 'multi\nline', note: '' },
      ],
    })
  })

  it('skips blank lines and pads short rows with empty strings', () => {
    const csv = 'a,b\n1\n\n2,3\n'
    expect(parseCsv(csv).rows).toEqual([{ a: '1', b: '' }, { a: '2', b: '3' }])
  })

  it('strips the Excel UTF-8 BOM even before a quoted first header', () => {
    const csv = '﻿"name",city\nAn,Hue'
    expect(parseCsv(csv)).toEqual({
      headers: ['name', 'city'],
      rows: [{ name: 'An', city: 'Hue' }],
    })
  })

  it('treats a __proto__ column as plain data (null-prototype records)', () => {
    const { rows } = parseCsv('__proto__,x\npayload,1')
    expect(rows[0]!.__proto__).toBe('payload')
    expect(rows[0]!.x).toBe('1')
    expect(substituteVariables('{{__proto__}}', rows[0]!)).toBe('payload')
  })

  it('throws readable errors on unterminated quotes and empty input', () => {
    expect(() => parseCsv('a,b\n"oops')).toThrow(CsvParseError)
    expect(() => parseCsv('\n\n')).toThrow('CSV is empty')
    expect(() => parseCsv('a,,c\n1,2,3')).toThrow('empty column name')
  })
})

describe('schema migration', () => {
  it('defaults variables for pre-round-13 documents', () => {
    const legacy = JSON.parse(JSON.stringify(createEmptyTemplate())) as Record<string, unknown>
    delete legacy.variables
    expect(parseTemplate(legacy).variables).toEqual({})
  })

  it('defaults fontFamily for pre-round-15 text elements', () => {
    const doc = createEmptyTemplate()
    doc.elements.push(createText({ centerXMm: 10, centerYMm: 10 }))
    const legacy = JSON.parse(JSON.stringify(doc)) as { elements: Array<Record<string, unknown>> }
    delete legacy.elements[0]!.fontFamily
    expect(parseTemplate(legacy).elements[0]).toMatchObject({ fontFamily: '' })
  })
})
