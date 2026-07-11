<script setup lang="ts">
import { computed } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { setPageSettingsCommand } from '../../core/commands/element-commands'
import { PAGE_PRESETS, type PagePresetKey, samePageSettings } from '../../core/schema/page'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import { useViewportStore } from '../../stores/viewport-store'

// PrintDesignPro status bar (28px): ready dot, paper preset select, zoom, mm.
const emit = defineEmits<{ presetApplied: [] }>()

const doc = useDocumentStore()
const history = useHistoryStore()
const viewport = useViewportStore()
const { t } = useEditorI18n()

// Localized preset labels built from the same paper.* keys the left panel uses.
const presetLabels = computed<Record<PagePresetKey, string>>(() => {
  const entries = (Object.keys(PAGE_PRESETS) as PagePresetKey[]).map((key) => {
    const settings = PAGE_PRESETS[key]
    return [key, `${t(`paper.${key}` as never)} · ${settings.widthMm} × ${settings.heightMm} mm`] as const
  })
  return Object.fromEntries(entries) as Record<PagePresetKey, string>
})

const activePreset = computed<PagePresetKey | ''>(() =>
  (Object.keys(PAGE_PRESETS) as PagePresetKey[]).find(key =>
    samePageSettings(PAGE_PRESETS[key], doc.page),
  ) ?? '',
)

function onPresetChange(event: Event): void {
  const key = (event.target as HTMLSelectElement).value as PagePresetKey | ''
  if (!key || key === activePreset.value)
    return
  history.dispatch(setPageSettingsCommand(doc, PAGE_PRESETS[key]))
  emit('presetApplied')
}
</script>

<template>
  <footer class="pp:flex pp:h-7 pp:items-center pp:gap-4 pp:overflow-hidden pp:border-t pp:border-app-border pp:bg-app-panel pp:px-3.5 pp:font-uimono pp:text-[11px] pp:text-app-text3">
    <span class="pp:flex pp:items-center pp:gap-1.5 pp:whitespace-nowrap pp:text-app-ok">
      <span class="pp:inline-block pp:h-1.5 pp:w-1.5 pp:rounded-full pp:bg-app-ok" />
      {{ t('status.ready') }}
    </span>
    <select
      :value="activePreset"
      class="pp:h-5 pp:cursor-pointer pp:rounded-[5px] pp:border pp:border-app-border2 pp:bg-app-panel pp:px-1 pp:font-uimono pp:text-[10px] pp:text-app-text2"
      data-pp-paper-select
      @change="onPresetChange"
    >
      <option
        v-if="!activePreset"
        value=""
      >
        {{ doc.page.widthMm }} × {{ doc.page.heightMm }} mm
      </option>
      <option
        v-for="(label, key) in presetLabels"
        :key="key"
        :value="key"
      >
        {{ label }}
      </option>
    </select>
    <span class="pp:flex-1" />
    <span class="pp:whitespace-nowrap">Zoom {{ viewport.zoomPercent }}%</span>
    <span>mm</span>
  </footer>
</template>
