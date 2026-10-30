<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'IMEI', key: 'imei' },
  { title: 'Device Name', key: 'deviceName' },
  { title: 'Proxy', key: 'proxyName' },
  { title: 'Destination', key: 'destination' },
  { title: 'Schedule', key: 'schedule' },
  { title: 'Status', key: 'status' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
