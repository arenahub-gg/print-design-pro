<script setup lang="ts">
import { computed } from 'vue'
import { useViewportStore } from '../../stores/viewport-store'

// Single transformed container: pan/zoom is ONE CSS transform here, so the
// page and everything on it never re-layout during navigation.
const viewport = useViewportStore()

const transform = computed(() =>
  `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`,
)
</script>

<template>
  <div
    class="pp:absolute pp:top-0 pp:left-0"
    :style="{ transform, transformOrigin: '0 0' }"
  >
    <slot />
  </div>
</template>
