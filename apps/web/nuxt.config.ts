export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      // Pre-paint theme: stamp data-theme before first paint (no FOUC) and
      // keep Nuxt UI's `.dark` class in sync.
      script: [
        {
          innerHTML: `(function(){try{var t=localStorage.getItem('pp-theme')==='dark'?'dark':'light';var d=document.documentElement;d.dataset.theme=t;d.classList.toggle('dark',t==='dark')}catch(e){}})()`,
        },
      ],
      // PrintDesignPro chrome typography (design tokens degrade to system-ui)
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },

  // Editor is a pure client-side canvas app - SSR/hydration adds only risk there.
  routeRules: {
    '/editor/**': { ssr: false },
    // Static-hosting SPA fallback (GitHub Pages serves 404.html for unknown
    // paths like /editor/<id>): an EMPTY client-rendered shell, so the router
    // renders from the real URL. A copied index.html would carry the landing
    // page's payload and hydrate to the wrong route.
    '/404.html': { ssr: false, prerender: true },
  },

  compatibilityDate: '2026-07-10',
})
