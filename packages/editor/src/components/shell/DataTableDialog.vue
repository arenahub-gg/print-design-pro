<script setup lang="ts">
import { computed } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { collectVariables } from '../../core/variables'
import { useBatchDataStore } from '../../stores/batch-data-store'
import { useDocumentStore } from '../../stores/document-store'

// Spreadsheet-style manager for the batch data rows (round 20): every cell
// is editable in place, rows can be added/removed, and clicking a row makes
// it the ACTIVE canvas preview. Same data store as the panel + export
// dialog - this is just a roomier view of it.
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const doc = useDocumentStore()
const batchData = useBatchDataStore()
const { t } = useEditorI18n()

/** Document variables first, then any extra columns the data carries. */
const columns = computed(() => {
  const names = collectVariables(doc.document)
  for (const header of batchData.headers) {
    if (!names.includes(header))
      names.push(header)
  }
  return names
})

function addRow(): void {
  const base = batchData.activeRow
    ?? Object.fromEntries(columns.value.map(name => [name, doc.document.variables[name] ?? '']))
  batchData.addRow({ ...base })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      tabindex="-1"
      class="pp:fixed pp:inset-0 pp:z-50 pp:flex pp:items-center pp:justify-center pp:bg-[rgba(10,14,22,.55)] pp:p-6 pp:font-ui pp:outline-none"
      data-pp-datatable-dialog
      @click.self="emit('close')"
      @keydown.escape="emit('close')"
    >
      <div class="pp:flex pp:max-h-full pp:w-[840px] pp:max-w-full pp:flex-col pp:overflow-hidden pp:rounded-[14px] pp:border pp:border-app-border pp:bg-app-panel pp:shadow-app-lg">
        <div class="pp:flex pp:items-center pp:gap-3 pp:border-b pp:border-app-border pp:px-5 pp:py-4">
          <h2 class="pp:text-[15px] pp:font-bold pp:text-app-text">
            {{ t('datatable.title') }}
          </h2>
          <span
            v-if="batchData.hasRows"
            class="pp:rounded pp:bg-brand-soft pp:px-1.5 pp:py-0.5 pp:font-uimono pp:text-[10px] pp:font-bold pp:text-brand-500"
          >{{ batchData.rows.length }} {{ t('batch.rows') }}</span>
          <span class="pp:flex-1" />
          <button
            type="button"
            class="pp:rounded-lg pp:bg-brand-500 pp:px-3 pp:py-1.5 pp:text-xs pp:font-semibold pp:text-white pp:hover:bg-brand-600"
            data-pp-datatable-add
            @click="addRow"
          >
            {{ t('batch.addRow') }}
          </button>
        </div>

        <div class="pp:min-h-0 pp:flex-1 pp:overflow-auto pp:p-3">
          <p
            v-if="!batchData.hasRows"
            class="pp:rounded-lg pp:border pp:border-dashed pp:border-app-border2 pp:p-6 pp:text-center pp:text-xs pp:text-app-text3"
          >
            {{ t('datatable.empty') }}
          </p>

          <table
            v-else
            class="pp:w-full pp:border-collapse"
            data-pp-datatable
          >
            <thead>
              <tr>
                <th class="pp:sticky pp:top-0 pp:w-10 pp:bg-app-panel pp:px-2 pp:py-1.5 pp:text-left pp:font-uimono pp:text-[10px] pp:font-bold pp:text-app-text3">
                  #
                </th>
                <th
                  v-for="name in columns"
                  :key="name"
                  class="pp:sticky pp:top-0 pp:bg-app-panel pp:px-2 pp:py-1.5 pp:text-left pp:font-uimono pp:text-[10px] pp:font-bold pp:text-app-text2"
                >
                  {{ name }}
                </th>
                <th class="pp:sticky pp:top-0 pp:w-10 pp:bg-app-panel" />
              </tr>
            </thead>
            <tbody>
              <!-- click a row = preview it on the canvas behind the dialog -->
              <tr
                v-for="(row, index) in batchData.rows"
                :key="index"
                class="pp:cursor-pointer pp:border-t pp:border-app-border"
                :class="batchData.activeRowIndex === index ? 'pp:bg-brand-soft' : 'pp:hover:bg-app-inset'"
                :data-pp-datatable-row="index"
                @click="batchData.activeRowIndex = index"
              >
                <td class="pp:px-2 pp:py-1 pp:font-uimono pp:text-[10px] pp:text-app-text3">
                  {{ index + 1 }}
                </td>
                <td
                  v-for="name in columns"
                  :key="name"
                  class="pp:px-1 pp:py-1"
                >
                  <input
                    :value="row[name] ?? ''"
                    class="pp:h-7 pp:w-full pp:min-w-[110px] pp:rounded-md pp:border pp:border-transparent pp:bg-transparent pp:px-1.5 pp:text-[12px] pp:text-app-text pp:hover:border-app-border2 pp:focus:border-brand-500 pp:focus:bg-app-panel pp:focus:outline-none"
                    :data-pp-cell="`${index}-${name}`"
                    @input="batchData.updateCell(index, name, ($event.target as HTMLInputElement).value)"
                  >
                </td>
                <td class="pp:px-1 pp:py-1 pp:text-center">
                  <button
                    type="button"
                    class="pp:rounded-md pp:px-1.5 pp:py-0.5 pp:text-[12px] pp:text-app-text3 pp:hover:bg-rose-50 pp:hover:text-rose-600"
                    :title="t('batch.deleteRow')"
                    :data-pp-datatable-delete="index"
                    @click.stop="batchData.removeRow(index)"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pp:flex pp:justify-end pp:border-t pp:border-app-border pp:px-5 pp:py-3">
          <button
            type="button"
            class="pp:h-9 pp:rounded-lg pp:border pp:border-app-border2 pp:px-4 pp:text-xs pp:font-semibold pp:text-app-text2 pp:hover:bg-app-inset"
            data-pp-datatable-close
            @click="emit('close')"
          >
            {{ t('preview.close') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
