<script setup lang="ts">
import { ref } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { ImageTooLargeError, pickImageFile, readImage } from '../../composables/use-image-picker'
import { addElementCommand } from '../../core/commands/element-commands'
import { createBarcode, createCircle, createImage, createLine, createQr, createRect, createTable, createText } from '../../core/element-factories'
import type { TemplateElement } from '../../core/schema/elements'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import { useSelectionStore } from '../../stores/selection-store'

// Canva-like left panel: large friendly tiles. Click drops the element at
// the page center and selects it (drag-in deferred; click covers the flow).
const doc = useDocumentStore()
const history = useHistoryStore()
const selection = useSelectionStore()
const { t } = useEditorI18n()

const imageError = ref<string | null>(null)

async function addImage(): Promise<void> {
  imageError.value = null
  const file = await pickImageFile()
  if (!file)
    return
  try {
    const { src, aspectRatio } = await readImage(file)
    const element = createImage(
      { centerXMm: doc.page.widthMm / 2, centerYMm: doc.page.heightMm / 2 },
      src,
      aspectRatio,
      Math.min(80, doc.page.widthMm * 0.6),
    )
    history.dispatch(addElementCommand(doc, element))
    selection.select(element.id)
  }
  catch (error) {
    imageError.value = error instanceof ImageTooLargeError
      ? t('palette.imageTooLarge')
      : t('palette.imageInvalid')
  }
}

const TILES = [
  { key: 'rect', labelKey: 'palette.rect', create: createRect },
  { key: 'line', labelKey: 'palette.line', create: createLine },
  { key: 'circle', labelKey: 'palette.circle', create: createCircle },
  { key: 'text', labelKey: 'palette.text', create: createText },
  { key: 'qr', labelKey: 'palette.qr', create: createQr },
  { key: 'barcode', labelKey: 'palette.barcode', create: createBarcode },
  { key: 'table', labelKey: 'palette.table', create: createTable },
] as const

function addElement(create: (place: { centerXMm: number, centerYMm: number }) => TemplateElement): void {
  const element = create({ centerXMm: doc.page.widthMm / 2, centerYMm: doc.page.heightMm / 2 })
  history.dispatch(addElementCommand(doc, element))
  selection.select(element.id)
}
</script>

<template>
  <div class="pp:flex pp:h-full pp:flex-col pp:gap-3 pp:overflow-y-auto pp:bg-surface-panel pp:p-3">
    <h2 class="pp:text-xs pp:font-semibold pp:uppercase pp:tracking-wide pp:text-slate-500">
      {{ t('palette.elements') }}
    </h2>
    <div class="pp:grid pp:grid-cols-2 pp:gap-2">
      <button
        v-for="tile in TILES"
        :key="tile.key"
        type="button"
        class="pp:flex pp:flex-col pp:items-center pp:gap-2 pp:rounded-xl pp:border pp:border-slate-200 pp:bg-white pp:p-3 pp:text-xs pp:font-medium pp:text-slate-700 pp:transition hover:pp:border-brand-500 hover:pp:bg-brand-50 hover:pp:text-brand-700"
        :data-pp-palette-tile="tile.key"
        @click="addElement(tile.create)"
      >
        <svg
          class="pp:h-8 pp:w-8 pp:text-slate-500"
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <rect
            v-if="tile.key === 'rect'"
            x="5"
            y="9"
            width="22"
            height="14"
            rx="2"
          />
          <line
            v-else-if="tile.key === 'line'"
            x1="5"
            y1="16"
            x2="27"
            y2="16"
          />
          <circle
            v-else-if="tile.key === 'circle'"
            cx="16"
            cy="16"
            r="10"
          />
          <text
            v-else-if="tile.key === 'text'"
            x="16"
            y="21"
            text-anchor="middle"
            font-size="16"
            font-weight="600"
            fill="currentColor"
            stroke="none"
          >Aa</text>
          <g
            v-else-if="tile.key === 'qr'"
            fill="currentColor"
            stroke="none"
          >
            <rect
              x="6"
              y="6"
              width="8"
              height="8"
            />
            <rect
              x="18"
              y="6"
              width="8"
              height="8"
            />
            <rect
              x="6"
              y="18"
              width="8"
              height="8"
            />
            <rect
              x="18"
              y="18"
              width="3"
              height="3"
            />
            <rect
              x="23"
              y="21"
              width="3"
              height="3"
            />
            <rect
              x="18"
              y="23"
              width="3"
              height="3"
            />
          </g>
          <g
            v-else-if="tile.key === 'table'"
            stroke="currentColor"
            fill="none"
          >
            <rect
              x="5"
              y="7"
              width="22"
              height="18"
              rx="1"
            />
            <line
              x1="5"
              y1="13"
              x2="27"
              y2="13"
            />
            <line
              x1="5"
              y1="19"
              x2="27"
              y2="19"
            />
            <line
              x1="14"
              y1="7"
              x2="14"
              y2="25"
            />
            <line
              x1="20"
              y1="7"
              x2="20"
              y2="25"
            />
          </g>
          <g
            v-else-if="tile.key === 'barcode'"
            fill="currentColor"
            stroke="none"
          >
            <rect
              x="6"
              y="8"
              width="2"
              height="16"
            />
            <rect
              x="10"
              y="8"
              width="1"
              height="16"
            />
            <rect
              x="13"
              y="8"
              width="3"
              height="16"
            />
            <rect
              x="18"
              y="8"
              width="1"
              height="16"
            />
            <rect
              x="21"
              y="8"
              width="2"
              height="16"
            />
            <rect
              x="25"
              y="8"
              width="1"
              height="16"
            />
          </g>
        </svg>
        {{ t(tile.labelKey) }}
      </button>

      <button
        type="button"
        class="pp:flex pp:flex-col pp:items-center pp:gap-2 pp:rounded-xl pp:border pp:border-slate-200 pp:bg-white pp:p-3 pp:text-xs pp:font-medium pp:text-slate-700 pp:transition hover:pp:border-brand-500 hover:pp:bg-brand-50 hover:pp:text-brand-700"
        data-pp-palette-tile="image"
        @click="addImage"
      >
        <svg
          class="pp:h-8 pp:w-8 pp:text-slate-500"
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <rect
            x="5"
            y="7"
            width="22"
            height="18"
            rx="2"
          />
          <circle
            cx="12"
            cy="13"
            r="2"
          />
          <path d="m7 22 6-6 4 4 5-5 3 3" />
        </svg>
        {{ t('palette.image') }}
      </button>
    </div>

    <p
      v-if="imageError"
      class="pp:rounded-lg pp:bg-rose-50 pp:p-2 pp:text-[11px] pp:text-rose-600"
      data-pp-image-error
    >
      {{ imageError }}
    </p>
  </div>
</template>
