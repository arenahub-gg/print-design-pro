<script setup lang="ts">
// Public landing page introducing the open-source project. The workspace
// dashboard lives at /app; this route opts out of the sidebar shell.
definePageMeta({ layout: false })

// SEO renders server-side with the English default locale.
useSeoMeta({
  title: 'PrintDesignPro — Open-source label & print form designer',
  description:
    'Open-source (MIT) WYSIWYG print designer: shipping labels, product tags, '
    + 'QR codes, barcodes, data tables. Export 300 DPI PNG or exact-size PDF. '
    + 'Local-first — your data stays on your machine.',
})
</script>

<template>
  <div class="min-h-screen bg-app-bg text-app-text">
    <LandingNav />
    <main>
      <LandingHero />
      <LandingFeatures />
      <LandingOpenSource />
    </main>
    <LandingFooter />
  </div>
</template>
