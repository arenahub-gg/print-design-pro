// Public API barrel for @pro-print/editor.
// Round 1 phase 2: headless core (schema, commands, stores). UI components
// (PrintDesigner shell, canvas) arrive in phases 3-5.
import './styles/index.css'

/** Library version, kept in sync with package.json at release time. */
export const version = '0.1.0'

// Units
export { CSS_DPI, MM_PER_INCH, mmToPx, pxToMm, roundMm } from './core/units'

// Schema + types
export {
  circleElementSchema,
  elementSchema,
  imageElementSchema,
  lineElementSchema,
  rectElementSchema,
  textElementSchema,
} from './core/schema/elements'
export type {
  CircleElement,
  ElementPatch,
  ElementType,
  ImageElement,
  LineElement,
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

// Canvas components (read-only in phase 3; interactions arrive in phase 4)
export { default as CanvasViewport } from './components/canvas/CanvasViewport.vue'
export { useCanvasGestures } from './composables/use-canvas-gestures'
export { rulerScaleForZoom } from './core/ruler-scale'
export type { RulerScale } from './core/ruler-scale'

// Stores
export { useDocumentStore } from './stores/document-store'
export type { DocumentStore } from './stores/document-store'
export { useHistoryStore } from './stores/history-store'
export type { HistoryStore } from './stores/history-store'
export { useSelectionStore } from './stores/selection-store'
export type { MarqueeRect, SelectionStore } from './stores/selection-store'
export { MAX_ZOOM, MIN_ZOOM, useViewportStore } from './stores/viewport-store'
export type { PagePointMm, ScreenPoint, ViewportStore } from './stores/viewport-store'
