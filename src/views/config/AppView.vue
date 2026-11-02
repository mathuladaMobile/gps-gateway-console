<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'col.appCode', key: 'code' },
  { title: 'col.appName', key: 'name' },
  { title: 'col.description', key: 'description' },
  { title: 'col.active', key: 'active' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
