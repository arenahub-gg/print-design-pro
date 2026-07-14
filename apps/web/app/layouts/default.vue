<script setup lang="ts">
// PrintDesignPro app shell: 220px sidebar with logo, primary new-design CTA,
// nav, and theme toggle. The editor route opts out via layout: false.
const route = useRoute()
const repo = useTemplateRepository()
const { theme, toggle } = useAppTheme()

// '/' is the public landing page; the workspace home lives at /app.
const NAV = [
  { to: '/app', glyph: '⌂', label: 'Trang chủ' },
  { to: '/templates', glyph: '▤', label: 'Thư viện mẫu' },
  { to: '/settings', glyph: '⚙', label: 'Cài đặt' },
]

async function createNew(): Promise<void> {
  const record = await repo.create('Thiết kế mới')
  await navigateTo(`/editor/${record.id}`)
}
</script>

<template>
  <div class="flex h-screen bg-app-bg text-app-text">
    <aside class="flex w-[220px] shrink-0 flex-col gap-1 border-r border-app-border bg-app-panel px-3 py-4">
      <div class="flex items-center gap-2.5 px-2 pb-4 pt-1.5">
        <span class="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-accent-500 text-[15px] font-bold text-white">P</span>
        <span class="text-sm font-bold">PrintDesignPro</span>
      </div>

      <button
        type="button"
        class="mb-3.5 flex h-[38px] items-center justify-center gap-2 rounded-lg bg-accent-500 text-[13px] font-semibold text-white hover:bg-accent-600"
        data-test-new-design
        @click="createNew"
      >
        + Thiết kế mới
      </button>

      <NuxtLink
        v-for="item in NAV"
        :key="item.to"
        :to="item.to"
        class="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium"
        :class="route.path === item.to
          ? 'bg-accent-soft text-accent-500'
          : 'text-app-text2 hover:bg-app-inset'"
      >
        <span class="w-4 text-center font-uimono text-sm">{{ item.glyph }}</span>
        <span>{{ item.label }}</span>
      </NuxtLink>

      <div class="flex-1" />

      <button
        type="button"
        class="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-app-text2 hover:bg-app-inset"
        data-test-theme-toggle
        @click="toggle"
      >
        <span class="w-4 text-center">{{ theme === 'dark' ? '☀' : '☾' }}</span>
        <span>{{ theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối' }}</span>
      </button>
    </aside>

    <main class="min-w-0 flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>
