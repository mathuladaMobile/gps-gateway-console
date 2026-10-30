<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deviceApi, type DLTHistoryResponse, type ProxyList } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import DateRangeFields from '@/components/DateRangeFields.vue'
import SentStatusChip from '@/components/SentStatusChip.vue'
import { useLoader } from '@/composables/useLoader'
import { defaultRange, retentionMin, toApiDate } from '@/utils/format'

const headers = [
  { title: 'Record Time', key: 'recordTime' },
  { title: 'Receive Time', key: 'receiveTime' },
  { title: 'Sent Time', key: 'sentTime' },
  { title: 'Serial No', key: 'serialNo' },
  { title: 'Plate No', key: 'plateNo' },
  { title: 'Latitude', key: 'lat' },
  { title: 'Longitude', key: 'lon' },
  { title: 'Speed', key: 'speed' },
  { title: 'Course', key: 'course' },
  { title: 'Engine', key: 'engineStatus' },
  { title: 'Sats', key: 'numSats' },
  { title: 'GSM RSSI', key: 'gsmRssi' },
  { title: 'Driver', key: 'driverId' },
  { title: 'Sent Status', key: 'sentStatus' },
]

const devices = ref<ProxyList[]>([])
const mId = ref<number>()
const [from, to] = defaultRange(1).map((v) => ref(v))
const items = ref<DLTHistoryResponse[]>([])
const { loading, error, run } = useLoader()

async function load() {
  if (mId.value == null) {
    error.value = 'Please select a device'
    return
  }
  const body = { mId: mId.value, start: toApiDate(from.value), end: toApiDate(to.value) }
  items.value = (await run(() => deviceApi.dltHistory(body))) ?? []
}

onMounted(async () => {
  devices.value = (await run(deviceApi.dltHistoryInfo))?.device ?? []
})
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" search-text="Search" @search="load">
    <template #filters>
      <v-col cols="12" md="3">
        <v-autocomplete
          v-model="mId"
          :items="devices"
          :item-title="(d: ProxyList) => `${d.serialNo} - ${d.plateNo}`"
          item-value="mId"
          label="Device"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <DateRangeFields v-model:from="from" v-model:to="to" :min="retentionMin('6M')" />
    </template>
    <template #item.sentStatus="{ value }">
      <SentStatusChip :status="value" />
    </template>
  </DataTablePage>
</template>
