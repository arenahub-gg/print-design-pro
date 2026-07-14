<script setup lang="ts">
// Hero: value prop + CTAs + a stylized editor mockup built from tokens so it
// follows light/dark automatically (no screenshot to keep in sync).
const { t } = useAppLocale()
</script>

<template>
  <section class="mx-auto grid max-w-[1120px] items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
    <div>
      <p class="mb-4 inline-flex items-center gap-2 rounded-full border border-app-border bg-app-panel px-3 py-1 font-uimono text-[11px] text-app-text2">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-app-ok" />
        {{ t('hero.badge') }}
      </p>
      <h1 class="text-4xl font-bold leading-tight lg:text-[44px]">
        {{ t('hero.title') }}
        <span class="text-accent-500">{{ t('hero.titleAccent') }}</span>
      </h1>
      <p class="mt-5 max-w-[480px] text-[15px] leading-relaxed text-app-text2">
        {{ t('hero.sub') }}
      </p>
      <div class="mt-8 flex flex-wrap gap-3">
        <NuxtLink
          to="/app"
          class="flex h-11 items-center rounded-lg bg-accent-500 px-6 text-sm font-semibold text-white hover:bg-accent-600"
          data-test-hero-cta
        >
          {{ t('hero.ctaStart') }}
        </NuxtLink>
        <a
          href="https://github.com/arenahub-gg/print-design-pro"
          target="_blank"
          rel="noopener"
          class="flex h-11 items-center gap-2 rounded-lg border border-app-border2 px-6 text-sm font-semibold text-app-text hover:bg-app-inset"
        >
          {{ t('hero.ctaStar') }}
        </a>
      </div>
      <p class="mt-4 font-uimono text-[11px] text-app-text3">
        {{ t('hero.trust') }}
      </p>
    </div>

    <!-- editor mockup -->
    <div
      class="select-none overflow-hidden rounded-2xl border border-app-border bg-app-panel shadow-xl"
      aria-hidden="true"
    >
      <div class="flex h-10 items-center gap-2 border-b border-app-border px-3">
        <span class="flex h-5 w-5 items-center justify-center rounded bg-accent-500 text-[10px] font-bold text-white">P</span>
        <span class="text-[11px] font-semibold">{{ t('mock.docName') }}</span>
        <span class="font-uimono text-[9px] text-app-ok">● {{ t('mock.autosaved') }}</span>
        <span class="flex-1" />
        <span class="rounded-md bg-accent-500 px-2.5 py-1 text-[10px] font-semibold text-white">{{ t('mock.export') }}</span>
      </div>
      <div class="flex">
        <div class="hidden w-24 shrink-0 flex-col gap-1.5 border-r border-app-border p-2 sm:flex">
          <span
            v-for="labelKey in (['paper.a4', 'paper.a5', 'paper.shipping', 'paper.product'] as const)"
            :key="labelKey"
            class="rounded-md border border-app-border px-1.5 py-1.5 text-center font-uimono text-[8px] text-app-text3"
          >{{ t(labelKey) }}</span>
        </div>
        <div class="flex flex-1 items-center justify-center bg-app-inset p-6">
          <div class="flex w-[220px] flex-col gap-2 rounded-sm border border-app-border2 bg-white p-3 shadow-md">
            <div class="flex items-start justify-between">
              <div class="flex flex-col gap-1">
                <span class="block h-2 w-24 rounded-sm bg-[#2a3547]" />
                <span class="block h-1.5 w-32 rounded-sm bg-[#c4ccd8]" />
                <span class="block h-1.5 w-28 rounded-sm bg-[#c4ccd8]" />
              </div>
              <!-- QR mock -->
              <div class="grid h-10 w-10 grid-cols-4 gap-px">
                <span
                  v-for="i in 16"
                  :key="i"
                  class="block"
                  :class="[3, 6, 7, 10, 12, 13].includes(i) ? 'bg-white' : 'bg-[#18202e]'"
                />
              </div>
            </div>
            <!-- barcode mock -->
            <div class="mt-1 flex h-7 items-stretch gap-px">
              <span
                v-for="(w, i) in [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2]"
                :key="i"
                class="block bg-[#18202e]"
                :style="{ width: `${w * 2}px` }"
              />
            </div>
            <span class="block h-1.5 w-20 self-center rounded-sm bg-[#c4ccd8]" />
            <!-- star + dashed line mock -->
            <div class="mt-1 flex items-center gap-2">
              <svg
                viewBox="0 0 20 20"
                class="h-5 w-5"
              ><polygon
                points="10,1 12.4,7 19,7.6 14,12 15.5,19 10,15.4 4.5,19 6,12 1,7.6 7.6,7"
                fill="#fef9c3"
                stroke="#854d0e"
                stroke-width="1"
              /></svg>
              <span class="block h-0 flex-1 border-t-2 border-dashed border-[#2a6fdb]" />
              <span class="block h-0 w-0 border-y-4 border-l-8 border-y-transparent border-l-[#2a6fdb]" />
            </div>
          </div>
        </div>
      </div>
      <div class="flex h-6 items-center gap-3 border-t border-app-border px-3 font-uimono text-[9px] text-app-text3">
        <span class="text-app-ok">● {{ t('mock.ready') }}</span>
        <span>{{ t('mock.paper') }}</span>
        <span class="flex-1" />
        <span>Zoom 100%</span>
        <span>mm</span>
      </div>
    </div>
  </section>
</template>
