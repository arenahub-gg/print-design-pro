import { useEditorI18n } from './use-editor-i18n'
import { CsvParseError, parseCsv, serializeCsv } from '../core/csv'
import { collectVariables } from '../core/variables'
import { validateBatchBarcodes } from '../render/batch-preflight'
import { downloadBlob } from '../render/download'
import { MAX_BATCH_ROWS } from '../render/export-pdf'
import { useBatchDataStore } from '../stores/batch-data-store'
import { useDocumentStore } from '../stores/document-store'

/**
 * Shared CSV load/download flow for the Variables panel AND the export
 * dialog - both feed the same batch-data store, so data uploaded in either
 * place is available everywhere.
 */
export function useBatchCsv() {
  const doc = useDocumentStore()
  const batchData = useBatchDataStore()
  const { t } = useEditorI18n()

  /** Parse + validate + store. Throws a LOCALIZED Error on bad input. */
  async function loadCsvFile(file: File): Promise<void> {
    const { headers, rows } = parseCsv(await file.text())
    if (rows.length === 0)
      throw new CsvParseError(t('batch.noRows'))
    if (rows.length > MAX_BATCH_ROWS)
      throw new CsvParseError(t('batch.tooMany').replace('{max}', String(MAX_BATCH_ROWS)))
    // Pre-flight BEFORE storing: rows with invalid barcode content would
    // print blank barcodes on pages nobody previews.
    batchData.barcodeFailures = await validateBatchBarcodes(doc.document, rows)
    batchData.setCsv(headers, rows, file.name)
  }

  /** Ready-to-fill CSV: header = document variables, first row = samples. */
  function downloadSampleCsv(): void {
    const headers = collectVariables(doc.document)
    const sampleRow = Object.fromEntries(
      headers.map(name => [name, doc.document.variables[name] ?? '']),
    )
    const csv = serializeCsv(headers, [sampleRow])
    // BOM so Excel opens UTF-8 (Vietnamese/Chinese values) correctly.
    downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv' }), 'batch-data.csv')
  }

  return { loadCsvFile, downloadSampleCsv }
}
