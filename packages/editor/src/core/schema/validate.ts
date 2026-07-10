import { templateDocumentSchema, type TemplateDocument } from './template'

/**
 * Validate unknown data as a template document. Throws ZodError with issue
 * paths (e.g. elements.0.widthMm) on malformed input.
 */
export function parseTemplate(data: unknown): TemplateDocument {
  return templateDocumentSchema.parse(data)
}

/**
 * Serialize with alphabetically sorted object keys so the same document
 * always produces byte-identical JSON - required for reliable round-trip
 * diffing and dirty checks.
 */
export function exportTemplate(doc: TemplateDocument): string {
  return JSON.stringify(sortKeysDeep(doc), null, 2)
}

export function importTemplate(json: string): TemplateDocument {
  let data: unknown
  try {
    data = JSON.parse(json)
  }
  catch (cause) {
    throw new Error('Template import failed: not valid JSON', { cause })
  }
  return parseTemplate(data)
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, sortKeysDeep(entry)]),
    )
  }
  return value
}
