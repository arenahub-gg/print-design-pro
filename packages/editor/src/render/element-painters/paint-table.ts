import type { TableElement } from '../../core/schema/elements'
import { computeTableLayout, type TableRowLayout } from '../../core/table-layout'
import { createTableMeasurer } from '../../core/table-measurer'
import { TEXT_FONT_STACK } from '../text-layout'

// Table painter - consumes the SAME computeTableLayout as TableView.vue, so
// print output matches the editor cell for cell. Content is clipped at the
// element box (pagination consumes the overflow in a later round).

export function paintTable(ctx: CanvasRenderingContext2D, element: TableElement): void {
  const layout = computeTableLayout(element, createTableMeasurer(element.fontSizePt))

  ctx.beginPath()
  ctx.rect(0, 0, element.widthMm, element.heightMm)
  ctx.clip()

  // Header background first (borders and text go on top).
  if (layout.header) {
    ctx.fillStyle = element.headerBackground
    ctx.fillRect(0, 0, element.widthMm, layout.header.heightMm)
  }

  // Cell text. Baseline mirrors the text painter: half-leading distribution.
  ctx.fillStyle = '#0f172a'
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const firstBaseline = layout.lineHeightMm * 0.5 + layout.fontSizeMm * 0.3

  const paintRow = (row: TableRowLayout, bold: boolean): void => {
    ctx.font = `${bold ? 700 : 400} ${layout.fontSizeMm}px ${TEXT_FONT_STACK}`
    row.cells.forEach((cell, columnIndex) => {
      const x = layout.columnXs[columnIndex]! + element.cellPaddingMm
      cell.lines.forEach((line, lineIndex) => {
        ctx.fillText(
          line,
          x,
          row.yMm + element.cellPaddingMm + firstBaseline + lineIndex * layout.lineHeightMm,
        )
      })
    })
  }

  if (layout.header)
    paintRow(layout.header, true)
  for (const row of layout.rows)
    paintRow(row, false)

  // Grid borders: horizontal separators + vertical column lines + outer box.
  // Skip entirely for empty content (a header-less, row-less table must not
  // print a stray hairline).
  if (element.borderWidthMm > 0 && layout.contentHeightMm > 0) {
    ctx.strokeStyle = element.borderColor
    ctx.lineWidth = element.borderWidthMm
    ctx.beginPath()

    const bottomMm = Math.min(layout.contentHeightMm, element.heightMm)
    const horizontalYs = [0]
    if (layout.header)
      horizontalYs.push(layout.header.heightMm)
    for (const row of layout.rows)
      horizontalYs.push(row.yMm + row.heightMm)
    for (const y of horizontalYs) {
      if (y <= bottomMm + 0.01) {
        ctx.moveTo(0, y)
        ctx.lineTo(element.widthMm, y)
      }
    }

    for (let index = 0; index <= layout.columnXs.length; index++) {
      const x = index === layout.columnXs.length ? element.widthMm : layout.columnXs[index]!
      ctx.moveTo(x, 0)
      ctx.lineTo(x, bottomMm)
    }

    ctx.stroke()
  }
}
