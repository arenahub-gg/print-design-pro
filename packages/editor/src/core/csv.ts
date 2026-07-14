// Minimal RFC 4180 CSV parser for batch printing - quoted fields, ""
// escapes, CRLF/LF line ends. ~50 lines beats a dependency for one input.

export interface CsvData {
  headers: string[]
  /** One record per data line, keyed by header; missing cells read as ''. */
  rows: Array<Record<string, string>>
}

export class CsvParseError extends Error {}

/** Split CSV text into raw cell matrix (fields may contain \n and commas). */
function parseCells(text: string): string[][] {
  const lines: string[][] = []
  let line: string[] = []
  let cell = ''
  let quoted = false
  let index = 0

  while (index < text.length) {
    const char = text[index]!
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { // escaped quote
          cell += '"'
          index += 2
          continue
        }
        quoted = false
        index++
        continue
      }
      cell += char
      index++
      continue
    }
    if (char === '"') {
      if (cell.length > 0)
        throw new CsvParseError(`Unexpected quote inside unquoted field (offset ${index})`)
      quoted = true
      index++
      continue
    }
    if (char === ',') {
      line.push(cell)
      cell = ''
      index++
      continue
    }
    if (char === '\n' || char === '\r') {
      line.push(cell)
      cell = ''
      lines.push(line)
      line = []
      // swallow CRLF as one break
      index += char === '\r' && text[index + 1] === '\n' ? 2 : 1
      continue
    }
    cell += char
    index++
  }
  if (quoted)
    throw new CsvParseError('Unterminated quoted field')
  // Final cell/line (no trailing newline)
  if (cell.length > 0 || line.length > 0) {
    line.push(cell)
    lines.push(line)
  }
  return lines
}

/**
 * Parse CSV with a header row into records. Blank lines are skipped;
 * short rows read missing cells as ''; long rows drop the excess.
 */
export function parseCsv(text: string): CsvData {
  // Excel's "CSV UTF-8" prepends a BOM; with a QUOTED first header it would
  // otherwise trip the quote-in-unquoted-field error.
  const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
  const matrix = parseCells(clean).filter(row => row.some(cell => cell.trim() !== ''))
  if (matrix.length === 0)
    throw new CsvParseError('CSV is empty')

  const headers = matrix[0]!.map(header => header.trim())
  if (headers.some(header => header === ''))
    throw new CsvParseError('CSV header row has an empty column name')

  const rows = matrix.slice(1).map((cells) => {
    // Null prototype: a "__proto__" column must behave like any other key
    // instead of silently hitting the inherited accessor and dropping data.
    const record: Record<string, string> = Object.create(null)
    headers.forEach((header, column) => {
      record[header] = cells[column] ?? ''
    })
    return record
  })
  return { headers, rows }
}
