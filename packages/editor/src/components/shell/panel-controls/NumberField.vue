<script setup lang="ts">
import { ref, watch } from 'vue'

// PrintDesignPro dim field: inset box with mono label, transparent input,
// optional unit suffix. Commits on blur/Enter (host dispatches an undoable
// command); invalid input restores the last committed value.
const props = defineProps<{
  label: string
  modelValue: number | null
  step?: number
  min?: number
  /** Shown when a multi-selection has mixed values. */
  mixed?: boolean
  disabled?: boolean
  /** Unit suffix, e.g. "mm" or "pt". */
  unit?: string
}>()

const emit = defineEmits<{ commit: [value: number] }>()

const draft = ref<string>(format(props.modelValue))

watch(() => props.modelValue, (value) => {
  draft.value = format(value)
})

function format(value: number | null): string {
  return value === null ? '' : String(value)
}

function commit(): void {
  const parsed = Number.parseFloat(draft.value)
  if (Number.isNaN(parsed)) {
    draft.value = format(props.modelValue)
    return
  }
  const clamped = props.min !== undefined ? Math.max(props.min, parsed) : parsed
  draft.value = format(clamped)
  if (clamped !== props.modelValue)
    emit('commit', clamped)
}
</script>

<template>
  <label
    class="pp:flex pp:h-8 pp:items-center pp:gap-1.5 pp:rounded-[7px] pp:border pp:border-app-border2 pp:bg-app-inset pp:px-2"
    :class="disabled ? 'pp:opacity-50' : ''"
  >
    <span class="pp:shrink-0 pp:font-uimono pp:text-[10px] pp:font-bold pp:text-app-text3">{{ label }}</span>
    <input
      v-model="draft"
      type="number"
      :step="step ?? 0.1"
      :min="min"
      :placeholder="mixed ? '—' : undefined"
      :disabled="disabled"
      class="pp:w-full pp:min-w-0 pp:border-none pp:bg-transparent pp:p-0 pp:font-uimono pp:text-xs pp:text-app-text pp:focus:outline-none"
      @blur="commit"
      @keydown.enter.prevent="commit"
    >
    <span
      v-if="unit"
      class="pp:shrink-0 pp:text-[10px] pp:text-app-text3"
    >{{ unit }}</span>
  </label>
</template>
