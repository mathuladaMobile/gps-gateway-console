<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deviceApi, type DevicesResponse } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import SentStatusChip from '@/components/SentStatusChip.vue'
import { useLoader } from '@/composables/useLoader'

const MAX_SERIALS = 10

const headers = [
  { title: 'Serial No', key: 'serialNo' },
  { title: 'Plate No', key: 'plateNo' },
  { title: 'Province', key: 'provinceName' },
  { title: 'GPS Model', key: 'GPSModelName' },
  { title: 'Record Time', key: 'recordTime' },
  { title: 'Proxy', key: 'proxyCode' },
  { title: 'Proxy Record Time', key: 'proxyRecordTime' },
  { title: 'Sent Time', key: 'sentTime' },
  { title: 'Sent Status', key: 'sentStatus' },
  { title: 'Reply', key: 'sentMsgReply' },
]

const devices = ref<DevicesResponse[]>([])
const serials = ref<string[]>([])
const items = ref<Record<string, unknown>[]>([])
const { loading, error, run } = useLoader()

async function load() {
  if (!serials.value.length) {
    error.value = 'Please select at least one device'
    return
  }
  const res = await run(() => deviceApi.transmission(serials.value))
  // One row per device x destination
  items.value = (res?.devices ?? []).flatMap((d) => {
    const base = { ...d, found: d.found }
    if (!d.found || !d.proxy?.length) return [base]
    return d.proxy.map((p) => ({ ...base, ...p, recordTime: d.recordTime, proxyRecordTime: p.recordTime }))
  })
}

onMounted(async () => {
  devices.value = (await run(deviceApi.transmissionInfo))?.devices ?? []
})
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" search-text="Search" @search="load">
    <template #filters>
      <v-col cols="12" md="6">
        <v-autocomplete
          v-model="serials"
          :items="devices"
          :item-title="(d: DevicesResponse) => `${d.serialNo} - ${d.plateNo}`"
          item-value="serialNo"
          label="Devices (max 10)"
          variant="outlined"
          density="compact"
          multiple
          chips
          closable-chips
          hide-details
          :rules="[(v: string[]) => v.length <= MAX_SERIALS || `Max ${MAX_SERIALS} devices`]"
          @update:model-value="serials = serials.slice(0, MAX_SERIALS)"
        />
      </v-col>
    </template>
    <template #item.serialNo="{ item, value }">
      {{ value }}
      <v-chip v-if="!item.found" size="x-small" color="error" class="ml-1">not found</v-chip>
    </template>
    <template #item.sentStatus="{ value }">
      <SentStatusChip :status="value" />
    </template>
  </DataTablePage>
</template>
