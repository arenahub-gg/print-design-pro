export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  // Editor is a pure client-side canvas app - SSR/hydration adds only risk there.
  routeRules: {
    '/editor/**': { ssr: false },
  },

  compatibilityDate: '2026-07-10',
})
