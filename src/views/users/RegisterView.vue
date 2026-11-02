<script setup lang="ts">
import { ref } from 'vue'
import DataTablePage from '@/components/DataTablePage.vue'

const headers = [
  { title: 'col.username', key: 'username' },
  { title: 'col.fullName', key: 'fullName' },
  { title: 'col.email', key: 'email' },
  { title: 'col.role', key: 'role' },
  { title: 'col.status', key: 'status' },
  { title: 'col.createdAt', key: 'createdAt' },
]

// TODO: load from API
const items = ref<Record<string, unknown>[]>([])
const loading = ref(false)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
