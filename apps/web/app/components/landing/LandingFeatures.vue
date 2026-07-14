<script setup lang="ts">
// Feature grid - every claim here is a shipped capability, not roadmap.
const FEATURES = [
  {
    glyph: '⊞',
    title: 'Editor kéo thả chuẩn mm',
    text: 'Thước, lưới, đường gióng, snap thông minh, xoay và khóa phần tử. Mọi kích thước tính bằng milimet — đúng như tờ giấy in ra.',
  },
  {
    glyph: '⎙',
    title: 'In đúng như thiết kế',
    text: 'Một render engine duy nhất cho màn hình lẫn bản in: xuất PNG 300 DPI, PDF đúng khổ giấy, hoặc in thẳng từ trình duyệt.',
  },
  {
    glyph: '▦',
    title: 'Đủ phần tử cho tem nhãn',
    text: 'Văn bản, hình ảnh, mã QR, mã vạch (CODE128, EAN13…), bảng dữ liệu và 14 loại hình vẽ với nét liền / đứt / chấm, mũi tên.',
  },
  {
    glyph: '⛁',
    title: 'Dữ liệu trong máy bạn',
    text: 'Local-first với IndexedDB: không server, không tài khoản, không gửi thiết kế của bạn đi đâu cả. Xuất / nhập JSON để chia sẻ.',
  },
  {
    glyph: '↺',
    title: 'Hoàn tác mọi thao tác',
    text: 'Command pattern xuyên suốt — undo/redo tin cậy cho từng chỉnh sửa, kể cả đổi khổ giấy, sửa bảng hay đổi màu.',
  },
  {
    glyph: '⬡',
    title: 'Nhúng vào ứng dụng của bạn',
    text: 'Toàn bộ editor là thư viện Vue 3 (@pro-print/editor) với v-model đơn giản — tích hợp vào hệ thống quản lý đơn hàng, kho, POS.',
  },
]
</script>

<template>
  <section
    id="features"
    class="border-t border-app-border bg-app-panel"
  >
    <div class="mx-auto max-w-[1120px] px-6 py-16 lg:py-20">
      <h2 class="text-center text-3xl font-bold">
        Mọi thứ cần cho bản in chuyên nghiệp
      </h2>
      <p class="mx-auto mt-3 max-w-[520px] text-center text-sm text-app-text2">
        Tem vận chuyển, nhãn sản phẩm, phiếu giao hàng, thẻ giá — thiết kế một lần, in chính xác mọi lần.
      </p>
      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="feature in FEATURES"
          :key="feature.title"
          class="rounded-xl border border-app-border bg-app-bg p-6"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft font-uimono text-lg text-accent-500">{{ feature.glyph }}</span>
          <h3 class="mt-4 text-[15px] font-bold">
            {{ feature.title }}
          </h3>
          <p class="mt-2 text-[13px] leading-relaxed text-app-text2">
            {{ feature.text }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
