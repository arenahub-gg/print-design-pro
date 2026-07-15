<script setup lang="ts">
import { computed } from 'vue'
import type { LineElement, ShapeElement, StrokeStyle, TemplateElement, TableElement } from '../../core/schema/elements'
import { dashPattern, lineArrowGeometry, shapePoints } from '../../core/shape-paths'
import { mmToPx } from '../../core/units'
import { ensureFontLoaded, fontStack } from '../../core/fonts'
import { substituteVariables } from '../../core/variables'
import { useBatchDataStore } from '../../stores/batch-data-store'
import { watch } from 'vue'
import { TEXT_FONT_STACK, TEXT_LINE_HEIGHT } from '../../render/text-layout'
import { useInteractionStore } from '../../stores/interaction-store'
import BarcodeView from './elements/BarcodeView.vue'
import QrView from './elements/QrView.vue'
import TableView from './elements/TableView.vue'

// Render decision (validated): each element is an absolutely-positioned div
// carrying the rotate transform; shapes are SVG inside the div, text is
// styled DOM. Geometry merges live gesture previews from the interaction
// store so drags render without touching the document.
const props = defineProps<{ element: TemplateElement }>()

const interaction = useInteractionStore()
const batchData = useBatchDataStore()

/** Preview shows the active data (samples or the selected CSV row). */
const textContent = computed(() =>
  props.element.type === 'text'
    ? substituteVariables(props.element.content, batchData.previewData)
    : '')

/** Custom document font (falls back to the pinned default stack). */
const textFontFamily = computed(() =>
  props.element.type === 'text' ? fontStack(props.element.fontFamily, TEXT_FONT_STACK) : TEXT_FONT_STACK)

// Load lazily so imported documents render their fonts without panel visits.
watch(
  () => (props.element.type === 'text' ? props.element.fontFamily : ''),
  family => void ensureFontLoaded(family),
  { immediate: true },
)

/** Schema state + any live gesture preview. */
const effective = computed(() => interaction.effectiveElement(props.element))

const box = computed(() => ({
  left: mmToPx(effective.value.xMm),
  top: mmToPx(effective.value.yMm),
  width: mmToPx(effective.value.widthMm),
  height: mmToPx(effective.value.heightMm),
}))

const wrapperStyle = computed(() => ({
  left: `${box.value.left}px`,
  top: `${box.value.top}px`,
  width: `${box.value.width}px`,
  height: `${box.value.height}px`,
  transform: `rotate(${effective.value.rotation}deg)`,
  transformOrigin: 'center center',
  cursor: props.element.locked ? 'default' : 'move',
}))

/** 1pt = 1/72 inch -> px at CSS 96dpi. */
function ptToPx(pt: number): number {
  return (pt * 96) / 72
}

/** stroke-dasharray value (px) from the shared mm pattern; undefined = solid. */
function dashPx(style: StrokeStyle, strokeWidthMm: number): string | undefined {
  const pattern = dashPattern(style, strokeWidthMm)
  return pattern.length ? pattern.map(mm => mmToPx(mm)).join(' ') : undefined
}

/** SVG points attribute (px) from shared mm polygon points. */
function pointsPx(points: ReadonlyArray<readonly [number, number]>): string {
  return points.map(([x, y]) => `${mmToPx(x)},${mmToPx(y)}`).join(' ')
}

/** Line geometry (shaft + arrowheads) from live effective mm dimensions. */
const lineGeometry = computed(() => {
  if (props.element.type !== 'line')
    return null
  const el = effective.value as LineElement
  return lineArrowGeometry(el.widthMm, el.heightMm, el.strokeWidthMm, el.startCap, el.endCap)
})

const shapePolygon = computed(() => {
  if (props.element.type !== 'shape')
    return ''
  const el = effective.value as ShapeElement
  return pointsPx(shapePoints(el.kind, el.widthMm, el.heightMm))
})
</script>

