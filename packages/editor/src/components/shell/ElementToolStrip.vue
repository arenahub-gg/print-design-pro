<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useEditorI18n } from '../../composables/use-editor-i18n'
import { ImageTooLargeError, pickImageFile, readImage } from '../../composables/use-image-picker'
import { addElementCommand } from '../../core/commands/element-commands'
import {
  createBarcode,
  createCircle,
  createImage,
  createLine,
  createQr,
  createRect,
  createShape,
  createTable,
  createText,
} from '../../core/element-factories'
import { SHAPE_KINDS, type ShapeKind, type TemplateElement } from '../../core/schema/elements'
import { useDocumentStore } from '../../stores/document-store'
import { useHistoryStore } from '../../stores/history-store'
import { useSelectionStore } from '../../stores/selection-store'

// PrintDesignPro topbar tool strip: 46x42 tiles (mono glyph + tiny label) in
// an inset rounded container. Replaces the old left palette - same commands,
// same data-pp-palette-tile hooks so the E2E suite keeps working.
const doc = useDocumentStore()
const history = useHistoryStore()
const selection = useSelectionStore()
const { t } = useEditorI18n()

const TOOLS = [
  { key: 'rect', glyph: '▭', labelKey: 'palette.rect', create: createRect },
  { key: 'line', glyph: '—', labelKey: 'palette.line', create: createLine },
  { key: 'circle', glyph: '◯', labelKey: 'palette.circle', create: createCircle },
  { key: 'text', glyph: 'Aa', labelKey: 'palette.text', create: createText },
  { key: 'qr', glyph: '▦', labelKey: 'palette.qr', create: createQr },
  { key: 'barcode', glyph: '|||', labelKey: 'palette.barcode', create: createBarcode },
  { key: 'table', glyph: '⊞', labelKey: 'palette.table', create: createTable },
] as const

const emit = defineEmits<{ imageError: [message: string] }>()
const busy = ref(false)

// Shapes flyout: one tile fans out into the polygon kinds so the strip
// stays at design width. Closes on pick, outside pointerdown, or Escape.
const SHAPE_GLYPHS: Record<ShapeKind, string> = {
  triangle: '△',
  rightTriangle: '◺',
  diamond: '◇',
  parallelogram: '▱',
  trapezoid: '⏢',
  pentagon: '⬠',
  hexagon: '⬡',
  octagon: '⯃',
  star: '☆',
  star4: '✦',
  star6: '✶',
  arrow: '➔',
  chevron: '❯',
  plus: '✚',
}
const shapesOpen = ref(false)
const shapesRef = ref<HTMLElement | null>(null)
// The strip scrolls (overflow-x-auto), which would clip an absolute child -
// the menu is position:fixed, anchored to the tile at open time instead.
const menuStyle = ref<{ left: string, top: string }>({ left: '0px', top: '0px' })

function toggleShapes(): void {
  if (!shapesOpen.value && shapesRef.value) {
    const rect = shapesRef.value.getBoundingClientRect()
    menuStyle.value = { left: `${rect.left + rect.width / 2}px`, top: `${rect.bottom + 6}px` }
  }
  shapesOpen.value = !shapesOpen.value
}

function onOutsidePointerDown(event: PointerEvent): void {
  if (shapesOpen.value && !shapesRef.value?.contains(event.target as Node))
    shapesOpen.value = false
}
// The menu anchor is captured at open time - any scroll (incl. the strip's
// own overflow-x) or resize would leave it floating detached, so just close.
function closeShapes(): void {
  shapesOpen.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', onOutsidePointerDown, true)
  document.addEventListener('scroll', closeShapes, true)
  window.addEventListener('resize', closeShapes)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutsidePointerDown, true)
  document.removeEventListener('scroll', closeShapes, true)
  window.removeEventListener('resize', closeShapes)
})

function addShape(kind: ShapeKind): void {
  shapesOpen.value = false
  addElement(place => createShape(place, kind))
}

function addElement(create: (place: { centerXMm: number, centerYMm: number }) => TemplateElement): void {
  const element = create({ centerXMm: doc.page.widthMm / 2, centerYMm: doc.page.heightMm / 2 })
  history.dispatch(addElementCommand(doc, element))
  selection.select(element.id)
}

