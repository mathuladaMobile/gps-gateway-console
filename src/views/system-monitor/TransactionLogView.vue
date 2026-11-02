<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'col.time', key: 'time' },
  { title: 'col.app', key: 'app' },
  { title: 'col.transactionId', key: 'transactionId' },
  { title: 'col.type', key: 'type' },
  { title: 'col.durationMs', key: 'duration' },
  { title: 'col.result', key: 'result' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
