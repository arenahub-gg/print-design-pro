<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { setPageSettingsCommand } from '../../core/commands/element-commands'
import { PAGE_PRESETS, type PageSettings, samePageSettings } from '../../core/schema/page'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import VariablesPanel from './VariablesPanel.vue'

// PrintDesignPro left panel: "Paper" tab (preset rows; switching size is an
// undoable command) and the "Data variables" tab (round 13 - {{name}}
// sample values for preview and batch printing).
const emit = defineEmits<{ presetApplied: [] }>()

const activeTab = ref<'paper' | 'variables'>('paper')

const doc = useDocumentStore()
const history = useHistoryStore()
const { t } = useEditorI18n()

interface PresetRow {
  key: string
  labelKey: `paper.${string}`
  settings: PageSettings
}

const PRESETS: PresetRow[] = [
  { key: 'a4', labelKey: 'paper.a4', settings: PAGE_PRESETS.a4 },
  { key: 'a5', labelKey: 'paper.a5', settings: PAGE_PRESETS.a5 },
  { key: 'label100x150', labelKey: 'paper.label100x150', settings: PAGE_PRESETS.label100x150 },
  { key: 'label50x30', labelKey: 'paper.label50x30', settings: PAGE_PRESETS.label50x30 },
]

// Full-settings match: a custom-margin A4 is not "the A4 preset", and
// re-applying the preset must stay possible to restore its margins.
const activeKey = computed(() =>
  PRESETS.find(preset => samePageSettings(preset.settings, doc.page))?.key ?? null,
)

function apply(preset: PresetRow): void {
  if (activeKey.value === preset.key)
    return
  history.dispatch(setPageSettingsCommand(doc, preset.settings))
  emit('presetApplied')
}

/** Mini page thumb: constant 40px width, height follows the aspect. */
function thumbHeight(settings: PageSettings): number {
  return Math.max(16, Math.min(52, Math.round((settings.heightMm / settings.widthMm) * 40)))
}
</script>

<template>
  <div class="pp:flex pp:h-full pp:flex-col pp:bg-app-panel">
    <div class="pp:flex pp:border-b pp:border-app-border pp:px-2">
      <button
        type="button"
        class="pp:flex-1 pp:cursor-pointer pp:border-b-2 pp:pb-2.5 pp:pt-3 pp:text-center pp:text-xs pp:font-semibold"
        :class="activeTab === 'paper' ? 'pp:border-brand-500 pp:text-brand-500' : 'pp:border-transparent pp:text-app-text3 pp:hover:text-app-text2'"
        data-pp-tab-paper
        @click="activeTab = 'paper'"
      >
        {{ t('panel.paperTab') }}
      </button>
      <button
        type="button"
        class="pp:flex-1 pp:cursor-pointer pp:border-b-2 pp:pb-2.5 pp:pt-3 pp:text-center pp:text-xs pp:font-semibold"
        :class="activeTab === 'variables' ? 'pp:border-brand-500 pp:text-brand-500' : 'pp:border-transparent pp:text-app-text3 pp:hover:text-app-text2'"
        data-pp-tab-variables
        @click="activeTab = 'variables'"
      >
        {{ t('panel.variablesTab') }}
      </button>
    </div>

    <VariablesPanel v-if="activeTab === 'variables'" />
    <div
      v-else
      class="pp:flex pp:flex-col pp:gap-2.5 pp:overflow-auto pp:p-3"
    >
      <button
        v-for="preset in PRESETS"
        :key="preset.key"
        type="button"
        class="pp:flex pp:cursor-pointer pp:items-center pp:gap-2.5 pp:rounded-[9px] pp:border pp:p-2 pp:text-left"
        :class="activeKey === preset.key
          ? 'pp:border-brand-500 pp:bg-brand-soft'
          : 'pp:border-app-border pp:hover:border-brand-500 pp:hover:bg-brand-soft'"
        :data-pp-paper-preset="preset.key"
        @click="apply(preset)"
      >
        <span
          class="pp:flex pp:w-10 pp:shrink-0 pp:flex-col pp:gap-0.5 pp:rounded-[2px] pp:border pp:border-app-border2 pp:bg-white pp:p-1"
          :style="{ height: `${thumbHeight(preset.settings)}px` }"
        >
          <span class="pp:block pp:h-[3px] pp:w-[70%] pp:rounded-[1px] pp:bg-[#2a3547]" />
          <span class="pp:block pp:h-[2px] pp:w-[90%] pp:rounded-[1px] pp:bg-[#c4ccd8]" />
        </span>
        <span class="pp:min-w-0">
          <span class="pp:block pp:truncate pp:text-xs pp:font-semibold pp:text-app-text">{{ t(preset.labelKey as never) }}</span>
          <span class="pp:block pp:font-uimono pp:text-[10px] pp:text-app-text3">{{ preset.settings.widthMm }} × {{ preset.settings.heightMm }} mm</span>
        </span>
      </button>
    </div>
  </div>
</template>
