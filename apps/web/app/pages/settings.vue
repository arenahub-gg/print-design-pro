<script setup lang="ts">
import type { AppLocale } from '~/locales/app-messages'
import { LOCALE_LABELS } from '~/composables/use-app-locale'

// PrintDesignPro Settings: theme + language (the real settings today).
// Printer/units/shop-profile sections from the design arrive with their
// backing features in later rounds.
const { theme, setTheme } = useAppTheme()
const { locale, setLocale, t } = useAppLocale()

const THEME_OPTIONS = [
  { value: 'light' as const, labelKey: 'settings.light' as const, swatch: '#f4f6f9' },
  { value: 'dark' as const, labelKey: 'settings.dark' as const, swatch: '#13161b' },
]

const LOCALE_OPTIONS: Array<{ value: AppLocale, label: string }>
  = (Object.entries(LOCALE_LABELS) as Array<[AppLocale, string]>)
    .map(([value, label]) => ({ value, label }))
</script>

<template>
  <div class="mx-auto flex max-w-[680px] flex-col gap-5 px-10 py-9">
    <h1 class="text-2xl font-bold">
      {{ t('settings.title') }}
    </h1>

    <section class="rounded-xl border border-app-border bg-app-panel px-6 py-5">
      <h2 class="mb-3.5 text-sm font-semibold">
        {{ t('settings.appearance') }}
      </h2>
      <div class="flex gap-2.5">
        <button
          v-for="option in THEME_OPTIONS"
          :key="option.value"
          type="button"
          class="flex-1 cursor-pointer rounded-[10px] border-[1.5px] p-3 text-left"
          :class="theme === option.value ? 'border-accent-500 bg-accent-soft' : 'border-app-border'"
          :data-test-theme="option.value"
          @click="setTheme(option.value)"
        >
          <span
            class="mb-2 block h-11 rounded-md border border-app-border2"
            :style="{ background: option.swatch }"
          />
          <span class="text-[13px] font-semibold">{{ t(option.labelKey) }}</span>
        </button>
      </div>
    </section>

    <section class="rounded-xl border border-app-border bg-app-panel px-6 py-5">
      <h2 class="mb-3.5 text-sm font-semibold">
        {{ t('settings.language') }}
      </h2>
      <div class="flex gap-2.5">
        <!-- Language names stay in their own language (standard picker UX) -->
        <button
          v-for="option in LOCALE_OPTIONS"
          :key="option.value"
          type="button"
          class="flex-1 cursor-pointer rounded-[10px] border-[1.5px] p-3 text-left text-[13px] font-semibold"
          :class="locale === option.value ? 'border-accent-500 bg-accent-soft' : 'border-app-border'"
          :data-test-locale="option.value"
          @click="setLocale(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <p class="text-xs text-app-text3">
      {{ t('settings.footnote') }}
    </p>
  </div>
</template>
