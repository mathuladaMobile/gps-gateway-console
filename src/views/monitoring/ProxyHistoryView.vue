<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deviceApi, type DestinationSelect, type DeviceProxyHistoryResponse, type ProxyList } from '@/api'
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
  { title: 'Proxy', key: 'proxyCode' },
  { title: 'Type', key: 'typeLocation' },
  { title: 'Sent Status', key: 'sentStatus' },
  { title: 'Reply', key: 'sentMsgReply' },
]

const destinations = ref<DestinationSelect[]>([])
const devices = ref<ProxyList[]>([])
const tmId = ref<number>()
const mId = ref<number>()
const [from, to] = defaultRange(1).map((v) => ref(v))
const items = ref<DeviceProxyHistoryResponse[]>([])
const { loading, error, run } = useLoader()

async function load() {
  if (tmId.value == null || mId.value == null) {
    error.value = 'Please select destination and device'
    return
  }
  const body = { tmId: tmId.value, mId: mId.value, start: toApiDate(from.value), end: toApiDate(to.value) }
  items.value = (await run(() => deviceApi.proxyHistory(body))) ?? []
}

onMounted(async () => {
  const info = await run(deviceApi.proxyHistoryInfo)
  destinations.value = info?.destination ?? []
  devices.value = info?.device ?? []
})
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" search-text="Search" @search="load">
    <template #filters>
      <v-col cols="12" md="2">
        <v-select
          v-model="tmId"
          :items="destinations"
          :item-title="(d: DestinationSelect) => `${d.name} (${d.proxyCode})`"
          item-value="tmId"
          label="Destination"
          density="compact"
          hide-details
        />
      </v-col>
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
      <DateRangeFields v-model:from="from" v-model:to="to" :min="retentionMin('7D')" />
    </template>
    <template #item.sentStatus="{ value }">
      <SentStatusChip :status="value" />
    </template>
  </DataTablePage>
</template>
