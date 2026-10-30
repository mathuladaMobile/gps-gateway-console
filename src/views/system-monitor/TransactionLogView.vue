<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'Time', key: 'time' },
  { title: 'App', key: 'app' },
  { title: 'Transaction ID', key: 'transactionId' },
  { title: 'Type', key: 'type' },
  { title: 'Duration (ms)', key: 'duration' },
  { title: 'Result', key: 'result' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
