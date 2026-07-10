<script setup lang="ts">
import { version as editorVersion } from '@pro-print/editor'
</script>

<template>
  <UContainer class="py-24 text-center">
    <h1 class="text-4xl font-bold">
      Pro Print Designer
    </h1>
    <p class="mt-4 text-lg text-muted">
      Open-source visual print designer — labels, receipts, forms.
    </p>
    <p class="mt-2 text-sm text-dimmed">
      Editor library v{{ editorVersion }}
    </p>
    <UButton
      class="mt-8"
      size="lg"
      to="/templates"
    >
      Open Designer
    </UButton>
  </UContainer>
</template>
