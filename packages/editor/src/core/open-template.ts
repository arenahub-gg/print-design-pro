import type { DocumentStore } from '../stores/document-store'
import type { HistoryStore } from '../stores/history-store'
import type { SelectionStore } from '../stores/selection-store'
import { cloneJson } from './clone'
import type { TemplateDocument } from './schema/template'
import { parseTemplate } from './schema/validate'

/**
 * The one supported way to open a document. Replacing the document without
 * clearing history would let stale commands from the previous document
 * corrupt the new one on undo; clearing selection avoids dangling ids.
 * The document is cloned so the caller keeps no live alias into the store.
 *
 * The clone is run through parseTemplate: hosts hand us documents straight
 * from storage WITHOUT parsing, so this is the single choke point where
 * schema defaults migrate older documents (e.g. pre-round-6 elements gain
 * strokeStyle). Skipping it leaves keys absent and updateElementsCommand's
 * `key in element` filter silently drops patches for them.
 */
export function openTemplate(
  doc: TemplateDocument,
  stores: {
    document: DocumentStore
    history: HistoryStore
    selection?: SelectionStore
  },
): void {
  stores.document.loadTemplate(parseTemplate(cloneJson(doc)))
  stores.history.clear()
  stores.selection?.clear()
}
