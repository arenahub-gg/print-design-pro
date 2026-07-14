import { z } from 'zod'
import { elementSchema } from './elements'
import { PAGE_PRESETS, pageSettingsSchema, type PageSettings } from './page'

// Guides: user-placed alignment lines dragged out from the rulers.
export const guideSchema = z.object({
  id: z.string().min(1),
  orientation: z.enum(['horizontal', 'vertical']),
  positionMm: z.number(),
})

export type Guide = z.infer<typeof guideSchema>

/**
 * Template document - the persisted unit. `schemaVersion` gates future
 * migrations: importers must check it before trusting the payload shape.
 */
export const templateDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string(),
  page: pageSettingsSchema,
  elements: z.array(elementSchema),
  guides: z.array(guideSchema),
  /**
   * Sample values for `{{variable}}` placeholders (round 13) - used for the
   * editor preview and single exports; CSV batch rows override them.
   * `.default({})` migrates pre-round-13 documents via openTemplate's parse.
   */
  variables: z.record(z.string(), z.string()).default({}),
}).superRefine((doc, ctx) => {
  // Import is the trust boundary: duplicate ids would make id-based commands
  // (update/remove) silently operate on the wrong object.
  for (const [collection, items] of [['elements', doc.elements], ['guides', doc.guides]] as const) {
    const seen = new Set<string>()
    items.forEach((item, index) => {
      if (seen.has(item.id)) {
        ctx.addIssue({ code: 'custom', path: [collection, index, 'id'], message: `Duplicate ${collection} id` })
      }
      seen.add(item.id)
    })
  }
})

export type TemplateDocument = z.infer<typeof templateDocumentSchema>

export function newId(): string {
  return crypto.randomUUID()
}

export function createEmptyTemplate(
  name = 'Untitled template',
  page: PageSettings = PAGE_PRESETS.a4,
): TemplateDocument {
  return {
    schemaVersion: 1,
    id: newId(),
    name,
    page: { ...page },
    elements: [],
    guides: [],
    variables: {},
  }
}
