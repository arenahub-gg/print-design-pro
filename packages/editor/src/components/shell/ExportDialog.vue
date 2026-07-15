<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useBatchCsv } from '../../composables/use-batch-csv'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { cloneJson } from '../../core/clone'
import { collectVariables, resolveDocument } from '../../core/variables'
import { downloadBlob } from '../../render/download'
import { exportPdf, exportPdfBatch } from '../../render/export-pdf'
import { exportPng } from '../../render/export-image'
import { printDocument, printDocumentBatch } from '../../render/print-browser'
import { renderToCanvas } from '../../render/render-engine'
import { useBatchDataStore } from '../../stores/batch-data-store'
import { useDocumentStore } from '../../stores/document-store'

// PrintDesignPro export modal: format cards (PNG / PDF / direct print) on the
// left, live render-engine preview on the right - the exact pixels that will
// be produced. Replaces the round-2 preview dialog.
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const doc = useDocumentStore()
const { t } = useEditorI18n()

type ExportFormat = 'png' | 'pdf' | 'print'

const format = ref<ExportFormat>('pdf')
const busy = ref(false)
const previewUrl = ref<string | null>(null)
const overlayRef = ref<HTMLElement | null>(null)
const errorText = ref<string | null>(null)
/** Invalidates in-flight preview renders when the dialog closes/reopens. */
let previewTicket = 0

// ---- CSV batch (round 13; shared store since round 18) -----------------
// Data can be loaded HERE or in the Variables panel - same store, so rows
// uploaded in either place drive both the canvas preview and this dialog.
const batchData = useBatchDataStore()
const { loadCsvFile, downloadSampleCsv } = useBatchCsv()
const usedVariables = computed(() => collectVariables(doc.document))

/** Variables the CSV does not provide - they fall back to sample values. */
const missingVariables = computed(() =>
  batchData.headers.length === 0
    ? []
    : usedVariables.value.filter(name => !batchData.headers.includes(name)))

/** Vue interpolation ends at the first `}}` even inside strings - build here. */
const missingTokens = computed(() =>
  missingVariables.value.map(name => `{{${name}}}`).join(', '))

async function onCsvChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file)
    return
  errorText.value = null
  try {
    await loadCsvFile(file)
  }
  catch (error) {
    batchData.clear()
    errorText.value = error instanceof Error ? error.message : String(error)
  }
}

/** Batch applies to PDF and direct print; PNG always exports one sample page. */
const batchActive = computed(() => batchData.hasRows && format.value !== 'png')

/** Batch is blocked (CTA disabled) while any row carries invalid barcodes. */
const batchBlocked = computed(() => batchActive.value && batchData.barcodeFailures.length > 0)

// computed: labels follow runtime locale switches
const formats = computed<Array<{ value: ExportFormat, label: string, descKey: `export.${string}` }>>(() => [
  { value: 'png', label: 'PNG', descKey: 'export.pngDesc' },
  { value: 'pdf', label: 'PDF', descKey: 'export.pdfDesc' },
  { value: 'print', label: t('topbar.print'), descKey: 'export.printDesc' },
])

const ctaLabel = computed(() => {
  if (batchActive.value) {
    const key = format.value === 'pdf' ? 'batch.ctaPdf' : 'batch.ctaPrint'
    return t(key as never).replace('{n}', String(batchData.rows.length))
  }
  if (format.value === 'png')
    return t('export.ctaPng')
  if (format.value === 'pdf')
    return t('export.ctaPdf')
  return t('export.ctaPrint')
})

// Batch data intentionally SURVIVES dialog close/reopen (it may have been
// loaded in the Variables panel) - only transient error state resets.
watch(() => props.open, async (open) => {
  previewTicket++
  if (open) {
    errorText.value = null
    void renderPreview(previewTicket)
    await nextTick()
    overlayRef.value?.focus()
  }
  else {
    previewUrl.value = null
  }
})

