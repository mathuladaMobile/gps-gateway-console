<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'col.instance', key: 'instance' },
  { title: 'col.host', key: 'host' },
  { title: 'col.cpu', key: 'cpu' },
  { title: 'col.memory', key: 'memory' },
  { title: 'col.queue', key: 'queue' },
  { title: 'col.uptime', key: 'uptime' },
  { title: 'col.status', key: 'status' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
