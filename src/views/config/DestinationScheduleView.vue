<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'col.destination', key: 'destination' },
  { title: 'col.cronInterval', key: 'schedule' },
  { title: 'col.start', key: 'start' },
  { title: 'col.end', key: 'end' },
  { title: 'col.active', key: 'active' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
