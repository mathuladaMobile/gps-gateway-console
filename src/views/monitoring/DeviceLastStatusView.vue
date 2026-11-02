<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deviceApi, type DeviceLastStatusResponse } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import { useLoader } from '@/composables/useLoader'

const headers = [
  { title: 'col.serialNo', key: 'serialNo' },
  { title: 'col.plateNo', key: 'plateNo' },
  { title: 'col.customer', key: 'customerName' },
  { title: 'col.gpsModel', key: 'gpsModelName' },
  { title: 'col.category', key: 'categoryId' },
  { title: 'col.recordTime', key: 'recordTime' },
  { title: 'col.receiveTime', key: 'receiveTime' },
  { title: 'col.ageSec', key: 'ageSec' },
  { title: 'col.diffMISec', key: 'diffMISec' },
  { title: 'col.diffProviderSec', key: 'diffProviderSec' },
  { title: 'col.engine', key: 'engineStatus' },
  { title: 'col.latitude', key: 'latitude' },
  { title: 'col.longitude', key: 'longitude' },
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
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" :search-text="$t('common.refresh')" @search="load">
    <template #item.engineStatus="{ value }">
      <v-chip size="small" :color="value ? 'success' : 'grey'">{{ $t(value ? 'common.on' : 'common.off') }}</v-chip>
    </template>
    <template #item.diffMISec="{ value }">
      <span :class="diffColor(value) && `text-${diffColor(value)}`">{{ value ?? '-' }}</span>
    </template>
    <template #item.diffProviderSec="{ value }">
      <span :class="diffColor(value) && `text-${diffColor(value)}`">{{ value ?? '-' }}</span>
    </template>
  </DataTablePage>
</template>
