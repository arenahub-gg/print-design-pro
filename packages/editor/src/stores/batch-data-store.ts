import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { BatchBarcodeFailure } from '../render/batch-preflight'
import { useDocumentStore } from './document-store'

/**
 * Loaded CSV batch data (round 18). Shared by the Variables panel (upload +
 * per-row canvas preview) and the export dialog (batch PDF/print) so the
 * data is entered ONCE. Session-only by design: batch rows are a print-job
 * input, not part of the template document.
 */
export const useBatchDataStore = defineStore('pp-batch-data', () => {
  const doc = useDocumentStore()

  const rows = ref<Array<Record<string, string>>>([])
  const headers = ref<string[]>([])
  const fileName = ref<string | null>(null)
  /** null = preview the document's sample values; otherwise a row index. */
  const activeRowIndex = ref<number | null>(null)
  /** Pre-flight results for the loaded rows - non-empty blocks batch jobs. */
  const barcodeFailures = ref<BatchBarcodeFailure[]>([])

  const hasRows = computed(() => rows.value.length > 0)
  const activeRow = computed(() =>
    activeRowIndex.value === null ? null : rows.value[activeRowIndex.value] ?? null)

  /**
   * The data record every live preview substitutes with: sample values,
   * overridden by the active CSV row when one is selected.
   */
  const previewData = computed<Record<string, string>>(() => ({
    ...doc.document.variables,
    ...(activeRow.value ?? {}),
  }))

  function setCsv(newHeaders: string[], newRows: Array<Record<string, string>>, name: string): void {
    headers.value = newHeaders
    rows.value = newRows
    fileName.value = name
    activeRowIndex.value = newRows.length > 0 ? 0 : null
  }

  function clear(): void {
    rows.value = []
    headers.value = []
    fileName.value = null
    activeRowIndex.value = null
    barcodeFailures.value = []
  }

  function stepPreview(direction: 1 | -1): void {
    if (rows.value.length === 0)
      return
    const current = activeRowIndex.value ?? -1
    const next = Math.min(rows.value.length - 1, Math.max(0, current + direction))
    activeRowIndex.value = next
  }

  // ---- in-editor row CRUD (round 19) -----------------------------------
  /** Track a manually-introduced column so the export dialog sees it. */
  function ensureHeader(name: string): void {
    if (!headers.value.includes(name))
      headers.value.push(name)
  }

  /** Append a row (defaults cloned from `base`) and jump the preview to it. */
  function addRow(base: Record<string, string> = {}): void {
    for (const name of Object.keys(base))
      ensureHeader(name)
    rows.value.push({ ...base })
    activeRowIndex.value = rows.value.length - 1
  }

  function updateCell(index: number, name: string, value: string): void {
    const row = rows.value[index]
    if (!row)
      return
    ensureHeader(name)
    row[name] = value
  }

  function updateActiveCell(name: string, value: string): void {
    if (activeRowIndex.value !== null)
      updateCell(activeRowIndex.value, name, value)
  }

  function removeRow(index: number): void {
    if (index < 0 || index >= rows.value.length)
      return
    rows.value.splice(index, 1)
    if (rows.value.length === 0) {
      clear()
      return
    }
    if (activeRowIndex.value !== null && activeRowIndex.value >= index)
      activeRowIndex.value = Math.max(0, Math.min(activeRowIndex.value - (activeRowIndex.value > index ? 1 : 0), rows.value.length - 1))
  }

  function removeActiveRow(): void {
    if (activeRowIndex.value !== null)
      removeRow(activeRowIndex.value)
  }

  return {
    rows,
    headers,
    fileName,
    activeRowIndex,
    barcodeFailures,
    hasRows,
    activeRow,
    previewData,
    setCsv,
    clear,
    stepPreview,
    addRow,
    updateCell,
    updateActiveCell,
    removeRow,
    removeActiveRow,
  }
})

export type BatchDataStore = ReturnType<typeof useBatchDataStore>
