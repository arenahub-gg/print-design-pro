<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { addGuideCommand } from '../../core/commands/element-commands'
import { newId, type Guide } from '../../core/schema/template'
import { roundMm } from '../../core/units'
import { useCanvasGestures } from '../../composables/use-canvas-gestures'
import { usePointerDrag } from '../../composables/use-pointer-drag'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import { useViewportStore } from '../../stores/viewport-store'
import CanvasRuler from './CanvasRuler.vue'
import CanvasStage from './CanvasStage.vue'
import ElementLayer from './ElementLayer.vue'
import GridOverlay from './GridOverlay.vue'
import GuideLayer from './GuideLayer.vue'
import PageView from './PageView.vue'

// Viewport shell: owns the container, rulers, gestures, fit-on-mount, and
// the drag-a-guide-out-of-a-ruler interaction. Page content lives on the
// single-transform CanvasStage.
const RULER_PX = 24

const doc = useDocumentStore()
const history = useHistoryStore()
const viewport = useViewportStore()

const containerRef = ref<HTMLElement | null>(null)
const { isSpaceDown } = useCanvasGestures(containerRef, viewport)
const drag = usePointerDrag()

/** Guide preview while dragging from a ruler (not yet in the document). */
const draftGuide = ref<Guide | null>(null)

const cursorClass = computed(() => {
  if (viewport.isPanning)
    return 'pp:cursor-grabbing'
  if (isSpaceDown.value)
    return 'pp:cursor-grab'
  return ''
})

function localPoint(event: PointerEvent): { x: number, y: number } {
  const rect = containerRef.value!.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function onGuideStart(orientation: 'horizontal' | 'vertical', event: PointerEvent): void {
  const container = containerRef.value
  if (!container)
    return
  const started = drag.startDrag(container, event, {
    onMove: (move) => {
      if (draftGuide.value)
        draftGuide.value = { ...draftGuide.value, positionMm: positionFor(orientation, move) }
    },
    onEnd: (up) => {
      const guide = draftGuide.value
      draftGuide.value = null
      // Only commit when released over the canvas area (past the rulers).
      const point = localPoint(up)
      if (guide && point.x > RULER_PX && point.y > RULER_PX)
        history.dispatch(addGuideCommand(doc, guide))
    },
    onCancel: () => {
      draftGuide.value = null
    },
  })
  if (started)
    draftGuide.value = { id: newId(), orientation, positionMm: positionFor(orientation, event) }
}

function positionFor(orientation: 'horizontal' | 'vertical', event: PointerEvent): number {
  const page = viewport.screenToPageMm(localPoint(event))
  return roundMm(orientation === 'vertical' ? page.xMm : page.yMm)
}

function fit(): void {
  const container = containerRef.value
  if (!container)
    return
  viewport.fitToPage(
    { width: container.clientWidth, height: container.clientHeight },
    { widthMm: doc.page.widthMm, heightMm: doc.page.heightMm },
  )
}

let resizeObserver: ResizeObserver | null = null
let hasFitted = false

// Fit once, as soon as the container actually has a size. A mount inside a
// hidden tab/modal reports 0x0 - fitting then would clamp to garbage, so we
// wait for the first real layout via ResizeObserver. Later resizes keep the
// user's zoom/pan untouched.
function tryInitialFit(): void {
  const container = containerRef.value
  if (hasFitted || !container || container.clientWidth === 0 || container.clientHeight === 0)
    return
  hasFitted = true
  fit()
}

onMounted(() => {
  tryInitialFit()
  resizeObserver = new ResizeObserver(tryInitialFit)
  if (containerRef.value)
    resizeObserver.observe(containerRef.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())

defineExpose({ fit })
</script>

<template>
  <div
    ref="containerRef"
    tabindex="0"
    class="pp:relative pp:h-full pp:w-full pp:overflow-hidden pp:bg-(--color-surface-canvas) pp:outline-none"
    :class="cursorClass"
    data-pp-viewport
  >
    <CanvasStage>
      <PageView>
        <GridOverlay v-if="viewport.showGrid" />
        <ElementLayer />
        <GuideLayer :draft-guide="draftGuide" />
      </PageView>
    </CanvasStage>

    <!-- Rulers overlay the top/left edges; corner square joins them -->
    <div
      class="pp:absolute pp:top-0 pp:left-0 pp:z-10 pp:border-r pp:border-b pp:border-slate-200 pp:bg-slate-50"
      :style="{ width: `${RULER_PX}px`, height: `${RULER_PX}px` }"
    />
    <div
      class="pp:absolute pp:top-0 pp:right-0 pp:z-10 pp:border-b pp:border-slate-200"
      :style="{ left: `${RULER_PX}px`, height: `${RULER_PX}px` }"
    >
      <CanvasRuler
        orientation="horizontal"
        :thickness="RULER_PX"
        :origin-px="RULER_PX"
        @guide-start="onGuideStart"
      />
    </div>
    <div
      class="pp:absolute pp:bottom-0 pp:left-0 pp:z-10 pp:border-r pp:border-slate-200"
      :style="{ top: `${RULER_PX}px`, width: `${RULER_PX}px` }"
    >
      <CanvasRuler
        orientation="vertical"
        :thickness="RULER_PX"
        :origin-px="RULER_PX"
        @guide-start="onGuideStart"
      />
    </div>

    <slot />
  </div>
</template>
