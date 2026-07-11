import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vite'

// Library build: ships ES + UMD bundles with vue/pinia externalized,
// plus a single compiled stylesheet (dist/editor.css) and .d.ts types.
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    dts({ tsconfigPath: './tsconfig.json', include: ['src'] }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ProPrintEditor',
      fileName: 'editor',
      cssFileName: 'editor',
    },
    rollupOptions: {
      // pdf-lib is externalized so the dynamic import in export-pdf.ts stays
      // a real lazy boundary for consumers (multi-format lib builds would
      // otherwise inline it eagerly into editor.js).
      external: ['vue', 'pinia', 'pdf-lib', 'qrcode', 'jsbarcode'],
      output: {
        globals: {
          'vue': 'Vue',
          'pinia': 'Pinia',
          'pdf-lib': 'PDFLib',
          'qrcode': 'QRCode',
          'jsbarcode': 'JsBarcode',
        },
      },
    },
  },
})
