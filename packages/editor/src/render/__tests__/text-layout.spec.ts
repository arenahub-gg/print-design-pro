import { describe, expect, it } from 'vitest'
import { wrapText, type TextMeasurer } from '../text-layout'

// Monospace width model: every char is 1 unit wide - makes cases exact.
const mono: TextMeasurer = { measure: text => text.length }

describe('wrapText', () => {
  it('keeps short content on one line', () => {
    expect(wrapText('hello', 10, mono)).toEqual(['hello'])
  })

  it('preserves explicit newlines including empty lines', () => {
    expect(wrapText('a\n\nb', 10, mono)).toEqual(['a', '', 'b'])
  })

  it('greedy-wraps on spaces', () => {
    // "aa bb cc" with width 5: "aa bb" fits, "cc" wraps.
    expect(wrapText('aa bb cc', 5, mono)).toEqual(['aa bb', 'cc'])
  })

  it('breaks a word wider than the box at character level', () => {
    expect(wrapText('abcdefgh', 3, mono)).toEqual(['abc', 'def', 'gh'])
  })

  it('flushes the current line before an overlong word breaks', () => {
    expect(wrapText('hi abcdefgh', 4, mono)).toEqual(['hi', 'abcd', 'efgh'])
  })

  it('exact-fit line does not wrap', () => {
    expect(wrapText('abcde', 5, mono)).toEqual(['abcde'])
  })

  it('handles empty content', () => {
    expect(wrapText('', 5, mono)).toEqual([''])
  })

  it('keeps unicode text intact (per-character break on Vietnamese)', () => {
    const lines = wrapText('Xin chào thế giới', 8, mono)
    expect(lines.join(' ').replaceAll('  ', ' ')).toContain('chào')
    expect(lines.every(line => line.length <= 8)).toBe(true)
  })
})
