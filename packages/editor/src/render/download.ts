/**
 * Trigger a browser download for a blob. Client-only (guarded by usage -
 * the editor itself never renders on the server).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Deferred revoke: synchronous revoke races the download in some engines.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
