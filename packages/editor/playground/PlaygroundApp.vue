<script setup lang="ts">
import { onMounted } from 'vue'
import CanvasViewport from '../src/components/canvas/CanvasViewport.vue'
import { addElementCommand } from '../src/core/commands/element-commands'
import { newId } from '../src/core/schema/template'
import '../src/styles/index.css'
import { useDocumentStore } from '../src/stores/document-store'
import { useHistoryStore } from '../src/stores/history-store'
import { useViewportStore } from '../src/stores/viewport-store'

const doc = useDocumentStore()
const history = useHistoryStore()
const viewport = useViewportStore()

// Seed a representative document so pan/zoom/ruler/grid work has something
// real to render (100-element perf case: press the "seed 100" button).
function seed(count: number): void {
  history.transact(`Seed ${count} elements`, () => {
    for (let i = 0; i < count; i++) {
      const x = 10 + (i % 10) * 19
      const y = 10 + Math.floor(i / 10) * 28
      history.dispatch(addElementCommand(doc, {
        id: newId(),
        type: 'rect',
        name: `Rect ${i}`,
        xMm: x,
        yMm: y,
        widthMm: 16,
        heightMm: 10,
        rotation: (i * 7) % 30,
        locked: false,
        visible: true,
        fillColor: `hsl(${(i * 37) % 360} 80% 85%)`,
        strokeColor: '#334155',
        strokeWidthMm: 0.3,
        cornerRadiusMm: 1,
      }))
    }
  })
}

onMounted(() => {
  history.dispatch(addElementCommand(doc, {
    id: newId(),
    type: 'text',
    name: 'Title',
    xMm: 20,
    yMm: 15,
    widthMm: 170,
    heightMm: 15,
    rotation: 0,
    locked: false,
    visible: true,
    content: 'Pro Print Designer — playground',
    fontSizePt: 24,
    fontWeight: 700,
    align: 'center',
    color: '#0f172a',
  }))
  seed(12)
})
</script>

<template>
  <div style="display:flex; flex-direction:column; height:100%">
    <div style="display:flex; gap:8px; padding:8px; border-bottom:1px solid #e2e8f0; font:13px system-ui">
      <button @click="viewport.zoomAt({ x: 400, y: 300 }, viewport.zoom * 1.25)">
        zoom +
      </button>
      <button @click="viewport.zoomAt({ x: 400, y: 300 }, viewport.zoom / 1.25)">
        zoom −
      </button>
      <button @click="viewport.setZoom(1)">
        100%
      </button>
      <button @click="viewport.showGrid = !viewport.showGrid">
        grid: {{ viewport.showGrid ? 'on' : 'off' }}
      </button>
      <button
        :disabled="!history.canUndo"
        @click="history.undo()"
      >
        undo
      </button>
      <button
        :disabled="!history.canRedo"
        @click="history.redo()"
      >
        redo
      </button>
      <button @click="seed(100)">
        seed 100
      </button>
      <span style="margin-left:auto">{{ viewport.zoomPercent }}% · {{ doc.elements.length }} elements</span>
    </div>
    <div style="flex:1; min-height:0">
      <CanvasViewport />
    </div>
  </div>
</template>
