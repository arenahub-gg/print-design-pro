<script setup lang="ts">
import { computed } from 'vue'
import { mmToPx } from '../../core/units'
import { useInteractionStore } from '../../stores/interaction-store'
import { useViewportStore } from '../../stores/viewport-store'

// Rubber-band rectangle while drag-selecting on empty canvas.
const interaction = useInteractionStore()
const viewport = useViewportStore()

const style = computed(() => {
  const rect = interaction.marquee
  if (!rect)
    return null
  return {
    left: `${mmToPx(rect.xMm)}px`,
    top: `${mmToPx(rect.yMm)}px`,
    width: `${mmToPx(rect.widthMm)}px`,
    height: `${mmToPx(rect.heightMm)}px`,
    borderWidth: `${1 / viewport.zoom}px`,
  }
})
</script>

<template>
  <div
    v-if="style"
    class="pp:pointer-events-none pp:absolute pp:border-dashed pp:border-brand-500 pp:bg-brand-500/10"
    :style="style"
    data-pp-marquee
  />
</template>
