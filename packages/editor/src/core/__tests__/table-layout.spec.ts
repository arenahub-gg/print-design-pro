import { describe, expect, it } from 'vitest'
import { createTable } from '../element-factories'
import type { TableElement } from '../schema/elements'
import { computeTableLayout, ptToMm, type TableMeasurer } from '../table-layout'
import { TEXT_LINE_HEIGHT } from '../../render/text-layout'

// 2mm per char, bold 10% wider - deterministic width model.
const mono: TableMeasurer = {
  measure: (text, bold) => text.length * 2 * (bold ? 1.1 : 1),
}

function makeTable(overrides: Partial<TableElement> = {}): TableElement {
  const table = createTable({ centerXMm: 50, centerYMm: 50 })
  return { ...table, ...overrides }
}

describe('computeTableLayout', () => {
  it('normalizes column weights to the element width', () => {
    const table = makeTable({ widthMm: 80 })
    // factory weights 50/20/30 -> total 100 -> 40/16/24 at 80mm
    const layout = computeTableLayout(table, mono)
    expect(layout.columnWidths[0]).toBeCloseTo(40, 6)
    expect(layout.columnWidths[1]).toBeCloseTo(16, 6)
    expect(layout.columnWidths[2]).toBeCloseTo(24, 6)
    expect(layout.columnXs).toEqual([0, 40, 56])
  })

  it('single-line rows get lineHeight + 2*padding', () => {
    const table = makeTable({ rows: [['a', 'b', 'c']], cellPaddingMm: 1.5, fontSizePt: 10 })
    const layout = computeTableLayout(table, mono)
    const lineHeight = ptToMm(10) * TEXT_LINE_HEIGHT
    expect(layout.rows[0]!.heightMm).toBeCloseTo(lineHeight + 3, 6)
  })

  it('row height grows with the tallest wrapped cell', () => {
    const table = makeTable({
      widthMm: 60, // cols 30/12/18; minus padding 3 -> 27/9/15mm usable
      rows: [['aaaaaaaaaaaaaaaaaaaaaaaa', 'b', 'c']], // 24 chars * 2mm = 48mm -> wraps in 27mm
    })
    const layout = computeTableLayout(table, mono)
    expect(layout.rows[0]!.cells[0]!.lines.length).toBeGreaterThan(1)
    const lines = layout.rows[0]!.cells[0]!.lines.length
    expect(layout.rows[0]!.heightMm).toBeCloseTo(lines * layout.lineHeightMm + 3, 6)
  })

  it('ragged rows read missing cells as empty strings', () => {
    const table = makeTable({ rows: [['only-first']] })
    const layout = computeTableLayout(table, mono)
    expect(layout.rows[0]!.cells).toHaveLength(3)
    expect(layout.rows[0]!.cells[1]!.lines).toEqual([''])
  })

  it('header uses bold metrics and stacks rows beneath it', () => {
    const table = makeTable({ rows: [['a', 'b', 'c'], ['d', 'e', 'f']] })
    const layout = computeTableLayout(table, mono)
    expect(layout.header).not.toBeNull()
    expect(layout.rows[0]!.yMm).toBeCloseTo(layout.header!.heightMm, 6)
    expect(layout.rows[1]!.yMm).toBeCloseTo(layout.header!.heightMm + layout.rows[0]!.heightMm, 6)
    expect(layout.contentHeightMm).toBeCloseTo(
      layout.header!.heightMm + layout.rows[0]!.heightMm + layout.rows[1]!.heightMm,
      6,
    )
  })

  it('showHeader false starts rows at 0', () => {
    const table = makeTable({ showHeader: false, rows: [['a', 'b', 'c']] })
    const layout = computeTableLayout(table, mono)
    expect(layout.header).toBeNull()
    expect(layout.rows[0]!.yMm).toBe(0)
  })

  it('empty rows with header-only content height equals header height', () => {
    const table = makeTable({ rows: [] })
    const layout = computeTableLayout(table, mono)
    expect(layout.contentHeightMm).toBeCloseTo(layout.header!.heightMm, 6)
  })
})
