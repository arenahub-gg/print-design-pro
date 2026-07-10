<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePointerDrag } from '../../composables/use-pointer-drag'
import { moveGuideCommand, removeGuideCommand } from '../../core/commands/element-commands'
import type { Guide } from '../../core/schema/template'
import { mmToPx, roundMm } from '../../core/units'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import { useViewportStore } from '../../stores/viewport-store'

// Guides live in page space (mm). Dragging previews via a local override map
// and commits ONE undoable move command on release; double-click removes.
const props = defineProps<{
  /** Guide being dragged out from a ruler right now (not yet in the document). */
  draftGuide?: Guide | null
}>()

const doc = useDocumentStore()
const history = useHistoryStore()
const viewport = useViewportStore()
const drag = usePointerDrag()

const dragPreview = ref<{ id: string, positionMm: number } | null>(null)

const visibleGuides = computed<Guide[]>(() => {
  const guides = doc.guides.map(guide =>
    dragPreview.value?.id === guide.id
      ? { ...guide, positionMm: dragPreview.value.positionMm }
      : guide,
  )
  return props.draftGuide ? [...guides, props.draftGuide] : guides
})

/** Hit slop that stays ~8 screen px regardless of zoom. */
const hitSlopPx = computed(() => 8 / viewport.zoom)

function guideStyle(guide: Guide): Record<string, string> {
  const pos = mmToPx(guide.positionMm)
  return guide.orientation === 'vertical'
    ? { left: `${pos}px`, top: '0', bottom: '0', width: '0', borderLeftWidth: '1px' }
    : { top: `${pos}px`, left: '0', right: '0', height: '0', borderTopWidth: '1px' }
}

/**
 * Project a pointer event to page mm through the live viewport transform
 * (absolute, not delta-based - stays correct even if the user zooms or pans
 * mid-drag with the wheel).
 */
function pointerToPositionMm(orientation: Guide['orientation'], event: PointerEvent): number {
  const container = (event.target as HTMLElement).closest('[data-pp-viewport]')
  if (!container)
    return 0
  const rect = container.getBoundingClientRect()
  const page = viewport.screenToPageMm({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  return roundMm(orientation === 'vertical' ? page.xMm : page.yMm)
}

function startDrag(guide: Guide, event: PointerEvent): void {
  if (props.draftGuide || event.button !== 0)
    return
  const target = event.currentTarget as HTMLElement
  const startPosition = guide.positionMm

  drag.startDrag(target, event, {
    onMove: (move) => {
      dragPreview.value = { id: guide.id, positionMm: pointerToPositionMm(guide.orientation, move) }
    },
    onEnd: () => {
      if (dragPreview.value && dragPreview.value.positionMm !== startPosition)
        history.dispatch(moveGuideCommand(doc, guide.id, dragPreview.value.positionMm))
      dragPreview.value = null
    },
    onCancel: () => {
      dragPreview.value = null
    },
  })
}

function remove(guide: Guide): void {
  history.dispatch(removeGuideCommand(doc, guide.id))
}
</script>

<template>
  <div class="pp:absolute pp:inset-0 pp:overflow-visible pp:pointer-events-none">
    <div
      v-for="guide in visibleGuides"
      :key="guide.id"
      class="pp:absolute pp:border-cyan-400 pp:border-solid"
      :style="guideStyle(guide)"
      data-pp-guide
    >
      <!-- Invisible fat hit area so thin guides stay grabbable at any zoom -->
      <div
        class="pp:absolute pp:pointer-events-auto"
        :class="guide.orientation === 'vertical' ? 'pp:cursor-col-resize' : 'pp:cursor-row-resize'"
        :style="guide.orientation === 'vertical'
          ? { left: `${-hitSlopPx}px`, width: `${hitSlopPx * 2}px`, top: '0', bottom: '0' }
          : { top: `${-hitSlopPx}px`, height: `${hitSlopPx * 2}px`, left: '0', right: '0' }"
        @pointerdown.stop="startDrag(guide, $event)"
        @dblclick.stop="remove(guide)"
      />
    </div>
  </div>
</template>
