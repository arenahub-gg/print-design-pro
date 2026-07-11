<script setup lang="ts">
import { ref } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { renameTemplateCommand } from '../../core/commands/element-commands'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import { useViewportStore } from '../../stores/viewport-store'

// Top bar: inline-editable document name, undo/redo, zoom, grid toggle.
// The host app injects its own actions (save/export/import) via #actions.
const emit = defineEmits<{ fit: [], preview: [], print: [] }>()

const doc = useDocumentStore()
const history = useHistoryStore()
const viewport = useViewportStore()
const { t } = useEditorI18n()

const editingName = ref(false)
const nameDraft = ref('')
// Escape removes the input, which fires a blur on the detached element in
// Chromium - the flag stops that blur from committing anyway.
let renameCancelled = false

function startRename(): void {
  nameDraft.value = doc.document.name
  renameCancelled = false
  editingName.value = true
}

function cancelRename(): void {
  renameCancelled = true
  editingName.value = false
}

function commitRename(): void {
  if (renameCancelled)
    return
  editingName.value = false
  const name = nameDraft.value.trim()
  if (name && name !== doc.document.name)
    history.dispatch(renameTemplateCommand(doc, name))
}
</script>

<template>
  <header class="pp:flex pp:h-14 pp:items-center pp:gap-2 pp:border-b pp:border-slate-200 pp:bg-white pp:px-3">
    <!-- name -->
    <input
      v-if="editingName"
      v-model="nameDraft"
      class="pp:w-56 pp:rounded-lg pp:border pp:border-brand-500 pp:px-2 pp:py-1.5 pp:text-sm pp:font-medium focus:pp:outline-none"
      data-pp-name-input
      @blur="commitRename"
      @keydown.enter.prevent="commitRename"
      @keydown.escape="cancelRename"
    >
    <button
      v-else
      type="button"
      class="pp:max-w-64 pp:truncate pp:rounded-lg pp:px-2 pp:py-1.5 pp:text-sm pp:font-medium pp:text-slate-800 hover:pp:bg-slate-100"
      data-pp-name
      :title="doc.document.name"
      @click="startRename"
    >
      {{ doc.document.name || t('topbar.untitled') }}
    </button>

    <div class="pp:mx-1 pp:h-6 pp:w-px pp:bg-slate-200" />

    <!-- undo / redo -->
    <button
      type="button"
      class="pp:rounded-lg pp:px-2 pp:py-1.5 pp:text-sm pp:text-slate-600 hover:pp:bg-slate-100 disabled:pp:opacity-40"
      :disabled="!history.canUndo"
      :title="`${t('topbar.undo')}${history.undoLabel ? ` — ${history.undoLabel}` : ''}`"
      data-pp-undo
      @click="history.undo()"
    >
      ↶
    </button>
    <button
      type="button"
      class="pp:rounded-lg pp:px-2 pp:py-1.5 pp:text-sm pp:text-slate-600 hover:pp:bg-slate-100 disabled:pp:opacity-40"
      :disabled="!history.canRedo"
      :title="t('topbar.redo')"
      data-pp-redo
      @click="history.redo()"
    >
      ↷
    </button>

    <div class="pp:mx-1 pp:h-6 pp:w-px pp:bg-slate-200" />

    <!-- zoom -->
    <button
      type="button"
      class="pp:rounded-lg pp:px-2 pp:py-1.5 pp:text-xs pp:text-slate-600 hover:pp:bg-slate-100"
      @click="emit('fit')"
    >
      {{ t('topbar.zoomFit') }}
    </button>
    <button
      type="button"
      class="pp:rounded-lg pp:px-2 pp:py-1.5 pp:text-xs pp:text-slate-600 hover:pp:bg-slate-100"
      @click="viewport.setZoom(1)"
    >
      {{ t('topbar.zoom100') }}
    </button>
    <span class="pp:w-12 pp:text-center pp:text-xs pp:tabular-nums pp:text-slate-500">{{ viewport.zoomPercent }}%</span>

    <label class="pp:flex pp:items-center pp:gap-1.5 pp:text-xs pp:text-slate-600">
      <input
        v-model="viewport.showGrid"
        type="checkbox"
        class="pp:accent-brand-500"
      >
      {{ t('topbar.grid') }}
    </label>

    <div class="pp:ml-auto pp:flex pp:items-center pp:gap-2">
      <button
        type="button"
        class="pp:rounded-lg pp:border pp:border-slate-200 pp:px-3 pp:py-1.5 pp:text-xs pp:text-slate-600 hover:pp:bg-slate-50"
        data-pp-preview-button
        @click="emit('preview')"
      >
        {{ t('topbar.preview') }}
      </button>
      <button
        type="button"
        class="pp:rounded-lg pp:bg-brand-500 pp:px-3 pp:py-1.5 pp:text-xs pp:font-medium pp:text-white hover:pp:bg-brand-600"
        data-pp-print-button
        @click="emit('print')"
      >
        {{ t('topbar.print') }}
      </button>
      <slot name="actions" />
    </div>
  </header>
</template>
