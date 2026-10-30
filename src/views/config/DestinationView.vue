<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { destinationApi, type DestinationSelect } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import { useLoader } from '@/composables/useLoader'

const headers = [
  { title: 'tmId', key: 'tmId' },
  { title: 'Name', key: 'name' },
  { title: 'Proxy Code', key: 'proxyCode' },
  { title: 'Type', key: 'tmType' },
  { title: 'Last Sent At', key: 'lastsentAt' },
]

const items = ref<DestinationSelect[]>([])
const { loading, error, run } = useLoader()

async function load() {
  items.value = (await run(destinationApi.list)) ?? []
}

onMounted(load)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" search-text="Refresh" @search="load" />
</template>
