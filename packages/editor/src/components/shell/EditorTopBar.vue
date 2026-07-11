<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { useEditorTheme } from '../../composables/use-editor-theme'
import { renameTemplateCommand } from '../../core/commands/element-commands'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import { useViewportStore } from '../../stores/viewport-store'
import ElementToolStrip from './ElementToolStrip.vue'

// PrintDesignPro top bar (52px): logo->home, doc name + autosave state,
// centered element tool strip, undo/redo, zoom cluster, theme toggle,
// primary export CTA. The host provides `saving` and listens for home/export.
withDefaults(defineProps<{ saving?: boolean }>(), { saving: false })

const emit = defineEmits<{ home: [], export: [], fit: [], imageError: [message: string] }>()

const doc = useDocumentStore()
const history = useHistoryStore()
const viewport = useViewportStore()
const { t } = useEditorI18n()
const { theme, toggle: toggleTheme } = useEditorTheme()

const editingName = ref(false)
const nameDraft = ref('')
const nameInputRef = ref<HTMLInputElement | null>(null)
let renameCancelled = false

async function startRename(): Promise<void> {
  nameDraft.value = doc.document.name
  renameCancelled = false
  editingName.value = true
  await nextTick()
  nameInputRef.value?.focus()
  nameInputRef.value?.select()
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

function zoomStep(direction: 1 | -1): void {
  viewport.setZoom(viewport.zoom * (direction === 1 ? 1.15 : 1 / 1.15))
}
</script>

<template>
  <header class="pp:flex pp:h-[52px] pp:items-center pp:gap-3 pp:border-b pp:border-app-border pp:bg-app-panel pp:px-3">
    <!-- logo -> home -->
    <button
      type="button"
      class="pp:flex pp:cursor-pointer pp:items-center pp:gap-2 pp:rounded-lg pp:px-2 pp:py-1.5 pp:hover:bg-app-inset"
      data-pp-home
      @click="emit('home')"
    >
      <span class="pp:flex pp:h-[26px] pp:w-[26px] pp:items-center pp:justify-center pp:rounded-[7px] pp:bg-brand-500 pp:text-[13px] pp:font-bold pp:text-white">P</span>
      <span class="pp:text-[13px] pp:text-app-text2">←</span>
    </button>
    <div class="pp:h-6 pp:w-px pp:bg-app-border" />

    <!-- name + autosave -->
    <div class="pp:min-w-0 pp:max-w-[260px]">
      <input
        v-if="editingName"
        ref="nameInputRef"
        v-model="nameDraft"
        class="pp:w-full pp:rounded-lg pp:border pp:border-brand-500 pp:bg-app-panel pp:px-2 pp:py-1 pp:text-[13px] pp:font-semibold pp:text-app-text pp:focus:outline-none"
        data-pp-name-input
        @blur="commitRename"
        @keydown.enter.prevent="commitRename"
        @keydown.escape="cancelRename"
      >
      <button
        v-else
        type="button"
        class="pp:block pp:max-w-full pp:truncate pp:text-left pp:text-[13px] pp:font-semibold pp:text-app-text pp:hover:text-brand-500"
        data-pp-name
        :title="doc.document.name"
        @click="startRename"
      >
        {{ doc.document.name || t('topbar.untitled') }}
      </button>
      <div class="pp:flex pp:items-center pp:gap-1 pp:whitespace-nowrap pp:text-[11px] pp:text-app-ok">
        <span class="pp:inline-block pp:h-1.5 pp:w-1.5 pp:rounded-full pp:bg-app-ok" />
        {{ saving ? t('topbar.saving') : t('topbar.autosaved') }}
      </div>
    </div>

    <div class="pp:flex-1" />
    <ElementToolStrip @image-error="emit('imageError', $event)" />
    <div class="pp:flex-1" />

    <!-- undo / redo -->
    <div class="pp:flex pp:shrink-0 pp:items-center pp:gap-0.5">
      <button
        type="button"
        class="pp:flex pp:h-7 pp:w-7 pp:items-center pp:justify-center pp:rounded-md pp:text-[15px] pp:text-app-text2 pp:hover:bg-app-inset pp:disabled:opacity-40"
        :disabled="!history.canUndo"
        :title="`${t('topbar.undo')}${history.undoLabel ? ` — ${history.undoLabel}` : ''}`"
        data-pp-undo
        @click="history.undo()"
      >
        ↶
      </button>
      <button
        type="button"
        class="pp:flex pp:h-7 pp:w-7 pp:items-center pp:justify-center pp:rounded-md pp:text-[15px] pp:text-app-text2 pp:hover:bg-app-inset pp:disabled:opacity-40"
        :disabled="!history.canRedo"
        :title="t('topbar.redo')"
        data-pp-redo
        @click="history.redo()"
      >
        ↷
      </button>
    </div>
    <div class="pp:h-6 pp:w-px pp:bg-app-border" />

    <!-- zoom cluster -->
    <div class="pp:flex pp:shrink-0 pp:items-center pp:gap-1.5">
      <button
        type="button"
        class="pp:flex pp:h-7 pp:w-7 pp:items-center pp:justify-center pp:rounded-md pp:text-[15px] pp:text-app-text2 pp:hover:bg-app-inset"
        @click="zoomStep(-1)"
      >
        −
      </button>
      <button
        type="button"
        class="pp:w-11 pp:text-center pp:font-uimono pp:text-xs pp:text-app-text2 pp:hover:text-brand-500"
        :title="t('topbar.zoomFit')"
        @click="emit('fit')"
      >
        {{ viewport.zoomPercent }}%
      </button>
      <button
        type="button"
        class="pp:flex pp:h-7 pp:w-7 pp:items-center pp:justify-center pp:rounded-md pp:text-[15px] pp:text-app-text2 pp:hover:bg-app-inset"
        @click="zoomStep(1)"
      >
        +
      </button>
    </div>

    <!-- theme toggle -->
    <button
      type="button"
      class="pp:flex pp:h-8 pp:w-8 pp:shrink-0 pp:items-center pp:justify-center pp:rounded-lg pp:border pp:border-app-border pp:text-app-text2 pp:hover:bg-app-inset"
      data-pp-theme-toggle
      @click="toggleTheme"
    >
      {{ theme === 'dark' ? '☀' : '☾' }}
    </button>

    <!-- host actions (JSON import/export etc.) -->
    <slot name="actions" />

    <!-- primary CTA -->
    <button
      type="button"
      class="pp:h-[34px] pp:shrink-0 pp:whitespace-nowrap pp:rounded-lg pp:bg-brand-500 pp:px-4 pp:text-[13px] pp:font-semibold pp:text-white pp:hover:bg-brand-600"
      data-pp-export-open
      @click="emit('export')"
    >
      {{ t('topbar.export') }}
    </button>
  </header>
</template>
