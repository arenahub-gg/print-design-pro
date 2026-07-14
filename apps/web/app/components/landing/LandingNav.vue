<script setup lang="ts">
// Landing top nav: logo, anchor links, locale + theme toggles, app CTA.
const { theme, toggle } = useAppTheme()
const { locale, toggle: toggleLocale, t } = useAppLocale()
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-app-border bg-app-panel/90 backdrop-blur">
    <nav class="mx-auto flex h-16 max-w-[1120px] items-center gap-5 px-6">
      <NuxtLink
        to="/"
        class="flex items-center gap-2.5"
      >
        <span class="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-accent-500 text-[15px] font-bold text-white">P</span>
        <span class="text-sm font-bold">PrintDesignPro</span>
      </NuxtLink>

      <div class="flex-1" />

      <a
        href="#features"
        class="hidden text-[13px] font-medium text-app-text2 hover:text-app-text sm:block"
      >{{ t('landing.features') }}</a>
      <a
        href="#opensource"
        class="hidden text-[13px] font-medium text-app-text2 hover:text-app-text sm:block"
      >{{ t('landing.openSource') }}</a>
      <a
        href="https://github.com/arenahub-gg/print-design-pro"
        target="_blank"
        rel="noopener"
        class="hidden text-[13px] font-medium text-app-text2 hover:text-app-text sm:block"
      >GitHub</a>

      <button
        type="button"
        class="flex h-9 items-center rounded-lg border border-app-border px-2.5 font-uimono text-[11px] font-semibold text-app-text2 hover:bg-app-inset"
        data-test-locale-toggle
        @click="toggleLocale"
      >
        {{ locale === 'en' ? 'VI' : 'EN' }}
      </button>

      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-lg border border-app-border text-app-text2 hover:bg-app-inset"
        @click="toggle"
      >
        {{ theme === 'dark' ? '☀' : '☾' }}
      </button>

      <NuxtLink
        to="/app"
        class="flex h-9 items-center rounded-lg bg-accent-500 px-4 text-[13px] font-semibold text-white hover:bg-accent-600"
        data-test-open-app
      >
        {{ t('landing.openApp') }}
      </NuxtLink>
    </nav>
  </header>
</template>
