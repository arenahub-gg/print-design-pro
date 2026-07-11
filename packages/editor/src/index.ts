// Public API barrel for @pro-print/editor: headless core (schema, commands,
// stores), render/export pipeline, and the PrintDesigner UI shell.
import './styles/index.css'

/** Library version, kept in sync with package.json at release time. */
export const version = '0.1.0'

// Units
export { CSS_DPI, MM_PER_INCH, mmToPx, pxToMm, roundMm } from './core/units'

// Schema + types
export {
  BARCODE_FORMATS,
  barcodeElementSchema,
  circleElementSchema,
  elementSchema,
  imageElementSchema,
  lineElementSchema,
  qrElementSchema,
  rectElementSchema,
  textElementSchema,
} from './core/schema/elements'
export type {
  BarcodeElement,
  BarcodeFormat,
  TableColumn,
  TableElement,
  CircleElement,
  ElementPatch,
  ElementType,
  ImageElement,
  LineElement,
  QrElement,
  RectElement,
  TemplateElement,
  TextElement,
} from './core/schema/elements'
export { PAGE_PRESETS, pageSettingsSchema } from './core/schema/page'
export type { PagePresetKey, PageSettings } from './core/schema/page'
export { createEmptyTemplate, guideSchema, newId, templateDocumentSchema } from './core/schema/template'
export type { Guide, TemplateDocument } from './core/schema/template'
export { exportTemplate, importTemplate, parseTemplate } from './core/schema/validate'
export { openTemplate } from './core/open-template'

// Commands + history
export { CompositeCommand } from './core/commands/command'
export type { Command } from './core/commands/command'
export {
  addElementCommand,
  addGuideCommand,
  moveGuideCommand,
  removeElementsCommand,
  removeGuideCommand,
  renameTemplateCommand,
  reorderElementCommand,
  setPageSettingsCommand,
  updateElementsCommand,
} from './core/commands/element-commands'
export { HistoryManager, MAX_HISTORY } from './core/commands/history-manager'

// Shell (primary public component)
export { default as PrintDesigner } from './components/shell/PrintDesigner.vue'
export type { EditorLocale } from './locales/messages'
export { createBarcode, createCircle, createImage, createLine, createQr, createRect, createTable, createText } from './core/element-factories'
export { computeTableLayout } from './core/table-layout'
export type { TableLayout, TableMeasurer } from './core/table-layout'

// Print render pipeline
export { renderToCanvas } from './render/render-engine'
export type { RenderOptions } from './render/render-engine'
export { TEXT_LINE_HEIGHT, wrapText } from './render/text-layout'
export type { TextMeasurer } from './render/text-layout'
export { exportPng } from './render/export-image'
export { exportPdf } from './render/export-pdf'
export { printDocument } from './render/print-browser'
export { downloadBlob } from './render/download'

// Canvas
export { default as CanvasViewport } from './components/canvas/CanvasViewport.vue'
export { useCanvasGestures } from './composables/use-canvas-gestures'
export { rulerScaleForZoom } from './core/ruler-scale'
export type { RulerScale } from './core/ruler-scale'
export { elementAabb, combinedAabb, rotatedRectAabb } from './core/geometry'
export type { AabbMm, PointMm, RectMm } from './core/geometry'
export { collectSnapCandidates, snapAabb } from './core/snapping'
export type { SnapCandidates, SnapResult } from './core/snapping'

// Stores
export { useDocumentStore } from './stores/document-store'
export type { DocumentStore } from './stores/document-store'
export { useHistoryStore } from './stores/history-store'
export type { HistoryStore } from './stores/history-store'
export { useSelectionStore } from './stores/selection-store'
export type { SelectionStore } from './stores/selection-store'
export { MAX_ZOOM, MIN_ZOOM, useViewportStore } from './stores/viewport-store'
export type { PagePointMm, ScreenPoint, ViewportStore } from './stores/viewport-store'
export { useInteractionStore } from './stores/interaction-store'
export type { InteractionStore } from './stores/interaction-store'
