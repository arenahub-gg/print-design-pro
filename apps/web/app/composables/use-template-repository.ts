import type { TemplateDocument } from '@pro-print/editor'
import { createEmptyTemplate, parseTemplate } from '@pro-print/editor'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

// Local-first template storage (IndexedDB). Server sync is a later round -
// this module is the only place that knows how templates are persisted.

export interface TemplateRecord {
  id: string
  name: string
  updatedAt: number
  doc: TemplateDocument
}

interface TemplateDb extends DBSchema {
  templates: {
    key: string
    value: TemplateRecord
    indexes: { 'by-updated': number }
  }
}

let dbPromise: Promise<IDBPDatabase<TemplateDb>> | null = null

function db(): Promise<IDBPDatabase<TemplateDb>> {
  dbPromise ??= openDB<TemplateDb>('pro-print-designer', 1, {
    upgrade(database) {
      const store = database.createObjectStore('templates', { keyPath: 'id' })
      store.createIndex('by-updated', 'updatedAt')
    },
  })
  return dbPromise
}

export function useTemplateRepository() {
  async function list(): Promise<TemplateRecord[]> {
    const records = await (await db()).getAllFromIndex('templates', 'by-updated')
    return records.reverse()
  }

  async function get(id: string): Promise<TemplateRecord | undefined> {
    return (await db()).get('templates', id)
  }

  async function save(doc: TemplateDocument): Promise<TemplateRecord> {
    // Validate before persisting - a corrupt write would poison every load.
    const record: TemplateRecord = {
      id: doc.id,
      name: doc.name,
      updatedAt: Date.now(),
      doc: parseTemplate(JSON.parse(JSON.stringify(doc))),
    }
    await (await db()).put('templates', record)
    return record
  }

  async function create(name: string): Promise<TemplateRecord> {
    return save(createEmptyTemplate(name))
  }

  async function duplicate(id: string): Promise<TemplateRecord | undefined> {
    const record = await get(id)
    if (!record)
      return undefined
    const clone = JSON.parse(JSON.stringify(record.doc)) as TemplateDocument
    clone.id = crypto.randomUUID()
    clone.name = `${record.name} (copy)`
    return save(clone)
  }

  async function rename(id: string, name: string): Promise<void> {
    const record = await get(id)
    if (!record)
      return
    record.name = name
    record.doc.name = name
    record.updatedAt = Date.now()
    await (await db()).put('templates', record)
  }

  async function remove(id: string): Promise<void> {
    await (await db()).delete('templates', id)
  }

  return { list, get, save, create, duplicate, rename, remove }
}
