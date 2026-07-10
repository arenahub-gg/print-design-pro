<script setup lang="ts">
import { ref, watch } from 'vue'

// Small labeled number input. Commits on blur/Enter (host dispatches an
// undoable command); arrow keys step immediately via the same commit path.
const props = defineProps<{
  label: string
  modelValue: number | null
  step?: number
  min?: number
  /** Shown when a multi-selection has mixed values. */
  mixed?: boolean
  disabled?: boolean
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
  <label class="pp:flex pp:items-center pp:gap-1.5 pp:text-xs pp:text-slate-600">
    <span class="pp:w-4 pp:shrink-0 pp:font-medium pp:text-slate-400">{{ label }}</span>
    <input
      v-model="draft"
      type="number"
      :step="step ?? 0.1"
      :min="min"
      :placeholder="mixed ? '—' : undefined"
      :disabled="disabled"
      class="pp:w-full pp:rounded-lg pp:border pp:border-slate-200 pp:bg-white pp:px-2 pp:py-1.5 pp:text-xs pp:text-slate-800 focus:pp:border-brand-500 focus:pp:outline-none disabled:pp:bg-slate-50 disabled:pp:text-slate-400"
      @blur="commit"
      @keydown.enter.prevent="commit"
    >
  </label>
</template>
