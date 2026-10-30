<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deviceApi, type DeviceLastStatusResponse } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import { useLoader } from '@/composables/useLoader'

const headers = [
  { title: 'Serial No', key: 'serialNo' },
  { title: 'Plate No', key: 'plateNo' },
  { title: 'Customer', key: 'customerName' },
  { title: 'GPS Model', key: 'gpsModelName' },
  { title: 'Category', key: 'categoryId' },
  { title: 'Record Time', key: 'recordTime' },
  { title: 'Receive Time', key: 'receiveTime' },
  { title: 'Age (s)', key: 'ageSec' },
  { title: 'Diff MI (s)', key: 'diffMISec' },
  { title: 'Diff Provider (s)', key: 'diffProviderSec' },
  { title: 'Engine', key: 'engineStatus' },
  { title: 'Latitude', key: 'latitude' },
  { title: 'Longitude', key: 'longitude' },
]

const items = ref<DeviceLastStatusResponse[]>([])
const { loading, error, run } = useLoader()

async function load() {
  items.value = (await run(deviceApi.lastStatus)) ?? []
}

// 0 = in sync, + = other system newer (gateway behind), - = other system older
const diffColor = (v: number | null) => (v == null ? undefined : v === 0 ? 'success' : v > 0 ? 'error' : 'warning')

onMounted(load)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" search-text="Refresh" @search="load">
    <template #item.engineStatus="{ value }">
      <v-chip size="small" :color="value ? 'success' : 'grey'">{{ value ? 'ON' : 'OFF' }}</v-chip>
    </template>
    <template #item.diffMISec="{ value }">
      <span :class="diffColor(value) && `text-${diffColor(value)}`">{{ value ?? '-' }}</span>
    </template>
    <template #item.diffProviderSec="{ value }">
      <span :class="diffColor(value) && `text-${diffColor(value)}`">{{ value ?? '-' }}</span>
    </template>
  </DataTablePage>
</template>
