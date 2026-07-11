import { ref, type Ref } from 'vue'

// Library-side theme toggle. Shares the SAME storage key and <html>
// data-theme attribute as the host app's composable, so either side can
// flip the theme and both react (all tokens key off [data-theme="dark"]).

export type EditorTheme = 'light' | 'dark'

const STORAGE_KEY = 'pp-theme'

const theme = ref<EditorTheme>('light')

function apply(next: EditorTheme): void {
  document.documentElement.dataset.theme = next
  // Bridge for Nuxt UI (and any host lib) that keys dark styling off `.dark`.
  document.documentElement.classList.toggle('dark', next === 'dark')
}

export function useEditorTheme(): { theme: Ref<EditorTheme>, toggle: () => void } {
  if (typeof document !== 'undefined') {
    // Re-sync from the DOM on every call: the HOST composable (or a
    // pre-paint script) may have flipped the attribute since our last read.
    let current: string | null | undefined = document.documentElement.dataset.theme
    if (!current) {
      try {
        current = localStorage.getItem(STORAGE_KEY)
      }
      catch {
        current = null
      }
    }
    theme.value = current === 'dark' ? 'dark' : 'light'
    apply(theme.value)
  }

  function toggle(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    apply(theme.value)
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    }
    catch {
      // storage may be unavailable (private mode) - theme still applies
    }
  }

  return { theme, toggle }
}
