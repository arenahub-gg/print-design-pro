/**
 * Deep-clone document data. Schema types are pure JSON by construction, and
 * store objects are Vue reactive proxies (structuredClone rejects proxies),
 * so a JSON round-trip is both safe and proxy-free.
 */
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
