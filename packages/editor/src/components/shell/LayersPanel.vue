<script setup lang="ts">
import { computed } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import type { ElementType, TemplateElement } from '../../core/schema/elements'
import { useDocumentStore } from '../../stores/document-store'
import { useSelectionStore } from '../../stores/selection-store'

// PrintDesignPro "Lớp" panel: element list, topmost first (array order is
// paint order, so the list renders reversed). Click selects; shift adds.
const doc = useDocumentStore()
const selection = useSelectionStore()
const { t } = useEditorI18n()

const GLYPHS: Record<ElementType, string> = {
  rect: '▭',
  line: '—',
  circle: '◯',
  shape: '⬟',
  text: 'Aa',
  image: '🖼',
  qr: '▦',
  barcode: '|||',
  table: '⊞',
}

const layers = computed<TemplateElement[]>(() => [...doc.elements].reverse())

function badge(element: TemplateElement): string {
  if (element.locked)
    return '🔒'
  if (!element.visible)
    return '·'
  return ''
}

function onSelect(element: TemplateElement, event: MouseEvent): void {
  if (event.shiftKey)
    selection.toggle(element.id)
  else
    selection.select(element.id)
}
</script>

<template>
  <section class="pp:border-b pp:border-app-border pp:px-3.5 pp:pb-3 pp:pt-3.5">
    <h3 class="pp:mb-2.5 pp:text-xs pp:font-bold pp:text-app-text">
      {{ t('panel.layers') }}
    </h3>
    <div class="pp:flex pp:max-h-[220px] pp:flex-col pp:gap-0.5 pp:overflow-auto">
      <p
        v-if="layers.length === 0"
        class="pp:py-3 pp:text-center pp:text-[11px] pp:text-app-text3"
      >
        {{ t('panel.layersEmpty') }}
      </p>
      <button
        v-for="element in layers"
        :key="element.id"
        type="button"
        class="pp:flex pp:h-[30px] pp:cursor-pointer pp:items-center pp:gap-2 pp:rounded-md pp:px-2 pp:text-left pp:text-xs"
        :class="selection.isSelected(element.id)
          ? 'pp:bg-brand-soft pp:text-brand-500'
          : 'pp:text-app-text pp:hover:bg-app-inset'"
        :data-pp-layer="element.id"
        @click="onSelect(element, $event)"
      >
        <span class="pp:w-[22px] pp:font-uimono pp:text-[11px] pp:text-app-text3">{{ GLYPHS[element.type] }}</span>
        <span class="pp:min-w-0 pp:flex-1 pp:truncate">{{ element.name }}</span>
        <span class="pp:text-[10px] pp:text-app-text3">{{ badge(element) }}</span>
      </button>
    </div>
  </section>
</template>
