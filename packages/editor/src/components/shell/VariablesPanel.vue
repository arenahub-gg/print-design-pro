<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useBatchCsv } from '../../composables/use-batch-csv'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { setVariableCommand } from '../../core/commands/element-commands'
import { collectVariables } from '../../core/variables'
import { useBatchDataStore } from '../../stores/batch-data-store'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'

// "Data variables" tab: variables are INFERRED from {{name}} tokens in the
// document. This panel edits SAMPLE values AND loads the multi-row CSV data
// for batch printing - the loaded rows preview live on the canvas (row
// navigator) and drive the export dialog's batch PDF/print.
const doc = useDocumentStore()
const history = useHistoryStore()
const batchData = useBatchDataStore()
const { loadCsvFile, downloadSampleCsv, revalidate } = useBatchCsv()
const { t } = useEditorI18n()

const names = computed(() => collectVariables(doc.document))
const csvError = ref<string | null>(null)

/** Vue interpolation ends at the first `}}` even inside strings - build here. */
function token(name: string): string {
  return `{{${name}}}`
}

function commitSample(name: string, event: Event): void {
  const value = (event.target as HTMLInputElement).value
  if (value === (doc.document.variables[name] ?? ''))
    return
  history.dispatch(setVariableCommand(doc, name, value))
}

async function onCsvChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file)
    return
  csvError.value = null
  try {
    await loadCsvFile(file)
  }
  catch (error) {
    batchData.clear()
    csvError.value = error instanceof Error ? error.message : String(error)
  }
}

const rowLabel = computed(() =>
  t('batch.previewRow')
    .replace('{n}', String((batchData.activeRowIndex ?? 0) + 1))
    .replace('{m}', String(batchData.rows.length)))

// ---- in-editor row CRUD -------------------------------------------------
/** First manual row starts from the sample values (something to edit). */
function addRow(): void {
  const base = batchData.activeRow
    ?? Object.fromEntries(names.value.map(name => [name, doc.document.variables[name] ?? '']))
  batchData.addRow({ ...base })
}

// Hand edits can introduce/repair invalid barcode content - revalidate
// (debounced; jsbarcode generation per row is not free).
let revalidateTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => batchData.rows,
  () => {
    if (revalidateTimer)
      clearTimeout(revalidateTimer)
    revalidateTimer = setTimeout(() => void revalidate(), 600)
  },
  { deep: true },
)
</script>

