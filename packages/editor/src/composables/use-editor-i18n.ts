import { computed, inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { messages, type EditorLocale, type MessageKey } from '../locales/messages'

interface EditorI18n {
  locale: ComputedRef<EditorLocale>
  t: (key: MessageKey) => string
}

const KEY: InjectionKey<EditorI18n> = Symbol('pp-editor-i18n')

/** Called once by PrintDesigner; children read via useEditorI18n(). */
export function provideEditorI18n(locale: Ref<EditorLocale>): EditorI18n {
  const api: EditorI18n = {
    locale: computed(() => locale.value),
    // Optional chain: an untyped host may pass an unknown locale string.
    t: (key) => messages[locale.value]?.[key] ?? messages.en[key] ?? key,
  }
  provide(KEY, api)
  return api
}

export function useEditorI18n(): EditorI18n {
  const api = inject(KEY)
  if (!api) {
    // Standalone canvas usage without the shell - fall back to English.
    return { locale: computed(() => 'en' as EditorLocale), t: key => messages.en[key] ?? key }
  }
  return api
}
