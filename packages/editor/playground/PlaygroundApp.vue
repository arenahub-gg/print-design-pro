<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PrintDesigner from '../src/components/shell/PrintDesigner.vue'
import { addElementCommand } from '../src/core/commands/element-commands'
import { createEmptyTemplate, type TemplateDocument } from '../src/core/schema/template'
import { newId } from '../src/core/schema/template'
import '../src/styles/index.css'
import { useDocumentStore } from '../src/stores/document-store'
import { useHistoryStore } from '../src/stores/history-store'

// Playground now mounts the FULL shell (topbar/palette/canvas/properties) in
// a bare Vue 3 app - the strongest proof the library needs no Nuxt.
const doc = useDocumentStore()
const history = useHistoryStore()

const template = ref<TemplateDocument>(createEmptyTemplate('Playground'))
const lastSnapshotAt = ref<string>('never')

function onUpdate(snapshot: TemplateDocument): void {
  template.value = snapshot
  lastSnapshotAt.value = new Date().toLocaleTimeString()
}

// Perf bench: seed extra elements through commands (also exercises history).
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

onMounted(() => seed(6))
</script>

<template>
  <div style="display:flex; flex-direction:column; height:100%">
    <PrintDesigner
      :model-value="template"
      locale="vi"
      style="flex:1; min-height:0"
      @update:model-value="onUpdate"
    >
      <template #actions>
        <button
          style="font:12px system-ui; padding:4px 8px"
          @click="seed(100)"
        >
          seed 100
        </button>
        <span style="font:11px system-ui; color:#94a3b8">snapshot: {{ lastSnapshotAt }}</span>
      </template>
    </PrintDesigner>
  </div>
</template>
