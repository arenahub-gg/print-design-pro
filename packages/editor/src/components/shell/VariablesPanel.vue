<script setup lang="ts">
import { computed } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { setVariableCommand } from '../../core/commands/element-commands'
import { collectVariables } from '../../core/variables'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'

// "Data variables" tab: variables are INFERRED from {{name}} tokens in the
// document; this panel only edits their SAMPLE values (used for canvas
// preview + single exports; CSV batch rows override them at print time).
const doc = useDocumentStore()
const history = useHistoryStore()
const { t } = useEditorI18n()

const names = computed(() => collectVariables(doc.document))

/** Vue interpolation ends at the first `}}` even inside strings - build tokens here. */
function token(name: string): string {
  return `{{${name}}}`
}

function commitSample(name: string, event: Event): void {
  const value = (event.target as HTMLInputElement).value
  if (value === (doc.document.variables[name] ?? ''))
    return
  history.dispatch(setVariableCommand(doc, name, value))
}
</script>

<template>
  <div class="pp:flex pp:flex-col pp:gap-2.5 pp:overflow-auto pp:p-3">
    <p
      v-if="names.length === 0"
      class="pp:rounded-lg pp:border pp:border-dashed pp:border-app-border2 pp:p-3 pp:text-[11px] pp:leading-relaxed pp:text-app-text3"
      data-pp-variables-empty
    >
      {{ t('variables.empty') }}
    </p>

    <template v-else>
      <p class="pp:text-[11px] pp:leading-relaxed pp:text-app-text3">
        {{ t('variables.hint') }}
      </p>
      <label
        v-for="name in names"
        :key="name"
        class="pp:flex pp:flex-col pp:gap-1"
      >
        <span class="pp:font-uimono pp:text-[11px] pp:font-bold pp:text-app-text2">{{ token(name) }}</span>
        <input
          :value="doc.document.variables[name] ?? ''"
          :placeholder="t('variables.samplePlaceholder')"
          class="pp:h-8 pp:rounded-lg pp:border pp:border-app-border2 pp:bg-app-panel pp:px-2 pp:text-xs pp:text-app-text pp:focus:border-brand-500 pp:focus:outline-none"
          :data-pp-variable="name"
          @change="commitSample(name, $event)"
        >
      </label>
    </template>
  </div>
</template>
