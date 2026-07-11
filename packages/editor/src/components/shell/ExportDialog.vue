<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { cloneJson } from '../../core/clone'
import { downloadBlob } from '../../render/download'
import { exportPdf } from '../../render/export-pdf'
import { exportPng } from '../../render/export-image'
import { printDocument } from '../../render/print-browser'
import { renderToCanvas } from '../../render/render-engine'
import { useDocumentStore } from '../../stores/document-store'

// PrintDesignPro export modal: format cards (PNG / PDF / direct print) on the
// left, live render-engine preview on the right - the exact pixels that will
// be produced. Replaces the round-2 preview dialog.
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const doc = useDocumentStore()
const { t } = useEditorI18n()

type ExportFormat = 'png' | 'pdf' | 'print'

const format = ref<ExportFormat>('pdf')
const busy = ref(false)
const previewUrl = ref<string | null>(null)
const overlayRef = ref<HTMLElement | null>(null)
const errorText = ref<string | null>(null)
/** Invalidates in-flight preview renders when the dialog closes/reopens. */
let previewTicket = 0

// computed: labels follow runtime locale switches
const formats = computed<Array<{ value: ExportFormat, label: string, descKey: `export.${string}` }>>(() => [
  { value: 'png', label: 'PNG', descKey: 'export.pngDesc' },
  { value: 'pdf', label: 'PDF', descKey: 'export.pdfDesc' },
  { value: 'print', label: t('topbar.print'), descKey: 'export.printDesc' },
])

const ctaLabel = computed(() => {
  if (format.value === 'png')
    return t('export.ctaPng')
  if (format.value === 'pdf')
    return t('export.ctaPdf')
  return t('export.ctaPrint')
})

watch(() => props.open, async (open) => {
  previewTicket++
  if (open) {
    errorText.value = null
    void renderPreview(previewTicket)
    await nextTick()
    overlayRef.value?.focus()
  }
  else {
    previewUrl.value = null
  }
})

async function renderPreview(ticket: number): Promise<void> {
  try {
    const canvas = await renderToCanvas(cloneJson(doc.document), { dpi: 150 })
    if (ticket === previewTicket)
      previewUrl.value = canvas.toDataURL('image/png')
  }
  catch (error) {
    // e.g. page exceeds the canvas dimension guard - tell the user, don't hang
    if (ticket === previewTicket)
      errorText.value = error instanceof Error ? error.message : String(error)
  }
}

async function run(): Promise<void> {
  if (busy.value)
    return
  busy.value = true
  errorText.value = null
  try {
    const snapshot = cloneJson(doc.document)
    const filename = snapshot.name.trim() || 'template'
    if (format.value === 'png')
      downloadBlob(await exportPng(snapshot), `${filename}.png`)
    else if (format.value === 'pdf')
      downloadBlob(await exportPdf(snapshot), `${filename}.pdf`)
    else
      await printDocument(snapshot)
  }
  catch (error) {
    errorText.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlayRef"
      tabindex="-1"
      class="pp:fixed pp:inset-0 pp:z-50 pp:flex pp:items-center pp:justify-center pp:bg-[rgba(10,14,22,.55)] pp:p-6 pp:font-ui pp:outline-none"
      data-pp-export-dialog
      @click.self="emit('close')"
      @keydown.escape="emit('close')"
    >
      <div class="pp:flex pp:max-h-full pp:w-[660px] pp:max-w-full pp:overflow-hidden pp:rounded-[14px] pp:border pp:border-app-border pp:bg-app-panel pp:shadow-app-lg">
        <!-- options -->
        <div class="pp:flex pp:min-w-0 pp:flex-1 pp:flex-col pp:gap-4 pp:p-6">
          <div>
            <h2 class="pp:text-[17px] pp:font-bold pp:text-app-text">
              {{ t('topbar.export') }}
            </h2>
            <p class="pp:mt-0.5 pp:text-xs pp:text-app-text3">
              {{ doc.document.name }} · {{ doc.page.widthMm }} × {{ doc.page.heightMm }} mm
            </p>
          </div>

          <div>
            <h3 class="pp:mb-2 pp:text-xs pp:font-semibold pp:text-app-text2">
              {{ t('export.format') }}
            </h3>
            <div class="pp:flex pp:gap-2">
              <button
                v-for="entry in formats"
                :key="entry.value"
                type="button"
                class="pp:flex-1 pp:cursor-pointer pp:rounded-[9px] pp:border-[1.5px] pp:px-3 pp:py-2.5 pp:text-left"
                :class="format === entry.value
                  ? 'pp:border-brand-500 pp:bg-brand-soft'
                  : 'pp:border-app-border pp:hover:border-brand-500'"
                :data-pp-export-format="entry.value"
                @click="format = entry.value"
              >
                <span class="pp:block pp:font-uimono pp:text-[13px] pp:font-bold pp:text-app-text">{{ entry.label }}</span>
                <span class="pp:mt-0.5 pp:block pp:text-[10px] pp:text-app-text3">{{ t(entry.descKey as never) }}</span>
              </button>
            </div>
          </div>

          <p class="pp:text-[11px] pp:leading-relaxed pp:text-app-text3">
            {{ t('preview.hint') }}
          </p>

          <p
            v-if="errorText"
            class="pp:rounded-lg pp:bg-rose-50 pp:p-2 pp:text-[11px] pp:text-rose-600"
            data-pp-export-error
          >
            {{ errorText }}
          </p>

          <div class="pp:mt-auto pp:flex pp:gap-2.5">
            <button
              type="button"
              class="pp:h-[38px] pp:rounded-lg pp:border pp:border-app-border2 pp:px-4 pp:text-[13px] pp:font-semibold pp:text-app-text2 pp:hover:bg-app-inset"
              @click="emit('close')"
            >
              {{ t('preview.close') }}
            </button>
            <button
              type="button"
              class="pp:h-[38px] pp:flex-1 pp:rounded-lg pp:bg-brand-500 pp:text-[13px] pp:font-semibold pp:text-white pp:hover:bg-brand-600 pp:disabled:opacity-50"
              :disabled="busy"
              data-pp-export-run
              @click="run"
            >
              {{ ctaLabel }}
            </button>
          </div>
        </div>

        <!-- preview pane -->
        <div class="pp:flex pp:w-[220px] pp:shrink-0 pp:flex-col pp:items-center pp:justify-center pp:gap-2.5 pp:border-l pp:border-app-border pp:bg-app-inset pp:p-5">
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt=""
            class="pp:max-h-[300px] pp:w-auto pp:max-w-full pp:border pp:border-app-border2 pp:bg-white pp:shadow-md"
            data-pp-preview-image
          >
        </div>
      </div>
    </div>
  </Teleport>
</template>
