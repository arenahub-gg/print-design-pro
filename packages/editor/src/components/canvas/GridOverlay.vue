<script setup lang="ts">
import { computed } from 'vue'
import { mmToPx } from '../../core/units'

// mm grid over the page: light 1mm minor lines, stronger 10mm majors.
// Implemented as tiled CSS gradients - SVG patterns at this tile count
// (200+ x 300+ cells on A4) proved expensive enough to stall rasterization.
const minorPx = computed(() => mmToPx(1))
const majorPx = computed(() => mmToPx(10))

const gridStyle = computed(() => ({
  backgroundImage: [
    'linear-gradient(to right, rgba(15,23,42,0.12) 1px, transparent 1px)',
    'linear-gradient(to bottom, rgba(15,23,42,0.12) 1px, transparent 1px)',
    'linear-gradient(to right, rgba(15,23,42,0.05) 1px, transparent 1px)',
    'linear-gradient(to bottom, rgba(15,23,42,0.05) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: [
    `${majorPx.value}px ${majorPx.value}px`,
    `${majorPx.value}px ${majorPx.value}px`,
    `${minorPx.value}px ${minorPx.value}px`,
    `${minorPx.value}px ${minorPx.value}px`,
  ].join(', '),
}))
</script>

<template>
  <div
    class="pp:pointer-events-none pp:absolute pp:inset-0"
    :style="gridStyle"
    data-pp-grid
  />
</template>
