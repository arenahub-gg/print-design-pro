import type { TableElement } from './schema/elements'
import { TEXT_LINE_HEIGHT } from '../render/text-layout'
import { wrapText } from '../render/text-layout'
import { MM_PER_INCH } from './units'

// THE single table layout function. Both the DOM view and the print painter
// consume its output, so editor and paper agree by construction - the same
// principle the text renderer follows, applied to the hardest element.
//
// All outputs are mm in the element's local space (0,0 = top-left).
// Column `widthMm` values are treated as WEIGHTS normalized to the element
// width: resizing the element just works, no per-type gesture logic.

export interface TableMeasurer {
  /** Text width in mm at the table's font size; bold covers the header row. */
  measure: (text: string, bold: boolean) => number
}

export interface TableCellLayout {
  lines: string[]
}

export interface TableRowLayout {
  yMm: number
  heightMm: number
  cells: TableCellLayout[]
}

export interface TableLayout {
  /** Per-column x offsets (left edge) and normalized widths. */
  columnXs: number[]
  columnWidths: number[]
  /** Header layout; null when showHeader is false. */
  header: TableRowLayout | null
  rows: TableRowLayout[]
  /** Full content height - may exceed the element's heightMm (clipped view). */
  contentHeightMm: number
  lineHeightMm: number
  fontSizeMm: number
}

export function ptToMm(pt: number): number {
  return (pt * MM_PER_INCH) / 72
}

export function computeTableLayout(table: TableElement, measurer: TableMeasurer): TableLayout {
  const fontSizeMm = ptToMm(table.fontSizePt)
  const lineHeightMm = fontSizeMm * TEXT_LINE_HEIGHT
  const padding = table.cellPaddingMm

  // Normalize weights to the element width.
  const totalWeight = table.columns.reduce((sum, column) => sum + column.widthMm, 0) || 1
  const columnWidths = table.columns.map(column => (column.widthMm / totalWeight) * table.widthMm)
  const columnXs: number[] = []
  let x = 0
  for (const width of columnWidths) {
    columnXs.push(x)
    x += width
  }

  const wrapCell = (content: string, columnIndex: number, bold: boolean): TableCellLayout => ({
    lines: wrapText(content, Math.max(1, columnWidths[columnIndex]! - padding * 2), {
      measure: text => measurer.measure(text, bold),
    }),
  })

  const layoutRow = (cells: string[], yMm: number, bold: boolean): TableRowLayout => {
    const cellLayouts = table.columns.map((_, columnIndex) =>
      wrapCell(cells[columnIndex] ?? '', columnIndex, bold),
    )
    const maxLines = Math.max(1, ...cellLayouts.map(cell => cell.lines.length))
    return {
      yMm,
      heightMm: maxLines * lineHeightMm + padding * 2,
      cells: cellLayouts,
    }
  }

  let cursorY = 0
  const header = table.showHeader
    ? layoutRow(table.columns.map(column => column.title), 0, true)
    : null
  if (header)
    cursorY = header.heightMm

  const rows: TableRowLayout[] = []
  for (const row of table.rows) {
    const rowLayout = layoutRow(row, cursorY, false)
    rows.push(rowLayout)
    cursorY += rowLayout.heightMm
  }

  return {
    columnXs,
    columnWidths,
    header,
    rows,
    contentHeightMm: cursorY,
    lineHeightMm,
    fontSizeMm,
  }
}
