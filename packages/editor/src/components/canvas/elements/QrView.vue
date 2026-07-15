<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { QrElement } from '../../../core/schema/elements'
import { substituteVariables } from '../../../core/variables'
import { useBatchDataStore } from '../../../stores/batch-data-store'

// Editor-side QR rendering: regenerates a data URL when content/level
// change (debounced - typing in the properties panel fires per keystroke).
const props = defineProps<{ element: QrElement }>()

const batchData = useBatchDataStore()
// Preview encodes the ACTIVE data (samples or the selected CSV row) - the
// panel textarea still edits the raw source.
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
    const { default: QRCode } = await import('qrcode')
    const url = await QRCode.toDataURL(content.value, {
      errorCorrectionLevel: props.element.ecLevel,
      width: 256,
      margin: 0,
      color: { dark: props.element.color, light: props.element.backgroundColor },
    })
    if (ticket === generation)
      dataUrl.value = url
  }
  catch {
    if (ticket === generation) {
      dataUrl.value = null
      failed.value = true
    }
  }
}

watch(
  () => [content.value, props.element.ecLevel, props.element.color, props.element.backgroundColor],
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
  <!-- square, centered - stretching a QR breaks scanning -->
  <div class="pp:flex pp:h-full pp:w-full pp:items-center pp:justify-center">
    <img
      v-if="dataUrl"
      :src="dataUrl"
      alt=""
      draggable="false"
      class="pp:pointer-events-none pp:block pp:max-h-full pp:max-w-full pp:aspect-square pp:h-full"
      style="object-fit: contain"
    >
    <div
      v-else
      class="pp:flex pp:h-full pp:w-full pp:items-center pp:justify-center pp:border pp:border-dashed pp:text-[10px]"
      :class="failed ? 'pp:border-rose-300 pp:text-rose-400' : 'pp:border-slate-300 pp:text-slate-400'"
    >
      QR
    </div>
  </div>
</template>
