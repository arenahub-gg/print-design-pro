<script setup lang="ts">
import { computed } from 'vue'
import { mmToPx } from '../../core/units'
import { useDocumentStore } from '../../stores/document-store'
import { useInteractionStore } from '../../stores/interaction-store'
import { useViewportStore } from '../../stores/viewport-store'

// Transient alignment lines shown while a drag gesture snaps.
const doc = useDocumentStore()
const interaction = useInteractionStore()
const viewport = useViewportStore()

const thickness = computed(() => `${1 / viewport.zoom}px`)

const vertical = computed(() =>
  interaction.activeSnapVertical !== null ? mmToPx(interaction.activeSnapVertical) : null,
)
const horizontal = computed(() =>
  interaction.activeSnapHorizontal !== null ? mmToPx(interaction.activeSnapHorizontal) : null,
)

const pageWidthPx = computed(() => mmToPx(doc.page.widthMm))
const pageHeightPx = computed(() => mmToPx(doc.page.heightMm))
</script>

<template>
  <div class="pp:pointer-events-none pp:absolute pp:inset-0">
    <div
      v-if="vertical !== null"
      class="pp:absolute pp:bg-rose-500"
      :style="{ left: `${vertical}px`, top: '0', height: `${pageHeightPx}px`, width: thickness }"
      data-pp-snapline
    />
    <div
      v-if="horizontal !== null"
      class="pp:absolute pp:bg-rose-500"
      :style="{ top: `${horizontal}px`, left: '0', width: `${pageWidthPx}px`, height: thickness }"
      data-pp-snapline
    />
  </div>
</template>
