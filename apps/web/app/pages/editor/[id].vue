<script setup lang="ts">
import type { TemplateDocument } from '@pro-print/editor'
import { exportTemplate, importTemplate, PrintDesigner } from '@pro-print/editor'
import '@pro-print/editor/style.css'

// Editor host page: loads from IndexedDB, autosaves debounced snapshots the
// editor emits, offers JSON export/import. Client-only (ssr disabled via
// routeRules) - the editor is a pure canvas app.
definePageMeta({ layout: false })

const route = useRoute()
const repo = useTemplateRepository()
const toast = useToast()

const template = ref<TemplateDocument | null>(null)
const notFound = ref(false)
const saving = ref(false)

async function load(id: string): Promise<void> {
  const record = await repo.get(id)
  if (record) {
    template.value = record.doc
    notFound.value = false
  }
  else {
    notFound.value = true
  }
}

onMounted(() => load(route.params.id as string))
// Nuxt reuses the page component when only the param changes.
watch(() => route.params.id, id => load(id as string))

// Autosave: the editor already debounces its snapshots (400ms); a short
// second debounce here batches bursts of snapshots into one IndexedDB write.
const AUTOSAVE_MS = 800
let saveTimer: ReturnType<typeof setTimeout> | null = null

async function persist(doc: TemplateDocument): Promise<void> {
  try {
    await repo.save(doc)
  }
  catch (error) {
    toast.add({
      title: 'Autosave failed — your changes are NOT saved',
      description: error instanceof Error ? error.message.slice(0, 200) : 'Storage error',
      color: 'error',
    })
  }
  finally {
    saving.value = false
  }
}

function onDocumentUpdate(doc: TemplateDocument): void {
  template.value = doc
  if (saveTimer)
    clearTimeout(saveTimer)
  saving.value = true
  saveTimer = setTimeout(() => {
    saveTimer = null
    void persist(doc)
  }, AUTOSAVE_MS)
}

// Browser close / hard reload: flush any pending write best-effort (the SPA
// navigation path is already covered by the editor's unmount flush).
function flushPending(): void {
  if (saveTimer && template.value) {
    clearTimeout(saveTimer)
    saveTimer = null
    void persist(template.value)
  }
}
onMounted(() => window.addEventListener('pagehide', flushPending))
onBeforeUnmount(() => {
  window.removeEventListener('pagehide', flushPending)
  flushPending()
})

function exportJson(): void {
  if (!template.value)
    return
  const blob = new Blob([exportTemplate(template.value)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${template.value.name || 'template'}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function importJson(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !template.value)
    return
  try {
    const imported = importTemplate(await file.text())
    // Keep the current record identity so the import lands in this template.
    imported.id = template.value.id
    // Drop any pending autosave of the pre-import document - it would
    // otherwise overwrite the import moments later.
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    template.value = imported
    await repo.save(imported)
    toast.add({ title: 'Template imported', color: 'success' })
  }
  catch (error) {
    toast.add({
      title: 'Import failed',
      description: error instanceof Error ? error.message.slice(0, 300) : 'Invalid file',
      color: 'error',
    })
  }
}
</script>

<template>
  <div class="h-screen">
    <div
      v-if="notFound"
      class="flex h-full flex-col items-center justify-center gap-4"
    >
      <p class="text-lg font-medium">
        Template not found
      </p>
      <UButton to="/templates">
        Back to templates
      </UButton>
    </div>

    <ClientOnly v-else>
      <PrintDesigner
        v-if="template"
        :model-value="template"
        locale="en"
        class="h-full"
        @update:model-value="onDocumentUpdate"
      >
        <template #actions>
          <span
            v-if="saving"
            class="text-xs text-slate-400"
          >Saving…</span>
          <UButton
            to="/templates"
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-arrow-left"
          >
            Templates
          </UButton>
          <UButton
            size="sm"
            variant="soft"
            icon="i-lucide-download"
            @click="exportJson"
          >
            Export
          </UButton>
          <label>
            <UButton
              size="sm"
              variant="soft"
              icon="i-lucide-upload"
              as="span"
            >
              Import
            </UButton>
            <input
              type="file"
              accept=".json,application/json"
              class="hidden"
              @change="importJson"
            >
          </label>
        </template>
      </PrintDesigner>
      <div
        v-else
        class="flex h-full items-center justify-center text-muted"
      >
        Loading editor…
      </div>
    </ClientOnly>
  </div>
</template>
