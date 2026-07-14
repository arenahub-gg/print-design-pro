<template>
  <footer class="border-t border-app-border bg-app-panel">
    <!-- final CTA -->
    <div class="mx-auto max-w-[1120px] px-6 py-14 text-center">
      <h2 class="text-2xl font-bold">
        Bắt đầu thiết kế trong 10 giây
      </h2>
      <p class="mt-2 text-sm text-app-text2">
        Không cần cài đặt, không cần tài khoản — mở là dùng.
      </p>
      <NuxtLink
        to="/app"
        class="mt-6 inline-flex h-11 items-center rounded-lg bg-accent-500 px-8 text-sm font-semibold text-white hover:bg-accent-600"
      >
        Mở ứng dụng
      </NuxtLink>
    </div>
    <div class="border-t border-app-border">
      <div class="mx-auto flex max-w-[1120px] flex-wrap items-center gap-4 px-6 py-5 text-[12px] text-app-text3">
        <span class="flex items-center gap-2">
          <span class="flex h-5 w-5 items-center justify-center rounded bg-accent-500 text-[10px] font-bold text-white">P</span>
          PrintDesignPro
        </span>
        <span class="flex-1" />
        <span>Giấy phép MIT</span>
        <a
          href="https://github.com/arenahub-gg/print-design-pro"
          target="_blank"
          rel="noopener"
          class="hover:text-app-text"
        >GitHub</a>
        <a
          href="https://github.com/arenahub-gg/print-design-pro/issues"
          target="_blank"
          rel="noopener"
          class="hover:text-app-text"
        >Báo lỗi / Góp ý</a>
      </div>
    </div>
  </footer>
</template>
