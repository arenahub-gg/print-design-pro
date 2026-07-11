<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { ImageTooLargeError, pickImageFile, readImage } from '../../composables/use-image-picker'
import { cloneJson } from '../../core/clone'
import { addElementCommand, removeElementsCommand, updateElementsCommand } from '../../core/commands/element-commands'
import { newId } from '../../core/schema/template'
import {
  BARCODE_FORMATS,
  type BarcodeElement,
  type ElementPatch,
  type ImageElement,
  type QrElement,
  type TableElement,
  type TextElement,
} from '../../core/schema/elements'
import TableSection from './panel-sections/TableSection.vue'
import { roundMm } from '../../core/units'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import { useInteractionStore } from '../../stores/interaction-store'
import { useSelectionStore } from '../../stores/selection-store'
import ColorField from './panel-controls/ColorField.vue'
import NumberField from './panel-controls/NumberField.vue'

// Right contextual panel. Every edit commits through a command so it is
// undoable and the canvas stays in sync automatically.
const doc = useDocumentStore()
const history = useHistoryStore()
const selection = useSelectionStore()
const interaction = useInteractionStore()
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
const singleTable = computed<TableElement | null>(() =>
  single.value?.type === 'table' ? single.value : null,
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

// Design footer actions: duplicate (offset clone) and delete, both undoable.
// Guarded against live pointer gestures - mutating mid-drag would leave the
// gesture committing against stale ids (same rule as the keyboard map).
function duplicateSelected(): void {
  if (interaction.hasPreview || interaction.marquee)
    return
  const clones = selected.value
    .filter(el => !el.locked)
    .map((el) => {
      const clone = cloneJson(el)
      clone.id = newId()
      clone.xMm = roundMm(clone.xMm + 5)
      clone.yMm = roundMm(clone.yMm + 5)
      return clone
    })
  if (clones.length === 0)
    return
  history.transact(clones.length === 1 ? 'Duplicate element' : `Duplicate ${clones.length} elements`, () => {
    for (const clone of clones)
      history.dispatch(addElementCommand(doc, clone))
  })
  selection.setSelection(clones.map(clone => clone.id))
}

function deleteSelected(): void {
  if (interaction.hasPreview || interaction.marquee)
    return
  const ids = selected.value.filter(el => !el.locked).map(el => el.id)
  if (ids.length === 0)
    return
  history.dispatch(removeElementsCommand(doc, ids))
  selection.clear()
}

// Color rows for the single selection - one entry per color prop the
// element type carries. `transparent` is offered only where the renderers
// treat it as "paint nothing" (fills/backgrounds); QR stays hex-only
// because the qrcode lib requires hex colors.
interface ColorProp {
  key: string
  labelKey: `color.${string}`
  value: string
  allowTransparent?: boolean
}

const colorProps = computed<ColorProp[]>(() => {
  const el = single.value
  if (!el)
    return []
  switch (el.type) {
    case 'rect':
    case 'circle':
      return [
        { key: 'fillColor', labelKey: 'color.fill', value: el.fillColor, allowTransparent: true },
        { key: 'strokeColor', labelKey: 'color.stroke', value: el.strokeColor },
      ]
    case 'line':
      return [{ key: 'strokeColor', labelKey: 'color.stroke', value: el.strokeColor }]
    case 'text':
      return [{ key: 'color', labelKey: 'color.text', value: el.color }]
    case 'qr':
      return [
        { key: 'color', labelKey: 'color.foreground', value: el.color },
        { key: 'backgroundColor', labelKey: 'color.background', value: el.backgroundColor },
      ]
    case 'barcode':
      return [{ key: 'lineColor', labelKey: 'color.bars', value: el.lineColor }]
    case 'table':
      return [
        { key: 'borderColor', labelKey: 'color.border', value: el.borderColor },
        { key: 'headerBackground', labelKey: 'color.headerBg', value: el.headerBackground },
      ]
    default:
      return []
  }
})

function commitColor(key: string, value: string): void {
  if (!single.value || single.value.locked)
    return
  history.dispatch(updateElementsCommand(
    doc,
    [{ id: single.value.id, patch: { [key]: value } as ElementPatch }],
    'Change color',
  ))
}

function commitText(patch: Partial<Pick<TextElement, 'content' | 'fontSizePt' | 'fontWeight' | 'align'>>, label: string): void {
  // Locked elements are read-only everywhere, text props included.
  if (!singleText.value || singleText.value.locked)
    return
  history.dispatch(updateElementsCommand(doc, [{ id: singleText.value.id, patch: patch as ElementPatch }], label))
}
</script>

<template>
  <div class="pp:flex pp:h-full pp:flex-col pp:gap-3.5 pp:overflow-y-auto pp:bg-app-panel pp:p-3.5">
    <h2 class="pp:text-xs pp:font-bold pp:text-app-text">
      {{ t('panel.title') }}
    </h2>

    <p
      v-if="selected.length === 0"
      class="pp:px-2.5 pp:py-7 pp:text-center pp:text-xs pp:leading-relaxed pp:text-app-text3"
      data-pp-panel-empty
    >
      {{ t('panel.empty') }}
    </p>

    <template v-else>
      <!-- selection header: name + type chip -->
      <div class="pp:flex pp:items-center pp:gap-2">
        <span class="pp:min-w-0 pp:truncate pp:text-[13px] pp:font-semibold pp:text-app-text">
          {{ selected.length === 1 ? selected[0]!.name : `${selected.length} ${t('panel.multi')}` }}
        </span>
        <span
          v-if="selected.length === 1"
          class="pp:rounded pp:bg-brand-soft pp:px-1.5 pp:py-0.5 pp:text-[10px] pp:font-semibold pp:text-brand-500"
        >{{ selected[0]!.type }}</span>
      </div>

      <section class="pp:flex pp:flex-col pp:gap-2">
        <div class="pp:grid pp:grid-cols-2 pp:gap-2">
          <NumberField
            :label="t('panel.x')"
            :model-value="xMm"
            :mixed="xMm === null"
            :disabled="allLocked"
            unit="mm"
            @commit="commitGeometry('xMm', $event)"
          />
          <NumberField
            :label="t('panel.y')"
            :model-value="yMm"
            :mixed="yMm === null"
            :disabled="allLocked"
            unit="mm"
            @commit="commitGeometry('yMm', $event)"
          />
          <NumberField
            :label="t('panel.width')"
            :model-value="widthMm"
            :min="1"
            :mixed="widthMm === null"
            :disabled="allLocked"
            unit="mm"
            @commit="commitGeometry('widthMm', $event)"
          />
          <NumberField
            :label="t('panel.height')"
            :model-value="heightMm"
            :min="1"
            :mixed="heightMm === null"
            :disabled="allLocked"
            unit="mm"
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
        <label class="pp:flex pp:items-center pp:gap-2 pp:text-xs pp:text-app-text2">
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
        v-if="colorProps.length"
        class="pp:flex pp:flex-col pp:gap-2"
        data-pp-color-section
      >
        <h3 class="pp:text-[11px] pp:font-semibold pp:text-app-text3">
          {{ t('panel.colors') }}
        </h3>
        <ColorField
          v-for="prop in colorProps"
          :key="prop.key"
          :label="t(prop.labelKey as never)"
          :model-value="prop.value"
          :allow-transparent="prop.allowTransparent"
          :disabled="allLocked"
          @commit="commitColor(prop.key, $event)"
        />
      </section>

      <section
        v-if="singleImage"
        class="pp:flex pp:flex-col pp:gap-2"
        data-pp-image-section
      >
        <h3 class="pp:text-[11px] pp:font-semibold pp:text-app-text3">
          {{ t('palette.image') }}
        </h3>
        <button
          type="button"
          class="pp:rounded-lg pp:border pp:border-app-border2 pp:px-3 pp:py-1.5 pp:text-xs pp:text-app-text2 pp:hover:bg-app-inset pp:disabled:opacity-40"
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

      <TableSection
        v-if="singleTable"
        :element="singleTable"
      />

      <section
        v-if="singleQr"
        class="pp:flex pp:flex-col pp:gap-2"
        data-pp-qr-section
      >
        <h3 class="pp:text-[11px] pp:font-semibold pp:text-app-text3">
          {{ t('panel.qr') }}
        </h3>
        <textarea
          :value="singleQr.content"
          :disabled="singleQr.locked"
          rows="2"
          class="pp:w-full pp:rounded-lg pp:border pp:border-app-border2 pp:bg-app-panel pp:p-2 pp:text-xs pp:text-app-text pp:focus:border-brand-500 pp:focus:outline-none"
          data-pp-qr-content
          @change="commitSingle(singleQr.id, singleQr.locked, { content: ($event.target as HTMLTextAreaElement).value } as ElementPatch, 'Edit QR')"
        />
        <label class="pp:flex pp:items-center pp:gap-2 pp:text-xs pp:text-app-text2">
          {{ t('panel.ecLevel') }}
          <select
            :value="singleQr.ecLevel"
            :disabled="singleQr.locked"
            class="pp:rounded-lg pp:border pp:border-app-border2 pp:bg-app-panel pp:px-2 pp:py-1 pp:text-xs"
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
        <h3 class="pp:text-[11px] pp:font-semibold pp:text-app-text3">
          {{ t('panel.barcode') }}
        </h3>
        <input
          :value="singleBarcode.content"
          :disabled="singleBarcode.locked"
          type="text"
          class="pp:w-full pp:rounded-lg pp:border pp:border-app-border2 pp:bg-app-panel pp:px-2 pp:py-1.5 pp:text-xs pp:text-app-text pp:focus:border-brand-500 pp:focus:outline-none"
          data-pp-barcode-content
          @change="commitSingle(singleBarcode.id, singleBarcode.locked, { content: ($event.target as HTMLInputElement).value } as ElementPatch, 'Edit barcode')"
        >
        <label class="pp:flex pp:items-center pp:gap-2 pp:text-xs pp:text-app-text2">
          {{ t('panel.format') }}
          <select
            :value="singleBarcode.format"
            :disabled="singleBarcode.locked"
            class="pp:rounded-lg pp:border pp:border-app-border2 pp:bg-app-panel pp:px-2 pp:py-1 pp:text-xs"
            @change="commitSingle(singleBarcode.id, singleBarcode.locked, { format: ($event.target as HTMLSelectElement).value } as ElementPatch, 'Barcode format')"
          >
            <option
              v-for="format in BARCODE_FORMATS"
              :key="format"
              :value="format"
            >{{ format }}</option>
          </select>
        </label>
        <label class="pp:flex pp:items-center pp:gap-2 pp:text-xs pp:text-app-text2">
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
        <h3 class="pp:text-[11px] pp:font-semibold pp:text-app-text3">
          {{ t('panel.text') }}
        </h3>
        <textarea
          :value="singleText.content"
          :disabled="singleText.locked"
          rows="3"
          class="pp:w-full pp:rounded-lg pp:border pp:border-app-border2 pp:bg-app-panel pp:p-2 pp:text-xs pp:text-app-text pp:focus:border-brand-500 pp:focus:outline-none"
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
          <label class="pp:flex pp:items-center pp:gap-2 pp:text-xs pp:text-app-text2">
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
                : 'pp:border-app-border2 pp:text-app-text2'"
              @click="commitText({ align }, 'Align text')"
            >
              {{ t(align === 'left' ? 'panel.alignLeft' : align === 'center' ? 'panel.alignCenter' : 'panel.alignRight') }}
            </button>
          </div>
        </div>
      </section>
      <!-- footer actions -->
      <div class="pp:mt-1 pp:flex pp:gap-2">
        <button
          type="button"
          class="pp:h-[30px] pp:flex-1 pp:rounded-[7px] pp:border pp:border-app-border2 pp:text-xs pp:text-app-text2 pp:hover:bg-app-inset pp:disabled:opacity-40"
          :disabled="allLocked"
          data-pp-duplicate
          @click="duplicateSelected"
        >
          {{ t('panel.duplicate') }}
        </button>
        <button
          type="button"
          class="pp:h-[30px] pp:flex-1 pp:rounded-[7px] pp:border pp:border-app-border2 pp:text-xs pp:text-[#d1443c] pp:hover:bg-app-inset pp:disabled:opacity-40"
          :disabled="allLocked"
          data-pp-delete
          @click="deleteSelected"
        >
          {{ t('panel.delete') }}
        </button>
      </div>
    </template>
  </div>
</template>
