import { z } from 'zod'

// Page settings: physical paper description in mm. Margins are print-safe
// guides only - elements may still be placed outside them.
export const pageSettingsSchema = z.object({
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  orientation: z.enum(['portrait', 'landscape']),
  marginTopMm: z.number().min(0),
  marginRightMm: z.number().min(0),
  marginBottomMm: z.number().min(0),
  marginLeftMm: z.number().min(0),
})

export type PageSettings = z.infer<typeof pageSettingsSchema>

function preset(widthMm: number, heightMm: number, marginMm: number): PageSettings {
  return {
    widthMm,
    heightMm,
    orientation: heightMm >= widthMm ? 'portrait' : 'landscape',
    marginTopMm: marginMm,
    marginRightMm: marginMm,
    marginBottomMm: marginMm,
    marginLeftMm: marginMm,
  }
}

/** Common paper presets. Label presets use zero margin (edge-to-edge print). */
export const PAGE_PRESETS = {
  a4: preset(210, 297, 10),
  a5: preset(148, 210, 10),
  label100x150: preset(100, 150, 0),
  label50x30: preset(50, 30, 0),
} satisfies Record<string, PageSettings>

export type PagePresetKey = keyof typeof PAGE_PRESETS