<template>
  <div
    v-if="element.visible"
    class="pp:absolute"
    :style="wrapperStyle"
    :data-pp-element-id="element.id"
    :data-pp-element-type="element.type"
  >
    <svg
      v-if="element.type === 'rect'"
      class="pp:block pp:h-full pp:w-full pp:overflow-visible"
    >
      <rect
        :x="mmToPx(element.strokeWidthMm) / 2"
        :y="mmToPx(element.strokeWidthMm) / 2"
        :width="Math.max(0, box.width - mmToPx(element.strokeWidthMm))"
        :height="Math.max(0, box.height - mmToPx(element.strokeWidthMm))"
        :rx="mmToPx(element.cornerRadiusMm)"
        :fill="element.fillColor"
        :stroke="element.strokeColor"
        :stroke-width="mmToPx(element.strokeWidthMm)"
        :stroke-dasharray="dashPx(element.strokeStyle, element.strokeWidthMm)"
      />
    </svg>

    <svg
      v-else-if="element.type === 'line' && lineGeometry"
      class="pp:block pp:h-full pp:w-full pp:overflow-visible"
    >
      <line
        :x1="mmToPx(lineGeometry.x1Mm)"
        :y1="box.height / 2"
        :x2="mmToPx(lineGeometry.x2Mm)"
        :y2="box.height / 2"
        :stroke="element.strokeColor"
        :stroke-width="mmToPx(element.strokeWidthMm)"
        :stroke-dasharray="dashPx(element.strokeStyle, element.strokeWidthMm)"
      />
      <polygon
        v-for="(head, index) in lineGeometry.heads"
        :key="index"
        :points="pointsPx(head)"
        :fill="element.strokeColor"
      />
    </svg>

    <svg
      v-else-if="element.type === 'circle'"
      class="pp:block pp:h-full pp:w-full pp:overflow-visible"
    >
      <ellipse
        :cx="box.width / 2"
        :cy="box.height / 2"
        :rx="Math.max(0, (box.width - mmToPx(element.strokeWidthMm)) / 2)"
        :ry="Math.max(0, (box.height - mmToPx(element.strokeWidthMm)) / 2)"
        :fill="element.fillColor"
        :stroke="element.strokeColor"
        :stroke-width="mmToPx(element.strokeWidthMm)"
        :stroke-dasharray="dashPx(element.strokeStyle, element.strokeWidthMm)"
      />
    </svg>

    <svg
      v-else-if="element.type === 'shape'"
      class="pp:block pp:h-full pp:w-full pp:overflow-visible"
    >
      <polygon
        :points="shapePolygon"
        :fill="element.fillColor"
        :stroke="element.strokeWidthMm > 0 ? element.strokeColor : 'none'"
        :stroke-width="mmToPx(element.strokeWidthMm)"
        :stroke-dasharray="dashPx(element.strokeStyle, element.strokeWidthMm)"
        stroke-linejoin="round"
      />
    </svg>

    <!-- eslint-disable vue/multiline-html-element-content-newline -- pre-wrap: a line break inside the tag becomes visible whitespace in the rendered text -->
    <div
      v-else-if="element.type === 'text'"
      class="pp:h-full pp:w-full pp:overflow-hidden pp:whitespace-pre-wrap pp:break-words"
      :style="{
        fontSize: `${ptToPx(element.fontSizePt)}px`,
        fontWeight: element.fontWeight,
        fontFamily: textFontFamily,
        textAlign: element.align,
        color: element.color,
        lineHeight: TEXT_LINE_HEIGHT,
      }"
    >{{ textContent }}</div>
    <!-- eslint-enable vue/multiline-html-element-content-newline -->

    <!-- effective (not element): table re-lays-out live during resize preview -->
    <TableView
      v-else-if="element.type === 'table'"
      :element="effective as TableElement"
    />

    <QrView
      v-else-if="element.type === 'qr'"
      :element="element"
    />

    <BarcodeView
      v-else-if="element.type === 'barcode'"
      :element="element"
    />

    <template v-else-if="element.type === 'image'">
      <!-- pointer-events none: the wrapper owns all gestures -->
      <img
        v-if="element.src"
        :src="element.src"
        alt=""
        draggable="false"
        class="pp:pointer-events-none pp:block pp:h-full pp:w-full"
        style="object-fit: fill"
      >
      <!-- editor-only placeholder; print paints nothing for a missing src -->
      <div
        v-else
        class="pp:flex pp:h-full pp:w-full pp:items-center pp:justify-center pp:border pp:border-dashed pp:border-slate-300 pp:text-[10px] pp:text-slate-400"
      >
        ?
      </div>
    </template>
  </div>
</template>