<template>
  <div class="pp:flex pp:flex-col pp:gap-2.5 pp:overflow-auto pp:p-3">
    <p
      v-if="names.length === 0"
      class="pp:rounded-lg pp:border pp:border-dashed pp:border-app-border2 pp:p-3 pp:text-[11px] pp:leading-relaxed pp:text-app-text3"
      data-pp-variables-empty
    >
      {{ t('variables.empty') }}
    </p>

    <template v-else>
      <p class="pp:text-[11px] pp:leading-relaxed pp:text-app-text3">
        {{ t('variables.hint') }}
      </p>
      <label
        v-for="name in names"
        :key="name"
        class="pp:flex pp:flex-col pp:gap-1"
      >
        <span class="pp:font-uimono pp:text-[11px] pp:font-bold pp:text-app-text2">{{ token(name) }}</span>
        <input
          :value="doc.document.variables[name] ?? ''"
          :placeholder="t('variables.samplePlaceholder')"
          class="pp:h-8 pp:rounded-lg pp:border pp:border-app-border2 pp:bg-app-panel pp:px-2 pp:text-xs pp:text-app-text pp:focus:border-brand-500 pp:focus:outline-none"
          :data-pp-variable="name"
          @change="commitSample(name, $event)"
        >
      </label>

      <!-- multi-row CSV data: preview per row here, batch-print via Export -->
      <div class="pp:mt-2 pp:border-t pp:border-app-border pp:pt-3">
        <h3 class="pp:mb-2 pp:text-[11px] pp:font-semibold pp:text-app-text2">
          {{ t('batch.title') }}
        </h3>

        <label class="pp:flex pp:cursor-pointer pp:items-center pp:gap-2 pp:rounded-lg pp:border pp:border-dashed pp:border-app-border2 pp:px-2.5 pp:py-2 pp:text-[11px] pp:text-app-text2 pp:hover:border-brand-500">
          <span class="pp:font-uimono">⇪</span>
          <span class="pp:min-w-0 pp:truncate">{{ batchData.fileName ?? t('batch.choose') }}</span>
          <span
            v-if="batchData.hasRows"
            class="pp:ml-auto pp:shrink-0 pp:rounded pp:bg-brand-soft pp:px-1.5 pp:py-0.5 pp:font-uimono pp:text-[10px] pp:font-bold pp:text-brand-500"
            data-pp-panel-batch-count
          >{{ batchData.rows.length }} {{ t('batch.rows') }}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            class="pp:hidden"
            data-pp-panel-batch-input
            @change="onCsvChange"
          >
        </label>

        <button
          type="button"
          class="pp:mt-1.5 pp:text-[10px] pp:text-brand-500 pp:hover:underline"
          data-pp-panel-batch-sample
          @click="downloadSampleCsv"
        >
          {{ t('batch.sampleCsv') }}
        </button>

        <p
          v-if="csvError"
          class="pp:mt-1.5 pp:rounded-lg pp:bg-rose-50 pp:p-2 pp:text-[10px] pp:text-rose-600"
          data-pp-panel-batch-error
        >
          {{ csvError }}
        </p>

        <!-- add first row by hand - no CSV needed -->
        <button
          v-if="!batchData.hasRows"
          type="button"
          class="pp:mt-2 pp:w-full pp:rounded-lg pp:border pp:border-app-border2 pp:py-1.5 pp:text-[11px] pp:font-semibold pp:text-app-text2 pp:hover:bg-app-inset"
          data-pp-row-add
          @click="addRow"
        >
          {{ t('batch.addRow') }}
        </button>

        <!-- row navigator: previews each data row live on the canvas -->
        <div
          v-if="batchData.hasRows"
          class="pp:mt-2 pp:flex pp:items-center pp:gap-1.5"
          data-pp-row-navigator
        >
          <button
            type="button"
            class="pp:flex pp:h-7 pp:w-7 pp:items-center pp:justify-center pp:rounded-md pp:border pp:border-app-border2 pp:text-app-text2 pp:hover:bg-app-inset pp:disabled:opacity-40"
            :disabled="(batchData.activeRowIndex ?? 0) <= 0"
            data-pp-row-prev
            @click="batchData.stepPreview(-1)"
          >
            ◀
          </button>
          <span class="pp:flex-1 pp:text-center pp:font-uimono pp:text-[11px] pp:text-app-text2">{{ rowLabel }}</span>
          <button
            type="button"
            class="pp:flex pp:h-7 pp:w-7 pp:items-center pp:justify-center pp:rounded-md pp:border pp:border-app-border2 pp:text-app-text2 pp:hover:bg-app-inset pp:disabled:opacity-40"
            :disabled="(batchData.activeRowIndex ?? 0) >= batchData.rows.length - 1"
            data-pp-row-next
            @click="batchData.stepPreview(1)"
          >
            ▶
          </button>
          <button
            type="button"
            class="pp:flex pp:h-7 pp:items-center pp:rounded-md pp:border pp:border-app-border2 pp:px-2 pp:text-[10px] pp:text-app-text3 pp:hover:bg-app-inset"
            :title="t('batch.clear')"
            data-pp-batch-clear
            @click="batchData.clear()"
          >
            ✕
          </button>
        </div>

        <!-- CRUD: edit the ACTIVE row's cells (canvas follows live) -->
        <div
          v-if="batchData.activeRow"
          class="pp:mt-2 pp:flex pp:flex-col pp:gap-1.5 pp:rounded-lg pp:border pp:border-app-border pp:bg-app-inset pp:p-2"
          data-pp-row-editor
        >
          <label
            v-for="name in names"
            :key="name"
            class="pp:flex pp:items-center pp:gap-1.5"
          >
            <span class="pp:w-[72px] pp:shrink-0 pp:truncate pp:font-uimono pp:text-[10px] pp:text-app-text3">{{ name }}</span>
            <input
              :value="batchData.activeRow[name] ?? ''"
              class="pp:h-7 pp:min-w-0 pp:flex-1 pp:rounded-md pp:border pp:border-app-border2 pp:bg-app-panel pp:px-1.5 pp:text-[11px] pp:text-app-text pp:focus:border-brand-500 pp:focus:outline-none"
              :data-pp-row-cell="name"
              @input="batchData.updateActiveCell(name, ($event.target as HTMLInputElement).value)"
            >
          </label>
          <div class="pp:flex pp:gap-1.5">
            <button
              type="button"
              class="pp:flex-1 pp:rounded-md pp:border pp:border-app-border2 pp:py-1 pp:text-[10px] pp:font-semibold pp:text-app-text2 pp:hover:bg-app-panel"
              data-pp-row-add
              @click="addRow"
            >
              {{ t('batch.addRow') }}
            </button>
            <button
              type="button"
              class="pp:flex-1 pp:rounded-md pp:border pp:border-app-border2 pp:py-1 pp:text-[10px] pp:text-[#d1443c] pp:hover:bg-app-panel"
              data-pp-row-delete
              @click="batchData.removeActiveRow()"
            >
              {{ t('batch.deleteRow') }}
            </button>
          </div>
        </div>

        <div
          v-if="batchData.barcodeFailures.length"
          class="pp:mt-1.5 pp:rounded-lg pp:bg-rose-50 pp:p-2 pp:text-[10px] pp:text-rose-600"
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
        </div>
      </div>
    </template>
  </div>
</template>
