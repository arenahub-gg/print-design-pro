<script setup lang="ts">
// Public landing page introducing the open-source project. The workspace
// dashboard lives at /app; this route opts out of the sidebar shell.
definePageMeta({ layout: false })

useSeoMeta({
  title: 'PrintDesignPro — Thiết kế tem nhãn & phiếu in mã nguồn mở',
  description:
    'Trình thiết kế bản in WYSIWYG mã nguồn mở (MIT): tem vận chuyển, nhãn sản phẩm, '
    + 'mã QR, mã vạch, bảng dữ liệu. Xuất PNG 300 DPI, PDF đúng khổ giấy. '
    + 'Local-first — dữ liệu nằm trong máy bạn.',
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
