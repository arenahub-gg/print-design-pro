import { defineConfig } from 'vitest/config'

// Root vitest config: unit tests live inside packages (editor core is the
// primary suite). The Nuxt app is covered by Playwright E2E in phase 6.
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.spec.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
})