async function renderPreview(ticket: number): Promise<void> {
  try {
    // Preview shows the ACTIVE data (samples, or the CSV row selected in
    // the Variables panel's row navigator).
    const canvas = await renderToCanvas(
      resolveDocument(cloneJson(doc.document), batchData.activeRow ?? {}),
      { dpi: 150 },
    )
    if (ticket === previewTicket)
      previewUrl.value = canvas.toDataURL('image/png')
  }
  catch (error) {
    // e.g. page exceeds the canvas dimension guard - tell the user, don't hang
    if (ticket === previewTicket)
      errorText.value = error instanceof Error ? error.message : String(error)
  }
}

async function run(): Promise<void> {
  if (busy.value || batchBlocked.value)
    return
  busy.value = true
  errorText.value = null
  try {
    const snapshot = cloneJson(doc.document)
    const filename = snapshot.name.trim() || 'template'
    if (format.value === 'png') {
      downloadBlob(await exportPng(snapshot), `${filename}.png`)
    }
    else if (format.value === 'pdf') {
      downloadBlob(
        batchActive.value
          ? await exportPdfBatch(snapshot, cloneJson(batchData.rows))
          : await exportPdf(snapshot),
        `${filename}.pdf`,
      )
    }
    else if (batchActive.value) {
      await printDocumentBatch(snapshot, cloneJson(batchData.rows))
    }
    else {
      await printDocument(snapshot)
    }
  }
  catch (error) {
    errorText.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlayRef"
      tabindex="-1"
      class="pp:fixed pp:inset-0 pp:z-50 pp:flex pp:items-center pp:justify-center pp:bg-[rgba(10,14,22,.55)] pp:p-6 pp:font-ui pp:outline-none"
      data-pp-export-dialog
      @click.self="emit('close')"
      @keydown.escape="emit('close')"
    >
      <div class="pp:flex pp:max-h-full pp:w-[660px] pp:max-w-full pp:overflow-hidden pp:rounded-[14px] pp:border pp:border-app-border pp:bg-app-panel pp:shadow-app-lg">
        <!-- options -->
        <div class="pp:flex pp:min-w-0 pp:flex-1 pp:flex-col pp:gap-4 pp:p-6">
          <div>
            <h2 class="pp:text-[17px] pp:font-bold pp:text-app-text">
              {{ t('topbar.export') }}
            </h2>
            <p class="pp:mt-0.5 pp:text-xs pp:text-app-text3">
              {{ doc.document.name }} · {{ doc.page.widthMm }} × {{ doc.page.heightMm }} mm
            </p>
          </div>

          <div>
            <h3 class="pp:mb-2 pp:text-xs pp:font-semibold pp:text-app-text2">
              {{ t('export.format') }}
            </h3>
            <div class="pp:flex pp:gap-2">
              <button
                v-for="entry in formats"
                :key="entry.value"
                type="button"
                class="pp:flex-1 pp:cursor-pointer pp:rounded-[9px] pp:border-[1.5px] pp:px-3 pp:py-2.5 pp:text-left"
                :class="format === entry.value
                  ? 'pp:border-brand-500 pp:bg-brand-soft'
                  : 'pp:border-app-border pp:hover:border-brand-500'"
                :data-pp-export-format="entry.value"
                @click="format = entry.value"
              >
                <span class="pp:block pp:font-uimono pp:text-[13px] pp:font-bold pp:text-app-text">{{ entry.label }}</span>
                <span class="pp:mt-0.5 pp:block pp:text-[10px] pp:text-app-text3">{{ t(entry.descKey as never) }}</span>
              </button>
            </div>
          </div>

          <!-- CSV batch: only offered when the document uses {{variables}} -->
          <div
            v-if="usedVariables.length > 0"
            data-pp-batch-section
          >
            <h3 class="pp:mb-2 pp:text-xs pp:font-semibold pp:text-app-text2">
              {{ t('batch.title') }}
            </h3>
            <label class="pp:flex pp:cursor-pointer pp:items-center pp:gap-2 pp:rounded-lg pp:border pp:border-dashed pp:border-app-border2 pp:px-3 pp:py-2 pp:text-xs pp:text-app-text2 pp:hover:border-brand-500">
              <span class="pp:font-uimono">⇪</span>
              <span
                class="pp:min-w-0 pp:truncate"
                data-pp-batch-file
              >{{ batchData.fileName ?? t('batch.choose') }}</span>
              <span
                v-if="batchData.hasRows"
                class="pp:ml-auto pp:shrink-0 pp:rounded pp:bg-brand-soft pp:px-1.5 pp:py-0.5 pp:font-uimono pp:text-[10px] pp:font-bold pp:text-brand-500"
                data-pp-batch-count
              >{{ batchData.rows.length }} {{ t('batch.rows') }}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                class="pp:hidden"
                data-pp-batch-input
                @change="onCsvChange"
              >
            </label>
            <button
              type="button"
              class="pp:mt-1.5 pp:text-[10px] pp:text-brand-500 pp:hover:underline"
              data-pp-batch-sample
              @click="downloadSampleCsv"
            >
              {{ t('batch.sampleCsv') }}
            </button>
            <p
              v-if="missingVariables.length"
              class="pp:mt-1.5 pp:text-[10px] pp:text-amber-600"
              data-pp-batch-missing
            >
              {{ t('batch.missing') }} {{ missingTokens }}
            </p>
            <div
              v-if="batchData.barcodeFailures.length"
              class="pp:mt-1.5 pp:rounded-lg pp:bg-rose-50 pp:p-2 pp:text-[10px] pp:text-rose-600"
              data-pp-batch-barcode-errors
            >
              <p class="pp:font-semibold">
                {{ t('batch.badBarcodes') }}
              </p>
              <p
                v-for="failure in batchData.barcodeFailures.slice(0, 5)"
                :key="`${failure.row}-${failure.elementName}`"
              >
                #{{ failure.row }} · {{ failure.elementName }} · "{{ failure.content }}"
              </p>
              <p v-if="batchData.barcodeFailures.length > 5">
                +{{ batchData.barcodeFailures.length - 5 }}…
              </p>
            </div>
          </div>

          <p class="pp:text-[11px] pp:leading-relaxed pp:text-app-text3">
            {{ t('preview.hint') }}
          </p>

          <p
            v-if="errorText"
            class="pp:rounded-lg pp:bg-rose-50 pp:p-2 pp:text-[11px] pp:text-rose-600"
            data-pp-export-error
          >
            {{ errorText }}
          </p>

          <div class="pp:mt-auto pp:flex pp:gap-2.5">
            <button
              type="button"
              class="pp:h-[38px] pp:rounded-lg pp:border pp:border-app-border2 pp:px-4 pp:text-[13px] pp:font-semibold pp:text-app-text2 pp:hover:bg-app-inset"
              @click="emit('close')"
            >
              {{ t('preview.close') }}
            </button>
            <button
              type="button"
              class="pp:h-[38px] pp:flex-1 pp:rounded-lg pp:bg-brand-500 pp:text-[13px] pp:font-semibold pp:text-white pp:hover:bg-brand-600 pp:disabled:opacity-50"
              :disabled="busy || batchBlocked"
              data-pp-export-run
              @click="run"
            >
              {{ ctaLabel }}
            </button>
          </div>
        </div>

        <!-- preview pane -->
        <div class="pp:flex pp:w-[220px] pp:shrink-0 pp:flex-col pp:items-center pp:justify-center pp:gap-2.5 pp:border-l pp:border-app-border pp:bg-app-inset pp:p-5">
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt=""
            class="pp:max-h-[300px] pp:w-auto pp:max-w-full pp:border pp:border-app-border2 pp:bg-white pp:shadow-md"
            data-pp-preview-image
          >
        </div>
      </div>
    </div>
  </Teleport>
</template>
