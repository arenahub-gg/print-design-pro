<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { cloneJson } from '../../core/clone'
import { renderToCanvas } from '../../render/render-engine'
import { printDocument } from '../../render/print-browser'
import { useDocumentStore } from '../../stores/document-store'

// Print preview: shows the RENDER ENGINE's output (the exact pixels that
// export and print produce), not the editor canvas - so surprises happen
// here, not on paper.
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const doc = useDocumentStore()
const { t } = useEditorI18n()

const previewUrl = ref<string | null>(null)
const printing = ref(false)
const overlayRef = ref<HTMLElement | null>(null)

watch(() => props.open, async (open) => {
  if (open) {
    render()
    // Focus the overlay so Escape works without an extra click.
    await nextTick()
    overlayRef.value?.focus()
  }
  else {
    previewUrl.value = null
  }
})

function render(): void {
  // Preview at 150 DPI: sharp enough on screen, 4x cheaper than print DPI.
  const canvas = renderToCanvas(cloneJson(doc.document), { dpi: 150 })
  previewUrl.value = canvas.toDataURL('image/png')
}

async function print(): Promise<void> {
  if (printing.value)
    return
  printing.value = true
  try {
    await printDocument(cloneJson(doc.document))
  }
  finally {
    printing.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlayRef"
      tabindex="-1"
      class="pp:fixed pp:inset-0 pp:z-50 pp:flex pp:items-center pp:justify-center pp:bg-slate-900/50 pp:p-6 pp:outline-none"
      data-pp-print-preview
      @click.self="emit('close')"
      @keydown.escape="emit('close')"
    >
      <div class="pp:flex pp:max-h-full pp:w-full pp:max-w-3xl pp:flex-col pp:gap-3 pp:rounded-2xl pp:bg-white pp:p-4 pp:shadow-2xl">
        <div class="pp:flex pp:items-center pp:justify-between">
          <h2 class="pp:text-sm pp:font-semibold pp:text-slate-800">
            {{ t('preview.title') }}
          </h2>
          <button
            type="button"
            class="pp:rounded-lg pp:px-2 pp:py-1 pp:text-sm pp:text-slate-500 hover:pp:bg-slate-100"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>

        <div class="pp:min-h-0 pp:flex-1 pp:overflow-auto pp:rounded-xl pp:bg-slate-100 pp:p-4">
          <img
            v-if="previewUrl"
            :src="previewUrl"
            :alt="t('preview.title')"
            class="pp:mx-auto pp:max-h-[60vh] pp:w-auto pp:max-w-full pp:shadow-md"
            data-pp-preview-image
          >
        </div>

        <p class="pp:text-[11px] pp:text-slate-400">
          {{ t('preview.hint') }} · {{ doc.page.widthMm }}×{{ doc.page.heightMm }}mm
        </p>

        <div class="pp:flex pp:justify-end pp:gap-2">
          <button
            type="button"
            class="pp:rounded-lg pp:border pp:border-slate-200 pp:px-3 pp:py-1.5 pp:text-xs pp:text-slate-600 hover:pp:bg-slate-50"
            @click="emit('close')"
          >
            {{ t('preview.close') }}
          </button>
          <button
            type="button"
            class="pp:rounded-lg pp:bg-brand-500 pp:px-3 pp:py-1.5 pp:text-xs pp:font-medium pp:text-white hover:pp:bg-brand-600 disabled:pp:opacity-50"
            :disabled="printing"
            data-pp-preview-print
            @click="print"
          >
            {{ t('topbar.print') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
