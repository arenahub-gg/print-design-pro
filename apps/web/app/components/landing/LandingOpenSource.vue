<script setup lang="ts">
// Open-source pitch: stack, license, contribution invite.
const { t } = useAppLocale()
const STACK = ['Vue 3', 'Nuxt 4', 'TypeScript', 'Tailwind CSS 4', 'Canvas 2D', 'Pinia', 'Vitest', 'Playwright']
</script>

<template>
  <section
    id="opensource"
    class="mx-auto max-w-[1120px] px-6 py-16 lg:py-20"
  >
    <div class="grid items-center gap-10 lg:grid-cols-2">
      <div>
        <h2 class="text-3xl font-bold">
          {{ t('oss.heading') }}
        </h2>
        <p class="mt-4 max-w-[480px] text-sm leading-relaxed text-app-text2">
          {{ t('oss.body') }}
        </p>
        <div class="mt-6 flex flex-wrap gap-2">
          <span
            v-for="tech in STACK"
            :key="tech"
            class="rounded-full border border-app-border bg-app-panel px-3 py-1 font-uimono text-[11px] text-app-text2"
          >{{ tech }}</span>
        </div>
        <a
          href="https://github.com/arenahub-gg/print-design-pro"
          target="_blank"
          rel="noopener"
          class="mt-8 inline-flex h-11 items-center gap-2 rounded-lg border border-app-border2 px-6 text-sm font-semibold hover:bg-app-inset"
        >
          {{ t('oss.viewSource') }}
        </a>
      </div>

      <!-- terminal-style install card -->
      <div class="overflow-hidden rounded-xl border border-app-border bg-[#18202e] shadow-xl">
        <div class="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
          <span class="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span class="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span class="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span class="ml-2 font-uimono text-[10px] text-white/40">terminal</span>
        </div>
        <div class="space-y-3 p-5 font-uimono text-[12px] leading-relaxed">
          <p class="text-white/40">
            {{ t('oss.termRunApp') }}
          </p>
          <p class="text-[#7ee2a8]">
            <span class="text-white/40">$</span> git clone github.com/arenahub-gg/print-design-pro
          </p>
          <p class="text-[#7ee2a8]">
            <span class="text-white/40">$</span> pnpm install && pnpm dev
          </p>
          <p class="pt-2 text-white/40">
            {{ t('oss.termEmbed') }}
          </p>
          <p class="text-[#8ab8f8]">
            <span class="text-white/40">$</span> pnpm add @pro-print/editor
          </p>
          <p class="text-white/70">
            &lt;PrintDesigner v-model="template" locale="vi" /&gt;
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
