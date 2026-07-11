<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { ImageTooLargeError, pickImageFile, readImage } from '../../composables/use-image-picker'
import { updateElementsCommand } from '../../core/commands/element-commands'
import {
  BARCODE_FORMATS,
  type BarcodeElement,
  type ElementPatch,
  type ImageElement,
  type QrElement,
  type TextElement,
} from '../../core/schema/elements'
import { roundMm } from '../../core/units'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import { useSelectionStore } from '../../stores/selection-store'
import NumberField from './panel-controls/NumberField.vue'

// Right contextual panel. Every edit commits through a command so it is
// undoable and the canvas stays in sync automatically.
const doc = useDocumentStore()
const history = useHistoryStore()
const selection = useSelectionStore()
const { t } = useEditorI18n()

const selected = computed(() =>
  doc.elements.filter(el => selection.isSelected(el.id)),
)

const single = computed(() => (selected.value.length === 1 ? selected.value[0]! : null))
const singleText = computed<TextElement | null>(() =>
  single.value?.type === 'text' ? single.value : null,
)
const singleImage = computed<ImageElement | null>(() =>
  single.value?.type === 'image' ? single.value : null,
)
const singleQr = computed<QrElement | null>(() =>
  single.value?.type === 'qr' ? single.value : null,
)
const singleBarcode = computed<BarcodeElement | null>(() =>
  single.value?.type === 'barcode' ? single.value : null,
)

/** Commit a patch on the single selected element (skips locked). */
function commitSingle(id: string, locked: boolean, patch: ElementPatch, label: string): void {
  if (locked)
    return
  history.dispatch(updateElementsCommand(doc, [{ id, patch }], label))
}

/** Shared numeric value across the selection, or null when mixed. */
function shared(key: 'xMm' | 'yMm' | 'widthMm' | 'heightMm' | 'rotation'): number | null {
  if (selected.value.length === 0)
    return null
  const first = selected.value[0]![key]
  return selected.value.every(el => el[key] === first) ? first : null
}

const xMm = computed(() => shared('xMm'))
const yMm = computed(() => shared('yMm'))
const widthMm = computed(() => shared('widthMm'))
const heightMm = computed(() => shared('heightMm'))
const rotation = computed(() => shared('rotation'))
const allLocked = computed(() => selected.value.length > 0 && selected.value.every(el => el.locked))

function apply(patch: ElementPatch, label: string, options: { includeLocked?: boolean } = {}): void {
  const targets = options.includeLocked
    ? selected.value
    : selected.value.filter(el => !el.locked)
  if (targets.length === 0)
    return
  history.dispatch(updateElementsCommand(doc, targets.map(el => ({ id: el.id, patch })), label))
}

function commitGeometry(key: 'xMm' | 'yMm' | 'widthMm' | 'heightMm', value: number): void {
  const rounded = roundMm(value)
  if (rounded === shared(key))
    return // normalization no-op - keep the history stack clean
  apply({ [key]: rounded } as ElementPatch, 'Edit geometry')
}

function commitRotation(value: number): void {
  const normalized = ((value % 360) + 360) % 360
  if (normalized === shared('rotation'))
    return
  apply({ rotation: normalized }, 'Rotate element')
}

function toggleLock(): void {
  apply({ locked: !allLocked.value } as ElementPatch, allLocked.value ? 'Unlock' : 'Lock', { includeLocked: true })
}

const imageError = ref<string | null>(null)

async function replaceImage(): Promise<void> {
  if (!singleImage.value || singleImage.value.locked)
    return
  imageError.value = null
  const file = await pickImageFile()
  if (!file)
    return
  try {
    const { src } = await readImage(file)
    history.dispatch(updateElementsCommand(
      doc,
      [{ id: singleImage.value.id, patch: { src } as ElementPatch }],
      'Replace image',
    ))
  }
  catch (error) {
    imageError.value = error instanceof ImageTooLargeError
      ? t('palette.imageTooLarge')
      : t('palette.imageInvalid')
  }
}

function commitText(patch: Partial<Pick<TextElement, 'content' | 'fontSizePt' | 'fontWeight' | 'align'>>, label: string): void {
  // Locked elements are read-only everywhere, text props included.
  if (!singleText.value || singleText.value.locked)
    return
  history.dispatch(updateElementsCommand(doc, [{ id: singleText.value.id, patch: patch as ElementPatch }], label))
}
</script>

