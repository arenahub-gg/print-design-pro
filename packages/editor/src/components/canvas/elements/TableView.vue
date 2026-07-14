<script setup lang="ts">
import { computed } from 'vue'
import { useEditorI18n } from '../../../composables/use-editor-i18n'
import type { TableElement } from '../../../core/schema/elements'
import { computeTableLayout, type TableRowLayout } from '../../../core/table-layout'
import { createTableMeasurer } from '../../../core/table-measurer'
import { mmToPx } from '../../../core/units'
import { substituteVariables } from '../../../core/variables'
import { useDocumentStore } from '../../../stores/document-store'
import { TEXT_FONT_STACK } from '../../../render/text-layout'

// DOM table renderer. Cells are ABSOLUTELY positioned from computeTableLayout
// (not HTML table auto-layout) so the editor is metric-identical to the print
// painter, which consumes the exact same layout.
const props = defineProps<{ element: TableElement }>()

const { t } = useEditorI18n()
const doc = useDocumentStore()

// Layout runs on SUBSTITUTED sample data - wrapped line counts must match
// what the print engine (which renders a resolved document) will produce.
const substituted = computed<TableElement>(() => ({
  ...props.element,
  columns: props.element.columns.map(column => ({
    ...column,
    title: substituteVariables(column.title, doc.document.variables),
  })),
  rows: props.element.rows.map(row =>
    row.map(cell => substituteVariables(cell, doc.document.variables))),
}))

const layout = computed(() =>
  computeTableLayout(substituted.value, createTableMeasurer(props.element.fontSizePt)),
)

const overflowing = computed(() => layout.value.contentHeightMm > props.element.heightMm + 0.05)

const fontSizePx = computed(() => mmToPx(layout.value.fontSizeMm))
const lineHeightPx = computed(() => mmToPx(layout.value.lineHeightMm))
const paddingPx = computed(() => mmToPx(props.element.cellPaddingMm))
// 0 means "no grid" (legal via import); otherwise keep hairlines visible.
const borderPx = computed(() =>
  props.element.borderWidthMm > 0 ? Math.max(0.5, mmToPx(props.element.borderWidthMm)) : 0,
)

interface CellBox {
  key: string
  left: number
  top: number
  width: number
  height: number
  lines: string[]
  bold: boolean
  background: string | null
}

function rowCells(row: TableRowLayout, rowKey: string, bold: boolean, background: string | null): CellBox[] {
  return row.cells.map((cell, columnIndex) => ({
    key: `${rowKey}-${columnIndex}`,
    left: mmToPx(layout.value.columnXs[columnIndex]!),
    top: mmToPx(row.yMm),
    width: mmToPx(layout.value.columnWidths[columnIndex]!),
    height: mmToPx(row.heightMm),
    lines: cell.lines,
    bold,
    background,
  }))
}

const cells = computed<CellBox[]>(() => {
  const result: CellBox[] = []
  if (layout.value.header)
    result.push(...rowCells(layout.value.header, 'h', true, props.element.headerBackground))
  layout.value.rows.forEach((row, rowIndex) => {
    result.push(...rowCells(row, `r${rowIndex}`, false, null))
  })
  return result
})
</script>

<template>
  <div class="pp:relative pp:h-full pp:w-full pp:overflow-hidden">
    <div
      v-for="cell in cells"
      :key="cell.key"
      class="pp:absolute pp:overflow-hidden"
      :style="{
        left: `${cell.left}px`,
        top: `${cell.top}px`,
        width: `${cell.width}px`,
        height: `${cell.height}px`,
        background: cell.background ?? undefined,
        // inset box-shadow, NOT border: border-box borders would shift the
        // text origin and shrink the wrap box relative to the print painter
        boxShadow: borderPx > 0 ? `inset 0 0 0 ${borderPx}px ${element.borderColor}` : undefined,
        padding: `${paddingPx}px`,
        fontSize: `${fontSizePx}px`,
        lineHeight: `${lineHeightPx}px`,
        fontWeight: cell.bold ? 700 : 400,
        fontFamily: TEXT_FONT_STACK,
        color: '#0f172a',
        whiteSpace: 'pre',
      }"
    >
      <!-- v-text: no template text nodes, so indentation can never leak into
           the pre-formatted content; fixed height mirrors the engine's
           per-line baseline advance exactly -->
      <div
        v-for="(line, lineIndex) in cell.lines"
        :key="lineIndex"
        :style="{ height: `${lineHeightPx}px` }"
        v-text="line"
      />
    </div>

    <!-- editor-only: content extends past the element box -->
    <div
      v-if="overflowing"
      class="pp:absolute pp:right-0.5 pp:bottom-0.5 pp:rounded pp:bg-amber-400 pp:px-1 pp:text-[8px] pp:font-bold pp:text-amber-950"
      data-pp-table-overflow
      :title="t('panel.tableOverflow')"
    >
      ⋯
    </div>
  </div>
</template>
