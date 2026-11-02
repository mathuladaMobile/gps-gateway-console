<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'col.name', key: 'name' },
  { title: 'col.host', key: 'host' },
  { title: 'col.port', key: 'port' },
  { title: 'col.devices', key: 'deviceCount' },
  { title: 'col.status', key: 'status' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
