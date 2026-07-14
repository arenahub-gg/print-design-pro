import { cloneJson } from './clone'
import type { TemplateDocument } from './schema/template'

// {{variable}} data binding (round 13). ONE substitution implementation
// serves the DOM preview AND the render engine - the same parity contract
// as shape-paths and computeTableLayout. No new element type: any text,
// QR or barcode content and any table cell/column title may carry tokens.

/** `{{ name }}` - trimmed inner name of word chars, dots and dashes. */
export const VARIABLE_PATTERN = /\{\{\s*([\w.-]+)\s*\}\}/g

/**
 * Replace `{{name}}` tokens with values from `data`. Unknown variables keep
 * the RAW token - a visible artifact beats silently printing blanks.
 *
 * `in` first (NOT Object.hasOwn alone): callers pass reactive proxies for
 * live preview, and Vue tracks the `has` trap but not
 * getOwnPropertyDescriptor - hasOwn alone would freeze the preview for
 * variables added after first render. The hasOwn AFTER it filters inherited
 * prototype keys ({{constructor}} must keep its raw token, not print
 * "function Object() ..."); the `in` has already registered the dep.
 */
export function substituteVariables(text: string, data: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (token, name: string) =>
    name in data && Object.hasOwn(data, name) ? data[name]! : token)
}

/** Every string on an element that participates in substitution. */
function bindableStrings(doc: TemplateDocument): string[] {
  const strings: string[] = []
  for (const element of doc.elements) {
    switch (element.type) {
      case 'text':
      case 'qr':
      case 'barcode':
        strings.push(element.content)
        break
      case 'table':
        strings.push(...element.columns.map(column => column.title))
        for (const row of element.rows)
          strings.push(...row)
        break
    }
  }
  return strings
}

/** Unique variable names used by the document, in first-appearance order. */
export function collectVariables(doc: TemplateDocument): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const text of bindableStrings(doc)) {
    for (const match of text.matchAll(VARIABLE_PATTERN)) {
      const name = match[1]!
      if (!seen.has(name)) {
        seen.add(name)
        names.push(name)
      }
    }
  }
  return names
}

/**
 * Clone the document with `{{variable}}` tokens substituted everywhere.
 * The document's stored sample values apply first; `data` (a CSV row)
 * overrides them per key. Render callers feed the result to the engine.
 */
export function resolveDocument(
  doc: TemplateDocument,
  data: Record<string, string> = {},
): TemplateDocument {
  const merged = { ...doc.variables, ...data }
  const resolved = cloneJson(doc)
  for (const element of resolved.elements) {
    switch (element.type) {
      case 'text':
      case 'qr':
      case 'barcode':
        element.content = substituteVariables(element.content, merged)
        break
      case 'table':
        for (const column of element.columns)
          column.title = substituteVariables(column.title, merged)
        element.rows = element.rows.map(row =>
          row.map(cell => substituteVariables(cell, merged)))
        break
    }
  }
  return resolved
}
