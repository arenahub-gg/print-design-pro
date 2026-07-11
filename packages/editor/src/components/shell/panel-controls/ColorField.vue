<script setup lang="ts">
import { computed } from 'vue'
import { useEditorI18n } from '../../../composables/use-editor-i18n'

// Color row: label + preset swatch strip + native picker for custom values.
// Commits immediately on pick (host dispatches an undoable command). The
// palette is print-oriented: ink black/grays first, then saturated hues.
const props = defineProps<{
  label: string
  /** Current color (any CSS color string). */
  modelValue: string
  disabled?: boolean
  /** Offer a "no color" tile (fills/backgrounds - not QR, which needs hex). */
  allowTransparent?: boolean
}>()

const emit = defineEmits<{ commit: [value: string] }>()

const { t } = useEditorI18n()

const SWATCHES = [
  '#000000', '#334155', '#94a3b8', '#ffffff',
  '#dc2626', '#ea580c', '#f59e0b', '#16a34a',
  '#2a6fdb', '#0891b2', '#7c3aed', '#db2777',
] as const

const normalized = computed(() => props.modelValue.trim().toLowerCase())
const isTransparent = computed(() => normalized.value === 'transparent')

/** <input type=color> only accepts #rrggbb - fall back to white otherwise. */
const pickerValue = computed(() =>
  /^#[0-9a-f]{6}$/.test(normalized.value) ? normalized.value : '#ffffff',
)

/** True when the current color is none of the preset tiles (custom pick). */
const isCustom = computed(() =>
  !isTransparent.value && !SWATCHES.includes(normalized.value as (typeof SWATCHES)[number]),
)

function pick(color: string): void {
  if (props.disabled || color === normalized.value)
    return
  emit('commit', color)
}
</script>

<template>
  <div :class="disabled ? 'pp:opacity-50' : ''">
    <div class="pp:mb-1 pp:font-uimono pp:text-[10px] pp:font-bold pp:text-app-text3">
      {{ label }}
    </div>
    <div
      class="pp:flex pp:flex-wrap pp:items-center pp:gap-1"
      data-pp-color-field
    >
      <button
        v-if="allowTransparent"
        type="button"
        class="pp:relative pp:h-5 pp:w-5 pp:cursor-pointer pp:overflow-hidden pp:rounded-[5px] pp:border pp:bg-white"
        :class="isTransparent ? 'pp:border-brand-500 pp:ring-1 pp:ring-brand-500' : 'pp:border-app-border2'"
        :title="t('color.none')"
        :disabled="disabled"
        data-pp-color-none
        @click="pick('transparent')"
      >
        <!-- diagonal slash = "no color" convention -->
        <span class="pp:absolute pp:left-1/2 pp:top-1/2 pp:h-[26px] pp:w-px pp:-translate-x-1/2 pp:-translate-y-1/2 pp:rotate-45 pp:bg-rose-500" />
      </button>
      <button
        v-for="swatch in SWATCHES"
        :key="swatch"
        type="button"
        class="pp:h-5 pp:w-5 pp:cursor-pointer pp:rounded-[5px] pp:border"
        :class="normalized === swatch ? 'pp:border-brand-500 pp:ring-1 pp:ring-brand-500' : 'pp:border-app-border2'"
        :style="{ backgroundColor: swatch }"
        :title="swatch"
        :disabled="disabled"
        :data-pp-color-swatch="swatch"
        @click="pick(swatch)"
      />
      <!-- custom: native picker overlaid on a rainbow tile -->
      <label
        class="pp:relative pp:h-5 pp:w-5 pp:cursor-pointer pp:rounded-[5px] pp:border"
        :class="isCustom ? 'pp:border-brand-500 pp:ring-1 pp:ring-brand-500' : 'pp:border-app-border2'"
        :style="{ background: isCustom
          ? modelValue
          : 'conic-gradient(#dc2626, #f59e0b, #16a34a, #0891b2, #7c3aed, #dc2626)' }"
        :title="t('color.custom')"
      >
        <input
          type="color"
          :value="pickerValue"
          :disabled="disabled"
          class="pp:absolute pp:inset-0 pp:h-full pp:w-full pp:cursor-pointer pp:opacity-0"
          data-pp-color-custom
          @change="pick(($event.target as HTMLInputElement).value)"
        >
      </label>
    </div>
  </div>
</template>
