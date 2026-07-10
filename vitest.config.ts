import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// Root vitest config: unit tests live inside packages (editor core is the
// primary suite). Component tests opt into happy-dom per file via
// `@vitest-environment`; the Nuxt app is covered by Playwright E2E.
export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['packages/*/src/**/*.spec.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
})
