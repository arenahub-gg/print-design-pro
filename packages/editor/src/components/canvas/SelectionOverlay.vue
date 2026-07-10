<script setup lang="ts">
import { computed } from 'vue'
import { combinedAabb, rotatedRectAabb } from '../../core/geometry'
import { HANDLE_DIRECTIONS, type HandleId } from '../../core/resize-math'
import { mmToPx } from '../../core/units'
import { useDocumentStore } from '../../stores/document-store'
import { useInteractionStore } from '../../stores/interaction-store'
import { useSelectionStore } from '../../stores/selection-store'
import { useViewportStore } from '../../stores/viewport-store'

// Selection chrome in page space. Single selection: outline + handles rotate
// with the element (resize math runs in its local frame). Multi: axis-aligned
// group box. Handle/outline sizes are counter-scaled by zoom so they stay
// constant on screen.
const emit = defineEmits<{
  resizeStart: [handle: HandleId, event: PointerEvent]
  rotateStart: [event: PointerEvent]
}>()

const doc = useDocumentStore()
const selection = useSelectionStore()
const viewport = useViewportStore()
const interaction = useInteractionStore()

const HANDLES = Object.keys(HANDLE_DIRECTIONS) as HandleId[]

const selectedElements = computed(() =>
  doc.elements
    .filter(el => selection.isSelected(el.id))
    .map(el => interaction.effectiveElement(el)),
)

const hasUnlocked = computed(() => selectedElements.value.some(el => !el.locked))

/**
 * Elements the frame (and gestures) operate on. Gestures skip locked
 * elements, so when the selection mixes locked/unlocked the frame must
 * reflect only the unlocked set - otherwise handle positions and resize
 * math would disagree and the first pointermove would jump.
 */
const frameElements = computed(() =>
  hasUnlocked.value ? selectedElements.value.filter(el => !el.locked) : selectedElements.value,
)

const single = computed(() =>
  frameElements.value.length === 1 ? frameElements.value[0]! : null,
)

/** Axis-aligned group frame (multi-selection). */
const groupBox = computed(() => {
  if (frameElements.value.length < 2)
    return null
  return combinedAabb(frameElements.value.map(el =>
    rotatedRectAabb({ xMm: el.xMm, yMm: el.yMm, widthMm: el.widthMm, heightMm: el.heightMm }, el.rotation),
  ))
})

const px = computed(() => 1 / viewport.zoom)
const handleSizePx = computed(() => 9 * px.value)
const rotateOffsetPx = computed(() => 22 * px.value)

const frame = computed(() => {
  if (single.value) {
    const el = single.value
    return {
      left: mmToPx(el.xMm),
      top: mmToPx(el.yMm),
      width: mmToPx(el.widthMm),
      height: mmToPx(el.heightMm),
      rotation: el.rotation,
    }
  }
  if (groupBox.value) {
    const box = groupBox.value
    return {
      left: mmToPx(box.left),
      top: mmToPx(box.top),
      width: mmToPx(box.right - box.left),
      height: mmToPx(box.bottom - box.top),
      rotation: 0,
    }
  }
  return null
})

function handlePosition(handle: HandleId): Record<string, string> {
  const { dx, dy } = HANDLE_DIRECTIONS[handle]
  const half = handleSizePx.value / 2
  return {
    left: `calc(${(dx + 1) * 50}% - ${half}px)`,
    top: `calc(${(dy + 1) * 50}% - ${half}px)`,
    width: `${handleSizePx.value}px`,
    height: `${handleSizePx.value}px`,
  }
}

const HANDLE_CURSORS: Record<HandleId, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
}
</script>

<template>
  <div
    v-if="frame && selection.hasSelection"
    class="pp:pointer-events-none pp:absolute"
    :style="{
      left: `${frame.left}px`,
      top: `${frame.top}px`,
      width: `${frame.width}px`,
      height: `${frame.height}px`,
      transform: `rotate(${frame.rotation}deg)`,
      transformOrigin: 'center center',
    }"
    data-pp-selection
  >
    <!-- outline -->
    <div
      class="pp:absolute pp:inset-0 pp:border-brand-500 pp:border-solid"
      :style="{ borderWidth: `${1.5 * px}px` }"
    />

    <template v-if="hasUnlocked">
      <!-- rotate handle: stem + grip above top-center -->
      <div
        class="pp:pointer-events-auto pp:absolute pp:rounded-full pp:border-solid pp:border-brand-500 pp:bg-white pp:cursor-grab"
        :style="{
          left: `calc(50% - ${handleSizePx / 2}px)`,
          top: `${-rotateOffsetPx - handleSizePx}px`,
          width: `${handleSizePx}px`,
          height: `${handleSizePx}px`,
          borderWidth: `${1.5 * px}px`,
        }"
        data-pp-rotate-handle
        @pointerdown.stop.prevent="$event.button === 0 && emit('rotateStart', $event)"
      />
      <!-- resize handles -->
      <div
        v-for="handle in HANDLES"
        :key="handle"
        class="pp:pointer-events-auto pp:absolute pp:border-solid pp:border-brand-500 pp:bg-white"
        :style="{ ...handlePosition(handle), borderWidth: `${1.5 * px}px`, cursor: HANDLE_CURSORS[handle] }"
        :data-pp-handle="handle"
        @pointerdown.stop.prevent="$event.button === 0 && emit('resizeStart', handle, $event)"
      />
    </template>
  </div>
</template>
