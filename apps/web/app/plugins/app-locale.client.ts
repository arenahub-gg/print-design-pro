import { readStoredLocale } from '~/composables/use-app-locale'

// Apply the stored locale preference AFTER hydration: SSR always renders the
// English default, so flipping state earlier would cause hydration
// mismatches. Post-mount the swap is a normal reactive update.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    const stored = readStoredLocale()
    if (stored)
      useState('pp-locale').value = stored
  })
})
