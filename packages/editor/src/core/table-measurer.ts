import { TEXT_FONT_STACK } from '../render/text-layout'
import type { TableMeasurer } from './table-layout'
import { MM_PER_INCH } from './units'

// Canvas-2d text measurer shared by the DOM table view AND the print
// painter: both lay out with identical metrics, which is the whole point.
// One hidden canvas is reused across all measurers.

let sharedContext: CanvasRenderingContext2D | null = null

function context(): CanvasRenderingContext2D {
  if (!sharedContext) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx)
      throw new Error('Canvas 2D context unavailable for text measuring')
    sharedContext = ctx
  }
  return sharedContext
}

/**
 * Measurer for a table's font size. Widths are returned in mm: the context
 * measures at `fontSizePx = fontSizeMm` (px-per-unit = 1), so measured px
 * equal mm directly.
 */
export function createTableMeasurer(fontSizePt: number): TableMeasurer {
  const fontSizeMm = (fontSizePt * MM_PER_INCH) / 72
  return {
    measure: (text, bold) => {
      const ctx = context()
      ctx.font = `${bold ? 700 : 400} ${fontSizeMm}px ${TEXT_FONT_STACK}`
      return ctx.measureText(text).width
    },
  }
}
