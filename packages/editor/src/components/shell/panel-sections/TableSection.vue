<script setup lang="ts">
import { computed } from 'vue'
import { useEditorI18n } from '../../../composables/use-editor-i18n'
import { updateElementsCommand } from '../../../core/commands/element-commands'
import type { ElementPatch, TableColumn, TableElement } from '../../../core/schema/elements'
import { newId } from '../../../core/schema/template'
import { useDocumentStore } from '../../../stores/document-store'
import { useHistoryStore } from '../../../stores/history-store'
import NumberField from '../panel-controls/NumberField.vue'

// Table editing: columns (title/weight/add/remove), rows, and a compact grid
// editor for cell text. Every commit is ONE undoable command with cloned
// arrays - store references are never mutated in place.
const props = defineProps<{ element: TableElement }>()

const doc = useDocumentStore()
const history = useHistoryStore()
const { t } = useEditorI18n()

const locked = computed(() => props.element.locked)

function commit(patch: ElementPatch, label: string): void {
  if (locked.value)
    return
  history.dispatch(updateElementsCommand(doc, [{ id: props.element.id, patch }], label))
}

// ---- columns --------------------------------------------------------------

function cloneColumns(): TableColumn[] {
  return props.element.columns.map(column => ({ ...column }))
}

function renameColumn(index: number, title: string): void {
  const columns = cloneColumns()
  columns[index]!.title = title
  commit({ columns } as ElementPatch, 'Rename column')
}

function reweighColumn(index: number, weight: number): void {
  const columns = cloneColumns()
  columns[index]!.widthMm = Math.max(1, weight)
  commit({ columns } as ElementPatch, 'Resize column')
}

function addColumn(): void {
  const columns = cloneColumns()
  const averageWeight = columns.reduce((sum, column) => sum + column.widthMm, 0) / columns.length
  columns.push({ id: newId(), title: `Col ${columns.length + 1}`, widthMm: Math.max(1, averageWeight) })
  // New column also needs a cell slot in every row - one atomic command.
  const rows = props.element.rows.map(row => [...row, ''])
  commit({ columns, rows } as ElementPatch, 'Add column')
}

function removeColumn(index: number): void {
  if (props.element.columns.length <= 1)
    return
  const columns = cloneColumns()
  columns.splice(index, 1)
  const rows = props.element.rows.map(row => row.filter((_, cellIndex) => cellIndex !== index))
  commit({ columns, rows } as ElementPatch, 'Remove column')
}

// ---- rows -----------------------------------------------------------------

function cloneRows(): string[][] {
  return props.element.rows.map(row => [...row])
}

function addRow(): void {
  const rows = cloneRows()
  rows.push(props.element.columns.map(() => ''))
  commit({ rows } as ElementPatch, 'Add row')
}

function removeLastRow(): void {
  if (props.element.rows.length === 0)
    return
  const rows = cloneRows()
  rows.pop()
  commit({ rows } as ElementPatch, 'Remove row')
}

function editCell(rowIndex: number, columnIndex: number, value: string): void {
  const rows = cloneRows()
  // A stale blur can land after removeLastRow shrank the array.
  if (!rows[rowIndex])
    return
  // Pad ragged rows so the write lands.
  while (rows[rowIndex]!.length <= columnIndex)
    rows[rowIndex]!.push('')
  rows[rowIndex]![columnIndex] = value
  commit({ rows } as ElementPatch, 'Edit cell')
}
</script>

