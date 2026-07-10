import type { DocumentStore } from '../stores/document-store'
import type { HistoryStore } from '../stores/history-store'
import type { SelectionStore } from '../stores/selection-store'
import { cloneJson } from './clone'
import type { TemplateDocument } from './schema/template'

/**
 * The one supported way to open a document. Replacing the document without
 * clearing history would let stale commands from the previous document
 * corrupt the new one on undo; clearing selection avoids dangling ids.
 * The document is cloned so the caller keeps no live alias into the store.
 */
export function openTemplate(
  doc: TemplateDocument,
  stores: {
    document: DocumentStore
    history: HistoryStore
    selection?: SelectionStore
  },
): void {
  stores.document.loadTemplate(cloneJson(doc))
  stores.history.clear()
  stores.selection?.clear()
}
