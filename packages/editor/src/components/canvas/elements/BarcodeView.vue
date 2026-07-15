<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { BarcodeElement } from '../../../core/schema/elements'
import { substituteVariables } from '../../../core/variables'
import { useBatchDataStore } from '../../../stores/batch-data-store'

// Editor-side barcode rendering. jsbarcode THROWS on invalid content (bad
// checksums etc.) - caught and surfaced as an inline error placeholder.
const props = defineProps<{ element: BarcodeElement }>()

const batchData = useBatchDataStore()
// Preview encodes the ACTIVE data (samples or the selected CSV row) - the
// panel input still edits the raw source.
const content = computed(() => substituteVariables(props.element.content, batchData.previewData))

const dataUrl = ref<string | null>(null)
const failed = ref(false)

let timer: ReturnType<typeof setTimeout> | null = null
let generation = 0

async function regenerate(): Promise<void> {
  const ticket = ++generation
  failed.value = false
  if (!content.value) {
    dataUrl.value = null
    return
  }
  try {
    const { default: JsBarcode } = await import('jsbarcode')
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, content.value, {
      format: props.element.format,
      displayValue: props.element.showText,
      lineColor: props.element.lineColor,
      background: 'transparent',
      margin: 0,
    })
    if (ticket === generation)
      dataUrl.value = canvas.toDataURL('image/png')
  }
  catch {
    if (ticket === generation) {
      dataUrl.value = null
      failed.value = true
    }
  }
}

watch(
  () => [content.value, props.element.format, props.element.showText, props.element.lineColor],
  () => {
    if (timer)
      clearTimeout(timer)
    timer = setTimeout(() => void regenerate(), 200)
  },
)

onMounted(() => void regenerate())

onUnmounted(() => {
  if (timer)
    clearTimeout(timer)
  generation++ // invalidate in-flight generations
})
</script>

<template>
  <img
    v-if="dataUrl"
    :src="dataUrl"
    alt=""
    draggable="false"
    class="pp:pointer-events-none pp:block pp:h-full pp:w-full"
    style="object-fit: fill"
  >
  <div
    v-else
    class="pp:flex pp:h-full pp:w-full pp:items-center pp:justify-center pp:border pp:border-dashed pp:px-1 pp:text-center pp:text-[10px]"
    :class="failed ? 'pp:border-rose-300 pp:text-rose-500' : 'pp:border-slate-300 pp:text-slate-400'"
    data-pp-barcode-error
  >
    {{ failed ? `✕ ${element.format}` : '||||' }}
  </div>
</template>
