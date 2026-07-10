<script setup lang="ts">
import { computed } from 'vue'
import { mmToPx } from '../../core/units'
import { useDocumentStore } from '../../stores/document-store'

// The physical page at true scale (zoom handled by CanvasStage transform).
// Dashed inset marks print margins - purely informational.
const doc = useDocumentStore()

const pagePx = computed(() => ({
  width: mmToPx(doc.page.widthMm),
  height: mmToPx(doc.page.heightMm),
}))

const marginInsetPx = computed(() => ({
  top: mmToPx(doc.page.marginTopMm),
  right: mmToPx(doc.page.marginRightMm),
  bottom: mmToPx(doc.page.marginBottomMm),
  left: mmToPx(doc.page.marginLeftMm),
}))

const hasMargins = computed(() =>
  doc.page.marginTopMm > 0 || doc.page.marginRightMm > 0
  || doc.page.marginBottomMm > 0 || doc.page.marginLeftMm > 0,
)
</script>

<template>
  <div
    class="pp:relative pp:bg-white pp:shadow-lg"
    :style="{ width: `${pagePx.width}px`, height: `${pagePx.height}px` }"
    data-pp-page
  >
    <div
      v-if="hasMargins"
      class="pp:pointer-events-none pp:absolute pp:border pp:border-dashed pp:border-sky-300"
      :style="{
        top: `${marginInsetPx.top}px`,
        right: `${marginInsetPx.right}px`,
        bottom: `${marginInsetPx.bottom}px`,
        left: `${marginInsetPx.left}px`,
      }"
    />
    <slot />
  </div>
</template>
