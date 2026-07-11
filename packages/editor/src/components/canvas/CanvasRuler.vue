<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { rulerScaleForZoom } from '../../core/ruler-scale'
import { mmToPx } from '../../core/units'
import { useViewportStore } from '../../stores/viewport-store'

// One component serves both axes (identical math, swapped coordinates).
// Drawn on <canvas> at devicePixelRatio for crisp hairlines; redraws are
// rAF-throttled off viewport changes.
const props = defineProps<{
  orientation: 'horizontal' | 'vertical'
  /** Ruler thickness in CSS px. */
  thickness: number
  /**
   * Container-space offset of this ruler's leading edge (the corner square
   * width) - tick math runs in container coordinates, canvas draws locally.
   */
  originPx?: number
}>()

const emit = defineEmits<{
  /** User started dragging out a new guide from this ruler. */
  guideStart: [orientation: 'horizontal' | 'vertical', event: PointerEvent]
}>()

const viewport = useViewportStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isHorizontal = props.orientation === 'horizontal'

let frame = 0
let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null

function draw(): void {
  const canvas = canvasRef.value
  if (!canvas)
    return
  const dpr = window.devicePixelRatio || 1
  const cssWidth = canvas.clientWidth
  const cssHeight = canvas.clientHeight
  if (cssWidth === 0 || cssHeight === 0)
    return
  if (canvas.width !== cssWidth * dpr || canvas.height !== cssHeight * dpr) {
    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
  }

  const ctx = canvas.getContext('2d')
  if (!ctx)
    return
  // Theme-aware colors: canvas can't use CSS vars directly, so read the
  // emitted token values at draw time (the data-theme observer below
  // triggers a redraw on theme flips).
  const tokens = getComputedStyle(document.documentElement)
  const bg = tokens.getPropertyValue('--pp-color-app-panel').trim() || '#f8fafc'
  const tick = tokens.getPropertyValue('--pp-color-app-text3').trim() || 'rgba(100,116,139,.6)'
  const label = tokens.getPropertyValue('--pp-color-app-text2').trim() || 'rgba(71,85,105,1)'

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssWidth, cssHeight)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  const lengthPx = isHorizontal ? cssWidth : cssHeight
  const origin = props.originPx ?? 0
  const offset = (isHorizontal ? viewport.offsetX : viewport.offsetY) - origin
  const { minorStepMm, majorStepMm } = rulerScaleForZoom(viewport.zoom)

  // Visible page-mm range along this axis (canvas-local coordinates).
  const startMm = (0 - offset) / (mmToPx(1) * viewport.zoom)
  const endMm = (lengthPx - offset) / (mmToPx(1) * viewport.zoom)
  const firstTick = Math.floor(startMm / minorStepMm) * minorStepMm

  ctx.strokeStyle = tick
  ctx.fillStyle = label
  ctx.lineWidth = 1
  ctx.font = '9px system-ui, sans-serif'
  ctx.textBaseline = 'top'

  ctx.beginPath()
  for (let mm = firstTick; mm <= endMm; mm += minorStepMm) {
    const pos = Math.round(offset + mmToPx(mm) * viewport.zoom) + 0.5
    if (pos < 0 || pos > lengthPx)
      continue
    // Snap float steps to the grid to avoid drift on long runs.
    const isMajor = Math.abs(mm / majorStepMm - Math.round(mm / majorStepMm)) < 1e-6
    const tickLen = isMajor ? props.thickness : props.thickness * 0.4

    if (isHorizontal) {
      ctx.moveTo(pos, props.thickness - tickLen)
      ctx.lineTo(pos, props.thickness)
    }
    else {
      ctx.moveTo(props.thickness - tickLen, pos)
      ctx.lineTo(props.thickness, pos)
    }

    if (isMajor) {
      const label = String(Math.round(mm))
      if (isHorizontal) {
        ctx.fillText(label, pos + 2, 2)
      }
      else {
        ctx.save()
        ctx.translate(2, pos + 2)
        ctx.rotate(-Math.PI / 2)
        ctx.textAlign = 'right'
        ctx.fillText(label, 0, 0)
        ctx.restore()
      }
    }
  }
  ctx.stroke()
}

function scheduleDraw(): void {
  if (frame)
    return
  frame = requestAnimationFrame(() => {
    frame = 0
    draw()
  })
}

watch(
  () => [viewport.zoom, viewport.offsetX, viewport.offsetY],
  scheduleDraw,
)

onMounted(() => {
  draw()
  resizeObserver = new ResizeObserver(scheduleDraw)
  if (canvasRef.value)
    resizeObserver.observe(canvasRef.value)
  // Redraw when the theme attribute flips (colors are read at draw time).
  themeObserver = new MutationObserver(scheduleDraw)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

onBeforeUnmount(() => {
  if (frame)
    cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
})
</script>

<template>
  <!-- .stop: a ruler press must not bubble into the container's pan handler;
       button filter: only primary-button drags create guides -->
  <canvas
    ref="canvasRef"
    class="pp:block pp:h-full pp:w-full pp:cursor-crosshair pp:select-none"
    :data-pp-ruler="orientation"
    @pointerdown.prevent.stop="$event.button === 0 && $event.isPrimary && emit('guideStart', orientation, $event)"
  />
</template>
