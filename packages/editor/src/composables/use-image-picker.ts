// Shared image-picking flow: file dialog -> validated data URL + aspect
// ratio. Data URLs keep documents self-contained (local-first) - a size
// guard stops multi-MB photos from bloating templates and IndexedDB.

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp'

export interface PickedImage {
  src: string
  /** width / height of the source bitmap. */
  aspectRatio: number
}

export class ImageTooLargeError extends Error {
  constructor() {
    super(`Image exceeds ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB`)
    this.name = 'ImageTooLargeError'
  }
}

/** Open the system file dialog; resolves null when the user cancels. */
export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = ACCEPTED_TYPES
    input.onchange = () => resolve(input.files?.[0] ?? null)
    // cancel event (supported in modern engines) resolves the promise too
    input.oncancel = () => resolve(null)
    input.click()
  })
}

export async function readImage(file: File): Promise<PickedImage> {
  if (file.size > MAX_IMAGE_BYTES)
    throw new ImageTooLargeError()

  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })

  const aspectRatio = await new Promise<number>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalWidth / Math.max(1, img.naturalHeight))
    img.onerror = () => reject(new Error('Not a decodable image'))
    img.src = src
  })

  return { src, aspectRatio }
}
