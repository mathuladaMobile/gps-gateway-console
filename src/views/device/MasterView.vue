<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { deviceApi, type DeviceMasterResponse } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import { useLoader } from '@/composables/useLoader'

const headers = [
  { title: 'mId', key: 'mId' },
  { title: 'Serial No', key: 'serialNo' },
  { title: 'IMEI', key: 'imeiNo' },
  { title: 'Plate No', key: 'plateNo' },
  { title: 'Province', key: 'provinceName' },
  { title: 'Chassis', key: 'chassis' },
  { title: 'GPS Model', key: 'GPSModelName' },
  { title: 'Category', key: 'categoryId' },
  { title: 'Device ID', key: 'deviceId' },
  { title: 'Account ID', key: 'accountId' },
  { title: 'Updated At', key: 'updatedAt' },
]

const master = ref<DeviceMasterResponse>()
const { loading, error, run } = useLoader()

// The API reports partial failures per section
const sectionErrors = computed(() => {
  const m = master.value
  if (!m) return []
  return [
    ['Devices', m.devicesError],
    ['Categories', m.categoriesError],
    ['GPS models', m.gpsModelsError],
    ['Provinces', m.provincesError],
  ].filter(([, e]) => e)
})

async function load() {
  master.value = await run(deviceApi.master)
}

// TODO: no create/update/delete endpoints in the API yet
const notReady = () => alert('Not available yet: API endpoint missing')

onMounted(load)
</script>

<template>
  <DataTablePage
    :headers="headers"
    :items="master?.devices ?? []"
    :loading="loading"
    :error="error"
    search-text="Refresh"
    @search="load"
    @add="notReady"
    @edit="notReady"
    @duplicate="notReady"
    @delete="notReady"
  >
    <template #alerts>
      <v-alert v-for="[name, e] in sectionErrors" :key="name" type="warning" variant="tonal" density="compact" class="mt-2">
        {{ name }}: {{ e }}
      </v-alert>
    </template>
  </DataTablePage>
</template>
