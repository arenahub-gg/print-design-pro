<script setup lang="ts">
// PrintDesignPro Settings: theme choice (the only real setting today).
// Printer/units/shop-profile sections from the design arrive with their
// backing features in later rounds.
const { theme, setTheme } = useAppTheme()

const OPTIONS = [
  { value: 'light' as const, label: 'Sáng', swatch: '#f4f6f9' },
  { value: 'dark' as const, label: 'Tối', swatch: '#13161b' },
]
</script>

<template>
  <div class="mx-auto flex max-w-[680px] flex-col gap-5 px-10 py-9">
    <h1 class="text-2xl font-bold">
      Cài đặt
    </h1>

    <section class="rounded-xl border border-app-border bg-app-panel px-6 py-5">
      <h2 class="mb-3.5 text-sm font-semibold">
        Giao diện
      </h2>
      <div class="flex gap-2.5">
        <button
          v-for="option in OPTIONS"
          :key="option.value"
          type="button"
          class="flex-1 cursor-pointer rounded-[10px] border-[1.5px] p-3 text-left"
          :class="theme === option.value ? 'border-accent-500 bg-accent-soft' : 'border-app-border'"
          :data-test-theme="option.value"
          @click="setTheme(option.value)"
        >
          <span
            class="mb-2 block h-11 rounded-md border border-app-border2"
            :style="{ background: option.swatch }"
          />
          <span class="text-[13px] font-semibold">{{ option.label }}</span>
        </button>
      </div>
    </section>

    <p class="text-xs text-app-text3">
      Đơn vị đo, máy in mặc định và hồ sơ cửa hàng sẽ xuất hiện cùng các tính
      năng tương ứng ở các vòng phát triển sau.
    </p>
  </div>
</template>
