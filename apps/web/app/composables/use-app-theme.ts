// App-wide theme (PrintDesignPro light/dark). The editor library's tokens
// react to the same `data-theme` attribute on <html>, so one toggle themes
// both the app chrome and the editor chrome. A pre-paint script in
// nuxt.config sets the attribute before hydration (no FOUC).

export type AppTheme = 'light' | 'dark'

const STORAGE_KEY = 'pp-theme'

const theme = ref<AppTheme>('light')

function apply(next: AppTheme): void {
  document.documentElement.dataset.theme = next
  // Bridge for Nuxt UI dark styling (keys off `.dark`).
  document.documentElement.classList.toggle('dark', next === 'dark')
}

export function useAppTheme() {
  if (import.meta.client) {
    // Re-sync from the DOM each call - the editor lib's toggle (or the
    // pre-paint script) may have changed it since our last read.
    theme.value = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  }

  function setTheme(next: AppTheme): void {
    theme.value = next
    if (import.meta.client) {
      try {
        localStorage.setItem(STORAGE_KEY, next)
      }
      catch {
        // storage may be blocked - theme still applies for the session
      }
      apply(next)
    }
  }

  function toggle(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme: readonly(theme), setTheme, toggle }
}
