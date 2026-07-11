import { z } from 'zod'

// Element schemas. All geometry in mm, rotation in degrees (clockwise).
// Paint/z-order is the position in the document's `elements` array - there is
// deliberately NO zIndex field so ordering has a single source of truth.

const baseElementSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  xMm: z.number(),
  yMm: z.number(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  rotation: z.number(),
  locked: z.boolean(),
  visible: z.boolean(),
})

export const rectElementSchema = baseElementSchema.extend({
  type: z.literal('rect'),
  fillColor: z.string(),
  strokeColor: z.string(),
  strokeWidthMm: z.number().min(0),
  cornerRadiusMm: z.number().min(0),
})

export const lineElementSchema = baseElementSchema.extend({
  type: z.literal('line'),
  strokeColor: z.string(),
  strokeWidthMm: z.number().positive(),
})

export const circleElementSchema = baseElementSchema.extend({
  type: z.literal('circle'),
  fillColor: z.string(),
  strokeColor: z.string(),
  strokeWidthMm: z.number().min(0),
})

export const textElementSchema = baseElementSchema.extend({
  type: z.literal('text'),
  content: z.string(),
  fontSizePt: z.number().positive(),
  fontWeight: z.union([z.literal(400), z.literal(700)]),
  align: z.enum(['left', 'center', 'right']),
  color: z.string(),
})

export const imageElementSchema = baseElementSchema.extend({
  type: z.literal('image'),
  /** Data URL - documents stay self-contained (local-first). */
  src: z.string(),
})

export const qrElementSchema = baseElementSchema.extend({
  type: z.literal('qr'),
  content: z.string(),
  /** Error-correction level - higher survives more print damage. */
  ecLevel: z.enum(['L', 'M', 'Q', 'H']),
  color: z.string(),
  backgroundColor: z.string(),
})

export const BARCODE_FORMATS = ['CODE128', 'EAN13', 'EAN8', 'CODE39', 'ITF14', 'UPC'] as const

export const barcodeElementSchema = baseElementSchema.extend({
  type: z.literal('barcode'),
  content: z.string(),
  format: z.enum(BARCODE_FORMATS),
  /** Render the human-readable value under the bars. */
  showText: z.boolean(),
  lineColor: z.string(),
})

export const tableColumnSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  /** Relative WEIGHT - normalized to the element's widthMm at layout time. */
  widthMm: z.number().positive(),
})

export const tableElementSchema = baseElementSchema.extend({
  type: z.literal('table'),
  columns: z.array(tableColumnSchema).min(1),
  /** rows[r][c]; ragged rows are legal - missing cells read as ''. */
  rows: z.array(z.array(z.string())),
  fontSizePt: z.number().positive(),
  showHeader: z.boolean(),
  headerBackground: z.string(),
  borderColor: z.string(),
  borderWidthMm: z.number().min(0),
  cellPaddingMm: z.number().min(0),
}).superRefine((table, ctx) => {
  const seen = new Set<string>()
  table.columns.forEach((column, index) => {
    if (seen.has(column.id))
      ctx.addIssue({ code: 'custom', path: ['columns', index, 'id'], message: 'Duplicate column id' })
    seen.add(column.id)
  })
})

export const elementSchema = z.discriminatedUnion('type', [
  tableElementSchema,
  rectElementSchema,
  lineElementSchema,
  circleElementSchema,
  textElementSchema,
  imageElementSchema,
  qrElementSchema,
  barcodeElementSchema,
])

export type RectElement = z.infer<typeof rectElementSchema>
export type LineElement = z.infer<typeof lineElementSchema>
export type CircleElement = z.infer<typeof circleElementSchema>
export type TextElement = z.infer<typeof textElementSchema>
export type ImageElement = z.infer<typeof imageElementSchema>
export type QrElement = z.infer<typeof qrElementSchema>
export type BarcodeElement = z.infer<typeof barcodeElementSchema>
export type TableColumn = z.infer<typeof tableColumnSchema>
export type TableElement = z.infer<typeof tableElementSchema>
export type BarcodeFormat = (typeof BARCODE_FORMATS)[number]
export type TemplateElement = z.infer<typeof elementSchema>
export type ElementType = TemplateElement['type']

/**
 * Partial update payload for an element. Distributes over the union so a
 * patch may carry any subset of that element type's own props; `id` and
 * `type` are immutable.
 */
export type ElementPatch = TemplateElement extends infer T
  ? T extends TemplateElement
    ? Partial<Omit<T, 'id' | 'type'>>
    : never
  : never
