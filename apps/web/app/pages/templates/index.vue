<script setup lang="ts">
import type { TemplateRecord } from '~/composables/use-template-repository'

// Template manager: local-first grid backed by IndexedDB.
const repo = useTemplateRepository()
const templates = ref<TemplateRecord[]>([])
const loading = ref(true)
const toast = useToast()
const { t } = useAppLocale()

async function refresh(): Promise<void> {
  try {
    templates.value = await repo.list()
  }
  catch (error) {
    toast.add({
      title: t('templates.loadError'),
      description: error instanceof Error ? error.message.slice(0, 200) : 'Storage unavailable',
      color: 'error',
    })
  }
  finally {
    loading.value = false
  }
}

onMounted(refresh)

async function createTemplate(): Promise<void> {
  const record = await repo.create('Untitled template')
  await navigateTo(`/editor/${record.id}`)
}

async function duplicateTemplate(id: string): Promise<void> {
  await repo.duplicate(id)
  await refresh()
}

async function renameTemplate(record: TemplateRecord): Promise<void> {
  const name = window.prompt(t('templates.namePrompt'), record.name)?.trim()
  if (!name)
    return
  await repo.rename(record.id, name)
  await refresh()
}

async function removeTemplate(record: TemplateRecord): Promise<void> {
  if (!window.confirm(t('templates.deleteConfirm', { name: record.name })))
    return
  await repo.remove(record.id)
  toast.add({ title: t('templates.deletedToast'), color: 'neutral' })
  await refresh()
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <div class="mx-auto max-w-[1060px] px-10 py-9">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          {{ t('templates.title') }}
        </h1>
        <p class="mt-1 text-[13px] text-app-text2">
          {{ t('templates.sub') }}
        </p>
      </div>
      <!-- aria-label stays "New template" in every locale: stable e2e handle -->
      <UButton
        icon="i-lucide-plus"
        size="lg"
        aria-label="New template"
        @click="createTemplate"
      >
        {{ t('templates.new') }}
      </UButton>
    </div>

    <div
      v-if="loading"
      class="py-20 text-center text-muted"
    >
      {{ t('templates.loading') }}
    </div>

    <div
      v-else-if="templates.length === 0"
      class="rounded-xl border border-dashed border-default py-20 text-center text-muted"
    >
      {{ t('templates.empty') }}
    </div>

    <div
      v-else
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <UCard
        v-for="record in templates"
        :key="record.id"
        class="cursor-pointer transition hover:ring-2 hover:ring-primary"
        @click="navigateTo(`/editor/${record.id}`)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate font-medium">
              {{ record.name }}
            </p>
            <p class="mt-1 text-xs text-muted">
              {{ record.doc.page.widthMm }}×{{ record.doc.page.heightMm }}mm ·
              {{ record.doc.elements.length }} {{ t('templates.elements') }}
            </p>
            <p class="mt-1 text-xs text-dimmed">
              {{ formatDate(record.updatedAt) }}
            </p>
          </div>
          <UDropdownMenu
            :items="[
              { label: t('templates.rename'), icon: 'i-lucide-pencil', onSelect: () => renameTemplate(record) },
              { label: t('templates.duplicate'), icon: 'i-lucide-copy', onSelect: () => duplicateTemplate(record.id) },
              { label: t('templates.delete'), icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => removeTemplate(record) },
            ]"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              variant="ghost"
              color="neutral"
              size="sm"
              @click.stop
            />
          </UDropdownMenu>
        </div>
      </UCard>
    </div>
  </div>
</template>
