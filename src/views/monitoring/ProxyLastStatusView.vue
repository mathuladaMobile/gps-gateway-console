<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  destinationApi,
  deviceApi,
  type DestinationSelect,
  type ProxyLastStatus,
} from "@/api";
import DataTablePage from "@/components/DataTablePage.vue";
import SentStatusChip from "@/components/SentStatusChip.vue";
import { useLoader } from "@/composables/useLoader";

const headers = [
  { title: "col.serialNo", key: "serialNo" },
  { title: "col.plateNo", key: "plateNo" },
  { title: "col.deviceId", key: "deviceId" },
  { title: "col.gpsModel", key: "gpsModelName" },
  { title: "col.category", key: "categoryId" },
  { title: "col.proxy", key: "proxyCode" },
  { title: "col.recordTime", key: "recordTime" },
  { title: "col.sentTime", key: "sentTime" },
  { title: "col.sentStatus", key: "sentStatus" },
  { title: "col.reply", key: "sentMsgReply" },
  { title: "col.mId", key: "mId" },
  { title: "col.tmId", key: "tmId" },
  { title: "col.tlId", key: "tlId" },
  { title: "col.derivedId", key: "derivedId" },
];

const destinations = ref<DestinationSelect[]>([]);
const destination = ref<DestinationSelect>();
const items = ref<ProxyLastStatus[]>([]);
const { loading, error, run } = useLoader();

async function load() {
  if (!destination.value) return;
  const { proxyCode, tmId } = destination.value;
  items.value =
    (await run(() =>
      deviceApi.proxyLastStatus({ proxycode: proxyCode, tmId }),
    )) ?? [];
}

onMounted(async () => {
  destinations.value = (await run(destinationApi.list)) ?? [];
});
</script>

<template>
  <DataTablePage
    :headers="headers"
    :items="items"
    :loading="loading"
    :error="error"
    :search-text="$t('common.find')"
    @search="load"
  >
    <template #filters>
      <v-col cols="12" md="4">
        <v-select
          v-model="destination"
          :items="destinations"
          :item-title="(d: DestinationSelect) => `${d.name} (${d.proxyCode})`"
          return-object
          :label="$t('common.destination')"
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
