<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { destinationApi, type DestinationSelect } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import { useLoader } from '@/composables/useLoader'

const headers = [
  { title: 'col.tmId', key: 'tmId' },
  { title: 'col.name', key: 'name' },
  { title: 'col.proxyCode', key: 'proxyCode' },
  { title: 'col.type', key: 'tmType' },
  { title: 'col.lastSentAt', key: 'lastsentAt' },
]

const items = ref<DestinationSelect[]>([])
const { loading, error, run } = useLoader()

async function load() {
  items.value = (await run(destinationApi.list)) ?? []
}

onMounted(load)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" :search-text="$t('common.refresh')" @search="load" />
</template>
