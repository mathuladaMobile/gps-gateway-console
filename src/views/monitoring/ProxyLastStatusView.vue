<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { destinationApi, deviceApi, type DestinationSelect, type ProxyLastStatus } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import SentStatusChip from '@/components/SentStatusChip.vue'
import { useLoader } from '@/composables/useLoader'

const headers = [
  { title: 'Serial No', key: 'serialNo' },
  { title: 'Plate No', key: 'plateNo' },
  { title: 'GPS Model', key: 'gpsModelName' },
  { title: 'Category', key: 'categoryId' },
  { title: 'Proxy', key: 'proxyCode' },
  { title: 'Record Time', key: 'recordTime' },
  { title: 'Sent Time', key: 'sentTime' },
  { title: 'Sent Status', key: 'sentStatus' },
  { title: 'Reply', key: 'sentMsgReply' },
]

const destinations = ref<DestinationSelect[]>([])
const destination = ref<DestinationSelect>()
const items = ref<ProxyLastStatus[]>([])
const { loading, error, run } = useLoader()

async function load() {
  if (!destination.value) return
  const { proxyCode, tmId } = destination.value
  items.value = (await run(() => deviceApi.proxyLastStatus({ proxycode: proxyCode, tmId }))) ?? []
}

onMounted(async () => {
  destinations.value = (await run(destinationApi.list)) ?? []
})
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" search-text="Search" @search="load">
    <template #filters>
      <v-col cols="12" md="4">
        <v-select
          v-model="destination"
          :items="destinations"
          :item-title="(d: DestinationSelect) => `${d.name} (${d.proxyCode})`"
          return-object
          label="Destination"
          density="compact"
          hide-details
          @update:model-value="load"
        />
      </v-col>
    </template>
    <template #item.sentStatus="{ value }">
      <SentStatusChip :status="value" />
    </template>
  </DataTablePage>
</template>
