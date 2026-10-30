<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Host', key: 'host' },
  { title: 'Port', key: 'port' },
  { title: 'Devices', key: 'deviceCount' },
  { title: 'Status', key: 'status' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
