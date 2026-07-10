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

// Typed stub - no UI until a later round, but the schema slot is reserved so
// documents containing images stay forward-compatible.
export const imageElementSchema = baseElementSchema.extend({
  type: z.literal('image'),
  src: z.string(),
})

export const elementSchema = z.discriminatedUnion('type', [
  rectElementSchema,
  lineElementSchema,
  circleElementSchema,
  textElementSchema,
  imageElementSchema,
])

export type RectElement = z.infer<typeof rectElementSchema>
export type LineElement = z.infer<typeof lineElementSchema>
export type CircleElement = z.infer<typeof circleElementSchema>
export type TextElement = z.infer<typeof textElementSchema>
export type ImageElement = z.infer<typeof imageElementSchema>
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
