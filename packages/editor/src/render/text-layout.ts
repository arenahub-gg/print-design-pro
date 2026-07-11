// Text line-breaking for the print render engine. Must mirror the DOM
// renderer's CSS behavior (`whitespace-pre-wrap` + `break-words`,
// line-height 1.25) closely enough that print output matches the editor:
// explicit \n always breaks, greedy word wrap on spaces, and a word wider
// than the box breaks at character level.

/** Line height multiplier - keep in sync with ElementRenderer.vue. */
export const TEXT_LINE_HEIGHT = 1.25

/**
 * Font stack used by BOTH the DOM renderer and the print engine. Pinned
 * explicitly so a host app's font choices can never make print line breaks
 * diverge from the editor.
 */
export const TEXT_FONT_STACK = 'system-ui, sans-serif'

export interface TextMeasurer {
  /** Width of the string in the CURRENT ctx font, any unit (consistent). */
  measure: (text: string) => number
}

/**
 * Break `content` into rendered lines fitting `maxWidth` (same unit the
 * measurer returns). Preserves empty lines from consecutive newlines.
 */
export function wrapText(content: string, maxWidth: number, measurer: TextMeasurer): string[] {
  const lines: string[] = []

  for (const paragraph of content.split('\n')) {
    if (paragraph === '') {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of paragraph.split(' ')) {
      const candidate = current === '' ? word : `${current} ${word}`
      if (measurer.measure(candidate) <= maxWidth) {
        current = candidate
        continue
      }
      // Word does not fit after the current line - flush what we have.
      // (Both branches below reassign `current`.)
      if (current !== '')
        lines.push(current)
      // break-words: a single word wider than the box splits per character.
      if (measurer.measure(word) <= maxWidth) {
        current = word
      }
      else {
        let chunk = ''
        for (const char of word) {
          if (chunk !== '' && measurer.measure(chunk + char) > maxWidth) {
            lines.push(chunk)
            chunk = char
          }
          else {
            chunk += char
          }
        }
        current = chunk
      }
    }
    lines.push(current)
  }

  return lines
}
