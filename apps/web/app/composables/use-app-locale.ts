import { appMessages, type AppLocale, type AppMessageKey } from '~/locales/app-messages'

const STORAGE_KEY = 'pp-locale'

/**
 * App UI locale. Default is English; the stored preference is applied AFTER
 * hydration (plugins/app-locale.client.ts) so SSR markup and first client
 * render agree - the text then swaps reactively for returning vi users.
 */
export function useAppLocale() {
  // useState: one shared ref across components and SSR payload.
  const locale = useState<AppLocale>('pp-locale', () => 'en')

  function setLocale(next: AppLocale): void {
    locale.value = next
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, next)
      }
      catch {
        // storage may be unavailable (private mode) - preference just won't stick
      }
    }
  }

  /** All locales in display order - drives every language picker. */
  const locales = Object.keys(appMessages) as AppLocale[]

  /** Translate with `{placeholder}` interpolation; falls back to English. */
  function t(key: AppMessageKey, params?: Record<string, string>): string {
    let text: string = appMessages[locale.value]?.[key] ?? appMessages.en[key] ?? key
    if (params) {
      for (const [name, value] of Object.entries(params))
        text = text.replace(`{${name}}`, value)
    }
    return text
  }

  return { locale: readonly(locale), locales, setLocale, t }
}

export function readStoredLocale(): AppLocale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored && stored in appMessages ? (stored as AppLocale) : null
  }
  catch {
    return null
  }
}

/** Native names for pickers - a language is always shown in itself. */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
  zh: '中文',
}
