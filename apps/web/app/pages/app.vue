<script setup lang="ts">
import type { PageSettings } from '@pro-print/editor'
import { createEmptyTemplate, PAGE_PRESETS } from '@pro-print/editor'
import type { TemplateRecord } from '~/composables/use-template-repository'

// PrintDesignPro Home: quick-start paper sizes + recent designs (IndexedDB).
const repo = useTemplateRepository()
const { t } = useAppLocale()
const recents = ref<TemplateRecord[]>([])
const search = ref('')

onMounted(async () => {
  recents.value = (await repo.list()).slice(0, 6)
})

const filteredRecents = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query)
    return recents.value
  return recents.value.filter(record => record.name.toLowerCase().includes(query))
})

interface QuickSize {
  nameKey: 'paper.a4' | 'paper.a5' | 'paper.shipping' | 'paper.product'
  settings: PageSettings
  /** Thumb proportions (px). */
  iw: number
  ih: number
}

const QUICK: QuickSize[] = [
  { nameKey: 'paper.a4', settings: PAGE_PRESETS.a4, iw: 26, ih: 36 },
  { nameKey: 'paper.a5', settings: PAGE_PRESETS.a5, iw: 24, ih: 34 },
  { nameKey: 'paper.shipping', settings: PAGE_PRESETS.label100x150, iw: 26, ih: 38 },
  { nameKey: 'paper.product', settings: PAGE_PRESETS.label50x30, iw: 36, ih: 22 },
]

async function createFrom(quick: QuickSize): Promise<void> {
  // The localized preset name becomes the template's initial name.
  const doc = createEmptyTemplate(t(quick.nameKey), quick.settings)
  const record = await repo.save(doc)
  await navigateTo(`/editor/${record.id}`)
}

function relativeTime(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60_000)
  if (minutes < 60)
    return `${Math.max(1, minutes)} ${t('home.minutesAgo')}`
  const hours = Math.round(minutes / 60)
  if (hours < 24)
    return `${hours} ${t('home.hoursAgo')}`
  return `${Math.round(hours / 24)} ${t('home.daysAgo')}`
}
</script>

<template>
  <div class="mx-auto max-w-[1060px] px-10 py-9">
    <div class="mb-7 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">
          {{ t('home.welcome') }}
        </h1>
        <p class="mt-1 text-[13px] text-app-text2">
          {{ t('home.welcomeSub') }}
        </p>
      </div>
      <input
        v-model="search"
        :placeholder="t('home.search')"
        class="h-[38px] w-[260px] rounded-lg border border-app-border2 bg-app-panel px-3 text-[13px] text-app-text focus:outline-accent-500"
      >
    </div>

    <h2 class="mb-3 text-[13px] font-semibold text-app-text2">
      {{ t('home.quickStart') }}
    </h2>
    <div class="mb-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <button
        v-for="quick in QUICK"
        :key="quick.nameKey"
        type="button"
        class="flex cursor-pointer items-center gap-3 rounded-[10px] border border-app-border bg-app-panel p-4 text-left hover:border-accent-500 hover:shadow-sm"
        :data-test-quick="quick.nameKey"
        @click="createFrom(quick)"
      >
        <span
          class="shrink-0 rounded-[2px] border-[1.5px] border-accent-500 bg-accent-soft"
          :style="{ width: `${quick.iw}px`, height: `${quick.ih}px` }"
        />
        <span>
          <span class="block text-[13px] font-semibold">{{ t(quick.nameKey) }}</span>
          <span class="block font-uimono text-[11px] text-app-text3">{{ quick.settings.widthMm }} × {{ quick.settings.heightMm }} mm</span>
        </span>
      </button>
    </div>

    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-[13px] font-semibold text-app-text2">
        {{ t('home.recents') }}
      </h2>
      <NuxtLink
        to="/templates"
        class="text-[13px] text-accent-500 hover:underline"
      >
        {{ t('home.viewAll') }}
      </NuxtLink>
    </div>

    <p
      v-if="filteredRecents.length === 0"
      class="rounded-xl border border-dashed border-app-border2 py-14 text-center text-[13px] text-app-text3"
    >
      {{ t('home.empty') }}
    </p>
    <div
      v-else
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <button
        v-for="record in filteredRecents"
        :key="record.id"
        type="button"
        class="cursor-pointer overflow-hidden rounded-xl border border-app-border bg-app-panel text-left hover:border-accent-500 hover:shadow-sm"
        @click="navigateTo(`/editor/${record.id}`)"
      >
        <div class="flex h-[150px] items-center justify-center border-b border-app-border bg-app-inset">
          <div
            class="flex flex-col gap-1 rounded-[2px] border border-app-border2 bg-white p-2 shadow-sm"
            :style="{
              width: `${Math.round((record.doc.page.widthMm / Math.max(record.doc.page.widthMm, record.doc.page.heightMm)) * 90)}px`,
              height: `${Math.round((record.doc.page.heightMm / Math.max(record.doc.page.widthMm, record.doc.page.heightMm)) * 90)}px`,
            }"
          >
            <span class="block h-[6px] w-3/5 rounded-sm bg-[#2a3547]" />
            <span class="block h-1 w-4/5 rounded-sm bg-[#c4ccd8]" />
            <span class="block h-1 w-2/3 rounded-sm bg-[#c4ccd8]" />
          </div>
        </div>
        <div class="px-3.5 py-3">
          <div class="truncate text-[13px] font-semibold">
            {{ record.name }}
          </div>
          <div class="mt-1 font-uimono text-[11px] text-app-text3">
            {{ record.doc.page.widthMm }}×{{ record.doc.page.heightMm }}mm · {{ relativeTime(record.updatedAt) }}
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
