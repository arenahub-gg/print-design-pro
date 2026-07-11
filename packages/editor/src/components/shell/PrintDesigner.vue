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
import CanvasViewport from '../canvas/CanvasViewport.vue'
import EditorTopBar from './EditorTopBar.vue'
import LayersPanel from './LayersPanel.vue'
import PaperPresetPanel from './PaperPresetPanel.vue'
import ExportDialog from './ExportDialog.vue'
import PropertiesPanel from './PropertiesPanel.vue'
import StatusBar from './StatusBar.vue'

// Public root component - PrintDesignPro layout (round 5): topbar with tool
// strip, paper-preset left panel, canvas + status bar center, layers +
// properties right panel. v-model contract unchanged: host passes a document
// in, the editor emits debounced snapshots; persistence is the host's job.
const props = withDefaults(defineProps<{
  modelValue: TemplateDocument
  locale?: EditorLocale
  /** Host-driven autosave indicator for the topbar. */
  saving?: boolean
}>(), {
  locale: 'en',
  saving: false,
})

const emit = defineEmits<{
  'update:modelValue': [doc: TemplateDocument]
  /** Logo/back clicked - host decides where home is. */
  'home': []
}>()

const doc = useDocumentStore()
const history = useHistoryStore()
const selection = useSelectionStore()

provideEditorI18n(toRef(props, 'locale'))

const viewportRef = ref<InstanceType<typeof CanvasViewport> | null>(null)
const exportOpen = ref(false)

/** Transient banner for image upload errors from the tool strip. */
const noticeText = ref<string | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | null = null

function showNotice(message: string): void {
  noticeText.value = message
  if (noticeTimer)
    clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    noticeText.value = null
  }, 4000)
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
  if (noticeTimer)
    clearTimeout(noticeTimer)
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
    class="pp:relative pp:grid pp:h-full pp:min-h-0 pp:grid-rows-[52px_1fr] pp:bg-app-bg pp:font-ui pp:text-app-text"
    data-pp-designer
  >
    <EditorTopBar
      :saving="saving"
      @home="emit('home')"
      @export="exportOpen = true"
      @fit="viewportRef?.fit()"
      @image-error="showNotice"
    >
      <template #actions>
        <slot name="actions" />
      </template>
    </EditorTopBar>

    <div class="pp:grid pp:min-h-0 pp:grid-cols-[248px_1fr_264px] pp:max-lg:grid-cols-[200px_1fr_220px]">
      <aside class="pp:min-h-0 pp:border-r pp:border-app-border">
        <PaperPresetPanel @preset-applied="viewportRef?.fit()" />
      </aside>

      <main class="pp:grid pp:min-h-0 pp:grid-rows-[1fr_28px]">
        <div class="pp:min-h-0">
          <CanvasViewport ref="viewportRef" />
        </div>
        <StatusBar @preset-applied="viewportRef?.fit()" />
      </main>

      <aside class="pp:flex pp:min-h-0 pp:flex-col pp:border-l pp:border-app-border pp:bg-app-panel">
        <LayersPanel />
        <div class="pp:min-h-0 pp:flex-1">
          <PropertiesPanel />
        </div>
      </aside>
    </div>

    <ExportDialog
      :open="exportOpen"
      @close="exportOpen = false"
    />

    <!-- transient notice (image upload errors) -->
    <div
      v-if="noticeText"
      class="pp:absolute pp:left-1/2 pp:top-16 pp:z-50 pp:-translate-x-1/2 pp:rounded-lg pp:bg-rose-50 pp:px-3 pp:py-2 pp:text-xs pp:text-rose-600 pp:shadow-app"
      data-pp-notice
    >
      {{ noticeText }}
    </div>
  </div>
</template>
