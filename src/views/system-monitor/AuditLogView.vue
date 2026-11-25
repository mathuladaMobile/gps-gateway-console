<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'col.time', key: 'time' },
  { title: 'col.username', key: 'username' },
  { title: 'col.role', key: 'role' },
  { title: 'col.action', key: 'action' },
  { title: 'col.target', key: 'target' },
  { title: 'col.ipAddress', key: 'ipAddress' },
  { title: 'col.result', key: 'result' },
]

// TODO: load from API (no audit log endpoint yet)
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
