<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'col.imei', key: 'imei' },
  { title: 'col.deviceName', key: 'deviceName' },
  { title: 'col.proxy', key: 'proxyName' },
  { title: 'col.destination', key: 'destination' },
  { title: 'col.schedule', key: 'schedule' },
  { title: 'col.status', key: 'status' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