<template>
  <div class="pp:flex pp:h-full pp:flex-col pp:gap-4 pp:overflow-y-auto pp:bg-surface-panel pp:p-3">
    <h2 class="pp:text-xs pp:font-semibold pp:uppercase pp:tracking-wide pp:text-slate-500">
      {{ t('panel.title') }}
    </h2>

    <p
      v-if="selected.length === 0"
      class="pp:rounded-xl pp:bg-slate-50 pp:p-4 pp:text-center pp:text-xs pp:text-slate-400"
      data-pp-panel-empty
    >
      {{ t('panel.empty') }}
    </p>

    <template v-else>
      <p
        v-if="selected.length > 1"
        class="pp:text-xs pp:text-slate-500"
      >
        {{ selected.length }} {{ t('panel.multi') }}
      </p>

      <section class="pp:flex pp:flex-col pp:gap-2">
        <h3 class="pp:text-[11px] pp:font-semibold pp:text-slate-400">
          {{ t('panel.position') }}
        </h3>
        <div class="pp:grid pp:grid-cols-2 pp:gap-2">
          <NumberField
            :label="t('panel.x')"
            :model-value="xMm"
            :mixed="xMm === null"
            :disabled="allLocked"
            @commit="commitGeometry('xMm', $event)"
          />
          <NumberField
            :label="t('panel.y')"
            :model-value="yMm"
            :mixed="yMm === null"
            :disabled="allLocked"
            @commit="commitGeometry('yMm', $event)"
          />
          <NumberField
            :label="t('panel.width')"
            :model-value="widthMm"
            :min="1"
            :mixed="widthMm === null"
            :disabled="allLocked"
            @commit="commitGeometry('widthMm', $event)"
          />
          <NumberField
            :label="t('panel.height')"
            :model-value="heightMm"
            :min="1"
            :mixed="heightMm === null"
            :disabled="allLocked"
            @commit="commitGeometry('heightMm', $event)"
          />
        </div>
        <NumberField
          :label="'°'"
          :model-value="rotation"
          :step="1"
          :mixed="rotation === null"
          :disabled="allLocked"
          @commit="commitRotation"
        />
        <label class="pp:flex pp:items-center pp:gap-2 pp:text-xs pp:text-slate-600">
          <input
            type="checkbox"
            :checked="allLocked"
            class="pp:accent-brand-500"
            data-pp-lock-toggle
            @change="toggleLock"
          >
          {{ t('panel.locked') }}
        </label>
      </section>

      <section
        v-if="singleImage"
        class="pp:flex pp:flex-col pp:gap-2"
        data-pp-image-section
      >
        <h3 class="pp:text-[11px] pp:font-semibold pp:text-slate-400">
          {{ t('palette.image') }}
        </h3>
        <button
          type="button"
          class="pp:rounded-lg pp:border pp:border-slate-200 pp:px-3 pp:py-1.5 pp:text-xs pp:text-slate-600 hover:pp:bg-slate-50 disabled:pp:opacity-40"
          :disabled="singleImage.locked"
          data-pp-replace-image
          @click="replaceImage"
        >
          {{ t('panel.replaceImage') }}
        </button>
        <p
          v-if="imageError"
          class="pp:rounded-lg pp:bg-rose-50 pp:p-2 pp:text-[11px] pp:text-rose-600"
        >
          {{ imageError }}
        </p>
      </section>

      <section
        v-if="singleQr"
        class="pp:flex pp:flex-col pp:gap-2"
        data-pp-qr-section
      >
        <h3 class="pp:text-[11px] pp:font-semibold pp:text-slate-400">
          {{ t('panel.qr') }}
        </h3>
        <textarea
          :value="singleQr.content"
          :disabled="singleQr.locked"
          rows="2"
          class="pp:w-full pp:rounded-lg pp:border pp:border-slate-200 pp:bg-white pp:p-2 pp:text-xs pp:text-slate-800 focus:pp:border-brand-500 focus:pp:outline-none"
          data-pp-qr-content
          @change="commitSingle(singleQr.id, singleQr.locked, { content: ($event.target as HTMLTextAreaElement).value } as ElementPatch, 'Edit QR')"
        />
        <label class="pp:flex pp:items-center pp:gap-2 pp:text-xs pp:text-slate-600">
          {{ t('panel.ecLevel') }}
          <select
            :value="singleQr.ecLevel"
            :disabled="singleQr.locked"
            class="pp:rounded-lg pp:border pp:border-slate-200 pp:bg-white pp:px-2 pp:py-1 pp:text-xs"
            @change="commitSingle(singleQr.id, singleQr.locked, { ecLevel: ($event.target as HTMLSelectElement).value } as ElementPatch, 'QR level')"
          >
            <option
              v-for="level in ['L', 'M', 'Q', 'H']"
              :key="level"
              :value="level"
            >{{ level }}</option>
          </select>
        </label>
      </section>

      <section
        v-if="singleBarcode"
        class="pp:flex pp:flex-col pp:gap-2"
        data-pp-barcode-section
      >
        <h3 class="pp:text-[11px] pp:font-semibold pp:text-slate-400">
          {{ t('panel.barcode') }}
        </h3>
        <input
          :value="singleBarcode.content"
          :disabled="singleBarcode.locked"
          type="text"
          class="pp:w-full pp:rounded-lg pp:border pp:border-slate-200 pp:bg-white pp:px-2 pp:py-1.5 pp:text-xs pp:text-slate-800 focus:pp:border-brand-500 focus:pp:outline-none"
          data-pp-barcode-content
          @change="commitSingle(singleBarcode.id, singleBarcode.locked, { content: ($event.target as HTMLInputElement).value } as ElementPatch, 'Edit barcode')"
        >
        <label class="pp:flex pp:items-center pp:gap-2 pp:text-xs pp:text-slate-600">
          {{ t('panel.format') }}
          <select
            :value="singleBarcode.format"
            :disabled="singleBarcode.locked"
            class="pp:rounded-lg pp:border pp:border-slate-200 pp:bg-white pp:px-2 pp:py-1 pp:text-xs"
            @change="commitSingle(singleBarcode.id, singleBarcode.locked, { format: ($event.target as HTMLSelectElement).value } as ElementPatch, 'Barcode format')"
          >
            <option
              v-for="format in BARCODE_FORMATS"
              :key="format"
              :value="format"
            >{{ format }}</option>
          </select>
        </label>
        <label class="pp:flex pp:items-center pp:gap-2 pp:text-xs pp:text-slate-600">
          <input
            type="checkbox"
            :checked="singleBarcode.showText"
            :disabled="singleBarcode.locked"
            class="pp:accent-brand-500"
            @change="commitSingle(singleBarcode.id, singleBarcode.locked, { showText: !singleBarcode.showText } as ElementPatch, 'Barcode text')"
          >
          {{ t('panel.showText') }}
        </label>
      </section>

      <section
        v-if="singleText"
        class="pp:flex pp:flex-col pp:gap-2"
        data-pp-text-section
      >
        <h3 class="pp:text-[11px] pp:font-semibold pp:text-slate-400">
          {{ t('panel.text') }}
        </h3>
        <textarea
          :value="singleText.content"
          :disabled="singleText.locked"
          rows="3"
          class="pp:w-full pp:rounded-lg pp:border pp:border-slate-200 pp:bg-white pp:p-2 pp:text-xs pp:text-slate-800 focus:pp:border-brand-500 focus:pp:outline-none"
          @change="commitText({ content: ($event.target as HTMLTextAreaElement).value }, 'Edit text')"
        />
        <NumberField
          :label="'pt'"
          :model-value="singleText.fontSizePt"
          :min="1"
          :step="1"
          @commit="commitText({ fontSizePt: $event }, 'Font size')"
        />
        <div class="pp:flex pp:items-center pp:justify-between pp:gap-2">
          <label class="pp:flex pp:items-center pp:gap-2 pp:text-xs pp:text-slate-600">
            <input
              type="checkbox"
              :checked="singleText.fontWeight === 700"
              :disabled="singleText.locked"
              class="pp:accent-brand-500"
              @change="commitText({ fontWeight: singleText.fontWeight === 700 ? 400 : 700 }, 'Bold')"
            >
            {{ t('panel.bold') }}
          </label>
          <div class="pp:flex pp:gap-1">
            <button
              v-for="align in (['left', 'center', 'right'] as const)"
              :key="align"
              type="button"
              class="pp:rounded-md pp:border pp:px-2 pp:py-1 pp:text-[11px]"
              :class="singleText.align === align
                ? 'pp:border-brand-500 pp:bg-brand-50 pp:text-brand-700'
                : 'pp:border-slate-200 pp:text-slate-500'"
              @click="commitText({ align }, 'Align text')"
            >
              {{ t(align === 'left' ? 'panel.alignLeft' : align === 'center' ? 'panel.alignCenter' : 'panel.alignRight') }}
            </button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
