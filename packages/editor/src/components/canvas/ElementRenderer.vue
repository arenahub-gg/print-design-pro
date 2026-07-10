<script setup lang="ts">
import { computed } from 'vue'
import type { TemplateElement } from '../../core/schema/elements'
import { mmToPx } from '../../core/units'

// Render decision (validated): each element is an absolutely-positioned div
// carrying the rotate transform; shapes are SVG inside the div, text is
// styled DOM. Read-only in phase 3 - interaction handles arrive in phase 4.
const props = defineProps<{ element: TemplateElement }>()

const box = computed(() => ({
  left: mmToPx(props.element.xMm),
  top: mmToPx(props.element.yMm),
  width: mmToPx(props.element.widthMm),
  height: mmToPx(props.element.heightMm),
}))

const wrapperStyle = computed(() => ({
  left: `${box.value.left}px`,
  top: `${box.value.top}px`,
  width: `${box.value.width}px`,
  height: `${box.value.height}px`,
  transform: `rotate(${props.element.rotation}deg)`,
  transformOrigin: 'center center',
}))

/** 1pt = 1/72 inch -> px at CSS 96dpi. */
function ptToPx(pt: number): number {
  return (pt * 96) / 72
}
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
      />
    </svg>

    <svg
      v-else-if="element.type === 'line'"
      class="pp:block pp:h-full pp:w-full pp:overflow-visible"
    >
      <line
        x1="0"
        :y1="box.height / 2"
        :x2="box.width"
        :y2="box.height / 2"
        :stroke="element.strokeColor"
        :stroke-width="mmToPx(element.strokeWidthMm)"
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
      />
    </svg>

    <!-- eslint-disable vue/multiline-html-element-content-newline -- pre-wrap: a line break inside the tag becomes visible whitespace in the rendered text -->
    <div
      v-else-if="element.type === 'text'"
      class="pp:h-full pp:w-full pp:overflow-hidden pp:whitespace-pre-wrap pp:break-words"
      :style="{
        fontSize: `${ptToPx(element.fontSizePt)}px`,
        fontWeight: element.fontWeight,
        textAlign: element.align,
        color: element.color,
        lineHeight: 1.25,
      }"
    >{{ element.content }}</div>
    <!-- eslint-enable vue/multiline-html-element-content-newline -->

    <!-- image: schema stub, no renderer until a later round -->
  </div>
</template>
