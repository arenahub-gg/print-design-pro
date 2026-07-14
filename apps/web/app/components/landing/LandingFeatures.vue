<script setup lang="ts">
// Feature grid - every claim here is a shipped capability, not roadmap.
const { t } = useAppLocale()

const FEATURES = [
  { glyph: '⊞', key: 'editor' },
  { glyph: '⎙', key: 'print' },
  { glyph: '▦', key: 'elements' },
  { glyph: '⛁', key: 'local' },
  { glyph: '↺', key: 'undo' },
  { glyph: '⬡', key: 'embed' },
] as const
</script>

<template>
  <section
    id="features"
    class="border-t border-app-border bg-app-panel"
  >
    <div class="mx-auto max-w-[1120px] px-6 py-16 lg:py-20">
      <h2 class="text-center text-3xl font-bold">
        {{ t('features.heading') }}
      </h2>
      <p class="mx-auto mt-3 max-w-[520px] text-center text-sm text-app-text2">
        {{ t('features.sub') }}
      </p>
      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="feature in FEATURES"
          :key="feature.key"
          class="rounded-xl border border-app-border bg-app-bg p-6"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft font-uimono text-lg text-accent-500">{{ feature.glyph }}</span>
          <h3 class="mt-4 text-[15px] font-bold">
            {{ t(`features.${feature.key}.title`) }}
          </h3>
          <p class="mt-2 text-[13px] leading-relaxed text-app-text2">
            {{ t(`features.${feature.key}.text`) }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