async function addImage(): Promise<void> {
  if (busy.value)
    return
  busy.value = true
  try {
    const file = await pickImageFile()
    if (!file)
      return
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
    emit('imageError', error instanceof ImageTooLargeError
      ? t('palette.imageTooLarge')
      : t('palette.imageInvalid'))
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="pp:flex pp:min-w-0 pp:gap-0.5 pp:overflow-x-auto pp:rounded-[10px] pp:border pp:border-app-border pp:bg-app-inset pp:p-[3px]">
    <button
      v-for="tool in TOOLS"
      :key="tool.key"
      type="button"
      :title="t(tool.labelKey)"
      class="pp:flex pp:h-[42px] pp:w-[46px] pp:shrink-0 pp:cursor-pointer pp:flex-col pp:items-center pp:justify-center pp:gap-0.5 pp:rounded-lg pp:text-app-text2 pp:hover:bg-brand-soft pp:hover:text-brand-500"
      :data-pp-palette-tile="tool.key"
      @click="addElement(tool.create)"
    >
      <span class="pp:font-uimono pp:text-[15px] pp:font-medium pp:leading-none">{{ tool.glyph }}</span>
      <span class="pp:text-[9px] pp:font-medium">{{ t(tool.labelKey) }}</span>
    </button>

    <!-- shapes flyout tile -->
    <div
      ref="shapesRef"
      class="pp:relative"
      @keydown.escape="shapesOpen = false"
    >
      <button
        type="button"
        :title="t('palette.shape')"
        class="pp:flex pp:h-[42px] pp:w-[46px] pp:shrink-0 pp:cursor-pointer pp:flex-col pp:items-center pp:justify-center pp:gap-0.5 pp:rounded-lg pp:text-app-text2 pp:hover:bg-brand-soft pp:hover:text-brand-500"
        :class="shapesOpen ? 'pp:bg-brand-soft pp:text-brand-500' : ''"
        data-pp-palette-tile="shape"
        @click="toggleShapes"
      >
        <span class="pp:font-uimono pp:text-[15px] pp:font-medium pp:leading-none">⬟</span>
        <span class="pp:text-[9px] pp:font-medium">{{ t('palette.shape') }}</span>
      </button>
      <div
        v-if="shapesOpen"
        class="pp:fixed pp:z-30 pp:grid pp:w-[224px] pp:-translate-x-1/2 pp:grid-cols-4 pp:gap-1 pp:rounded-[10px] pp:border pp:border-app-border pp:bg-app-panel pp:p-1.5 pp:shadow-app-lg"
        :style="menuStyle"
        data-pp-shape-menu
      >
        <button
          v-for="kind in SHAPE_KINDS"
          :key="kind"
          type="button"
          :title="t(`shape.${kind}` as never)"
          class="pp:flex pp:h-[42px] pp:cursor-pointer pp:flex-col pp:items-center pp:justify-center pp:gap-0.5 pp:rounded-lg pp:text-app-text2 pp:hover:bg-brand-soft pp:hover:text-brand-500"
          :data-pp-shape-kind="kind"
          @click="addShape(kind)"
        >
          <span class="pp:text-[15px] pp:leading-none">{{ SHAPE_GLYPHS[kind] }}</span>
          <span class="pp:text-[9px] pp:font-medium">{{ t(`shape.${kind}` as never) }}</span>
        </button>
      </div>
    </div>

    <button
      type="button"
      :title="t('palette.image')"
      class="pp:flex pp:h-[42px] pp:w-[46px] pp:shrink-0 pp:cursor-pointer pp:flex-col pp:items-center pp:justify-center pp:gap-0.5 pp:rounded-lg pp:text-app-text2 pp:hover:bg-brand-soft pp:hover:text-brand-500"
      data-pp-palette-tile="image"
      @click="addImage"
    >
      <span class="pp:font-uimono pp:text-[15px] pp:font-medium pp:leading-none">🖼</span>
      <span class="pp:text-[9px] pp:font-medium">{{ t('palette.image') }}</span>
    </button>
  </div>
</template>
