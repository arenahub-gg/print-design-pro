// Document fonts (round 15). A curated list keeps WYSIWYG guarantees: every
// entry is either web-safe or loaded from Google Fonts into document.fonts,
// which BOTH the DOM renderer and the Canvas2D engine read - so screen and
// print stay identical. '' (empty family) = the default system stack.

export interface DocumentFont {
  /** Stored in the schema; also the display name. */
  family: string
  /** Full CSS stack used by DOM and canvas. */
  stack: string
  /** Google Fonts family id - absent for web-safe fonts. */
  googleId?: string
}

export const DOCUMENT_FONTS: DocumentFont[] = [
  { family: 'Inter', stack: '"Inter", system-ui, sans-serif', googleId: 'Inter' },
  { family: 'Roboto', stack: '"Roboto", system-ui, sans-serif', googleId: 'Roboto' },
  { family: 'Open Sans', stack: '"Open Sans", system-ui, sans-serif', googleId: 'Open+Sans' },
  { family: 'Be Vietnam Pro', stack: '"Be Vietnam Pro", system-ui, sans-serif', googleId: 'Be+Vietnam+Pro' },
  { family: 'Montserrat', stack: '"Montserrat", system-ui, sans-serif', googleId: 'Montserrat' },
  { family: 'Lora', stack: '"Lora", Georgia, serif', googleId: 'Lora' },
  { family: 'Playfair Display', stack: '"Playfair Display", Georgia, serif', googleId: 'Playfair+Display' },
  { family: 'IBM Plex Mono', stack: '"IBM Plex Mono", ui-monospace, monospace', googleId: 'IBM+Plex+Mono' },
  { family: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { family: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
  { family: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
  { family: 'Courier New', stack: '"Courier New", Courier, monospace' },
]

/** CSS stack for a stored family; unknown/empty falls back to `fallback`. */
export function fontStack(family: string, fallback: string): string {
  if (!family)
    return fallback
  return DOCUMENT_FONTS.find(font => font.family === family)?.stack ?? fallback
}

const loaded = new Set<string>()

/**
 * Make a document font usable by DOM AND canvas: inject the Google Fonts
 * stylesheet once, then await the FontFaceSet load (canvas silently falls
 * back to the default font for families that are not loaded yet). Web-safe
 * and unknown families resolve immediately.
 */
export async function ensureFontLoaded(family: string): Promise<void> {
  const font = DOCUMENT_FONTS.find(entry => entry.family === family)
  if (!font || loaded.has(family))
    return
  if (font.googleId && typeof document !== 'undefined') {
    const id = `pp-font-${font.googleId}`
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${font.googleId}:wght@400;700&display=swap`
      document.head.appendChild(link)
    }
    try {
      // Load both weights the editor uses; failures degrade to fallback.
      await Promise.all([
        document.fonts.load(`400 16px "${family}"`),
        document.fonts.load(`700 16px "${family}"`),
      ])
    }
    catch {
      // offline / blocked CDN - fallback stack still renders
    }
  }
  loaded.add(family)
}

/** Preload every custom font a document uses (engine calls this pre-render). */
export async function ensureDocumentFonts(families: Iterable<string>): Promise<void> {
  await Promise.all([...new Set(families)].filter(Boolean).map(family => ensureFontLoaded(family)))
}
