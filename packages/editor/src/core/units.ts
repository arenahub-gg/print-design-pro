// Unit conversion between document space (millimetres) and screen space
// (CSS pixels). The document NEVER stores pixels - mm is the single source of
// truth so print output stays exact regardless of zoom or display DPI.

export const MM_PER_INCH = 25.4

/** CSS reference pixel density - 96px per inch by spec. */
export const CSS_DPI = 96

const PX_PER_MM = CSS_DPI / MM_PER_INCH

export function mmToPx(mm: number, zoom = 1): number {
  return mm * PX_PER_MM * zoom
}

export function pxToMm(px: number, zoom = 1): number {
  return px / (PX_PER_MM * zoom)
}

/**
 * Round to 0.1mm - applied at command boundaries so gesture math (which runs
 * in float px) never accumulates drift into the stored document.
 */
export function roundMm(mm: number): number {
  // `+ 0` normalizes -0 (which would export as "0" but fail strict equality)
  return Math.round(mm * 10) / 10 + 0
}
