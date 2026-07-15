// N-up sheet layout (round 21): tile many labels onto one carrier sheet
// (e.g. A4 sticker paper) instead of one page per label. Pure mm math -
// unit-testable, consumed by the sheet composer in render/.

export interface SheetSize {
  widthMm: number
  heightMm: number
}

export interface SheetLayout {
  /** Carrier sheet in the chosen orientation. */
  sheet: SheetSize
  orientation: 'portrait' | 'landscape'
  columns: number
  rowsPerSheet: number
  /** columns x rowsPerSheet - 0 means the label does not fit at all. */
  perSheet: number
  /** Top-left positions (mm) for each cell, row-major. */
  positions: Array<{ xMm: number, yMm: number }>
}

export const SHEET_A4: SheetSize = { widthMm: 210, heightMm: 297 }
/** Printer-safe border around the tiled area. */
export const SHEET_MARGIN_MM = 5
/** Cutting gap between labels. */
export const SHEET_GAP_MM = 2

function layoutFor(labelW: number, labelH: number, sheet: SheetSize, orientation: 'portrait' | 'landscape'): SheetLayout {
  const usableW = sheet.widthMm - SHEET_MARGIN_MM * 2
  const usableH = sheet.heightMm - SHEET_MARGIN_MM * 2
  const columns = labelW <= usableW
    ? Math.floor((usableW + SHEET_GAP_MM) / (labelW + SHEET_GAP_MM))
    : 0
  const rowsPerSheet = labelH <= usableH
    ? Math.floor((usableH + SHEET_GAP_MM) / (labelH + SHEET_GAP_MM))
    : 0

  const positions: Array<{ xMm: number, yMm: number }> = []
  for (let row = 0; row < rowsPerSheet; row++) {
    for (let column = 0; column < columns; column++) {
      positions.push({
        xMm: SHEET_MARGIN_MM + column * (labelW + SHEET_GAP_MM),
        yMm: SHEET_MARGIN_MM + row * (labelH + SHEET_GAP_MM),
      })
    }
  }
  return { sheet, orientation, columns, rowsPerSheet, perSheet: columns * rowsPerSheet, positions }
}

/**
 * Best A4 tiling for a label: tries both orientations and keeps the one
 * that fits more labels per sheet. `perSheet === 0` = label too large.
 */
export function computeSheetLayout(labelWidthMm: number, labelHeightMm: number, sheet: SheetSize = SHEET_A4): SheetLayout {
  const portrait = layoutFor(labelWidthMm, labelHeightMm, sheet, 'portrait')
  const landscape = layoutFor(
    labelWidthMm,
    labelHeightMm,
    { widthMm: sheet.heightMm, heightMm: sheet.widthMm },
    'landscape',
  )
  return landscape.perSheet > portrait.perSheet ? landscape : portrait
}
