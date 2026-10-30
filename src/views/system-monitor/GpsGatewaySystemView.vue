<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'Instance', key: 'instance' },
  { title: 'Host', key: 'host' },
  { title: 'Connections', key: 'connections' },
  { title: 'Msg/s', key: 'msgPerSec' },
  { title: 'CPU %', key: 'cpu' },
  { title: 'Memory %', key: 'memory' },
  { title: 'Status', key: 'status' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
