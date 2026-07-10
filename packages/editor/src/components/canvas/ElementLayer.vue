<script setup lang="ts">
import { useDocumentStore } from '../../stores/document-store'
import ElementRenderer from './ElementRenderer.vue'

// Paint order = array order (no zIndex field by design), so plain v-for
// renders back-to-front correctly.
const doc = useDocumentStore()
</script>

<template>
  <div class="pp:absolute pp:inset-0">
    <ElementRenderer
      v-for="element in doc.elements"
      :key="element.id"
      :element="element"
    />
  </div>
</template>
