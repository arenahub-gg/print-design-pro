<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, toRaw, toRef, watch } from 'vue'
import { provideEditorI18n } from '../../composables/use-editor-i18n'
import { cloneJson } from '../../core/clone'
import { openTemplate } from '../../core/open-template'
import type { TemplateDocument } from '../../core/schema/template'
import type { EditorLocale } from '../../locales/messages'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import { useSelectionStore } from '../../stores/selection-store'
import { printDocument } from '../../render/print-browser'
import CanvasViewport from '../canvas/CanvasViewport.vue'
import EditorTopBar from './EditorTopBar.vue'
import ElementPalette from './ElementPalette.vue'
import PrintPreviewDialog from './PrintPreviewDialog.vue'
import PropertiesPanel from './PropertiesPanel.vue'

// Public root component. v-model contract: the host passes a document in;
// the editor emits debounced snapshots after every edit. Persistence is
// entirely the host's job - the library has zero storage code.
const props = withDefaults(defineProps<{
  modelValue: TemplateDocument
  locale?: EditorLocale
}>(), {
  locale: 'en',
})

const emit = defineEmits<{ 'update:modelValue': [doc: TemplateDocument] }>()

const doc = useDocumentStore()
const history = useHistoryStore()
const selection = useSelectionStore()

provideEditorI18n(toRef(props, 'locale'))

const viewportRef = ref<InstanceType<typeof CanvasViewport> | null>(null)
const previewOpen = ref(false)
const printing = ref(false)

async function printNow(): Promise<void> {
  if (printing.value)
    return
  printing.value = true
  try {
    await printDocument(cloneJson(doc.document))
  }
  catch (error) {
    // The library has no toast system - surface for the host's console.
    console.error('[pro-print] print failed:', error)
  }
  finally {
    printing.value = false
  }
}

/** The exact object we last emitted - lets the watch tell a v-model echo apart from a real replacement (e.g. JSON import with the same id). */
let lastEmittedSnapshot: TemplateDocument | null = null
/** editVersion right after open (history.clear bumps it) - suppresses the phantom snapshot/save an open would otherwise trigger. */
let openBaselineVersion = -1
let emitTimer: ReturnType<typeof setTimeout> | null = null

function open(next: TemplateDocument): void {
  // A pending emit from the PREVIOUS document must never fire after a
  // replacement - it would snapshot the new document and phantom-save it.
  if (emitTimer) {
    clearTimeout(emitTimer)
    emitTimer = null
  }
  openTemplate(next, { document: doc, history, selection })
  openBaselineVersion = history.editVersion
}

onMounted(() => open(props.modelValue))

// Any modelValue that is not our own emitted snapshot is a document
// replacement (template switch OR same-id import) and reopens the editor.
// toRaw: hosts keep the document in a ref(), which hands back a reactive
// PROXY of the snapshot we emitted - identity must compare raw objects or
// every echo would reopen (clearing selection and undo history).
watch(() => props.modelValue, (next) => {
  if (toRaw(next) !== lastEmittedSnapshot)
    open(next)
})

// Debounced snapshot emission keyed off the edit counter.
const EMIT_DEBOUNCE_MS = 400
watch(() => history.editVersion, (version) => {
  if (version === openBaselineVersion)
    return
  if (emitTimer)
    clearTimeout(emitTimer)
  emitTimer = setTimeout(() => {
    emitTimer = null
    lastEmittedSnapshot = cloneJson(doc.document)
    emit('update:modelValue', lastEmittedSnapshot)
  }, EMIT_DEBOUNCE_MS)
})

onBeforeUnmount(() => {
  if (emitTimer) {
    clearTimeout(emitTimer)
    // Flush pending edits so the host never loses the last change.
    lastEmittedSnapshot = cloneJson(doc.document)
    emit('update:modelValue', lastEmittedSnapshot)
  }
})
</script>

<template>
  <div
    class="pp:grid pp:h-full pp:min-h-0 pp:grid-rows-[3.5rem_1fr] pp:bg-surface-canvas pp:text-slate-800"
    data-pp-designer
  >
    <EditorTopBar
      @fit="viewportRef?.fit()"
      @preview="previewOpen = true"
      @print="printNow"
    >
      <template #actions>
        <slot name="actions" />
      </template>
    </EditorTopBar>

    <PrintPreviewDialog
      :open="previewOpen"
      @close="previewOpen = false"
    />

    <div class="pp:grid pp:min-h-0 pp:grid-cols-[13rem_1fr_17rem] max-lg:pp:grid-cols-[10rem_1fr_14rem]">
      <aside class="pp:min-h-0 pp:border-r pp:border-slate-200">
        <ElementPalette />
      </aside>
      <main class="pp:min-h-0">
        <CanvasViewport ref="viewportRef" />
      </main>
      <aside class="pp:min-h-0 pp:border-l pp:border-slate-200">
        <PropertiesPanel />
      </aside>
    </div>
  </div>
</template>
