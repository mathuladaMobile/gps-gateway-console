<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'Destination', key: 'destination' },
  { title: 'Cron / Interval', key: 'schedule' },
  { title: 'Start', key: 'start' },
  { title: 'End', key: 'end' },
  { title: 'Active', key: 'active' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
