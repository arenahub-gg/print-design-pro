import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Playground dev server (`pnpm --filter @pro-print/editor play`) - separate
// from the lib build config on purpose.
export default defineConfig({
  root: __dirname,
  plugins: [vue(), tailwindcss()],
})