<template>
  <section
    class="pp:flex pp:flex-col pp:gap-2"
    data-pp-table-section
  >
    <h3 class="pp:text-[11px] pp:font-semibold pp:text-app-text3">
      {{ t('panel.table') }}
    </h3>

    <label class="pp:flex pp:items-center pp:gap-2 pp:text-xs pp:text-app-text2">
      <input
        type="checkbox"
        :checked="element.showHeader"
        :disabled="locked"
        class="pp:accent-brand-500"
        @change="commit({ showHeader: !element.showHeader } as ElementPatch, 'Toggle header')"
      >
      {{ t('panel.showHeader') }}
    </label>

    <NumberField
      :label="'pt'"
      :model-value="element.fontSizePt"
      :min="4"
      :step="1"
      :disabled="locked"
      @commit="commit({ fontSizePt: $event } as ElementPatch, 'Table font size')"
    />

    <!-- columns -->
    <h4 class="pp:text-[10px] pp:font-semibold pp:uppercase pp:text-app-text3">
      {{ t('panel.columns') }}
    </h4>
    <div
      v-for="(column, index) in element.columns"
      :key="column.id"
      class="pp:flex pp:items-center pp:gap-1"
    >
      <input
        :value="column.title"
        :disabled="locked"
        type="text"
        class="pp:min-w-0 pp:flex-1 pp:rounded-lg pp:border pp:border-app-border2 pp:px-2 pp:py-1 pp:text-xs"
        :data-pp-column-title="index"
        @change="renameColumn(index, ($event.target as HTMLInputElement).value)"
      >
      <input
        :value="column.widthMm"
        :disabled="locked"
        type="number"
        min="1"
        class="pp:w-14 pp:rounded-lg pp:border pp:border-app-border2 pp:px-1.5 pp:py-1 pp:text-xs"
        :title="t('panel.columnWeight')"
        @change="reweighColumn(index, Number.parseFloat(($event.target as HTMLInputElement).value) || 1)"
      >
      <button
        type="button"
        class="pp:rounded pp:px-1.5 pp:py-1 pp:text-xs pp:text-app-text3 pp:hover:bg-rose-50 pp:hover:text-rose-600 pp:disabled:opacity-30"
        :disabled="locked || element.columns.length <= 1"
        :data-pp-remove-column="index"
        @click="removeColumn(index)"
      >
        ✕
      </button>
    </div>
    <button
      type="button"
      class="pp:rounded-lg pp:border pp:border-dashed pp:border-app-border2 pp:px-2 pp:py-1 pp:text-xs pp:text-app-text2 pp:hover:border-brand-500 pp:hover:text-brand-600 pp:disabled:opacity-40"
      :disabled="locked"
      data-pp-add-column
      @click="addColumn"
    >
      + {{ t('panel.addColumn') }}
    </button>

    <!-- data grid -->
    <h4 class="pp:text-[10px] pp:font-semibold pp:uppercase pp:text-app-text3">
      {{ t('panel.rows') }} ({{ element.rows.length }})
    </h4>
    <div class="pp:overflow-x-auto">
      <table class="pp:border-collapse">
        <tbody>
          <tr
            v-for="(row, rowIndex) in element.rows"
            :key="rowIndex"
          >
            <td
              v-for="(column, columnIndex) in element.columns"
              :key="column.id"
              class="pp:p-0.5"
            >
              <input
                :value="row[columnIndex] ?? ''"
                :disabled="locked"
                type="text"
                class="pp:w-20 pp:rounded pp:border pp:border-app-border2 pp:px-1.5 pp:py-1 pp:text-xs"
                :data-pp-cell="`${rowIndex}-${columnIndex}`"
                @change="editCell(rowIndex, columnIndex, ($event.target as HTMLInputElement).value)"
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pp:flex pp:gap-2">
      <button
        type="button"
        class="pp:flex-1 pp:rounded-lg pp:border pp:border-dashed pp:border-app-border2 pp:px-2 pp:py-1 pp:text-xs pp:text-app-text2 pp:hover:border-brand-500 pp:hover:text-brand-600 pp:disabled:opacity-40"
        :disabled="locked"
        data-pp-add-row
        @click="addRow"
      >
        + {{ t('panel.addRow') }}
      </button>
      <button
        type="button"
        class="pp:rounded-lg pp:border pp:border-app-border2 pp:px-2 pp:py-1 pp:text-xs pp:text-app-text2 pp:hover:bg-rose-50 pp:hover:text-rose-600 pp:disabled:opacity-40"
        :disabled="locked || element.rows.length === 0"
        data-pp-remove-row
        @click="removeLastRow"
      >
        − {{ t('panel.removeRow') }}
      </button>
    </div>
  </section>
</template>
