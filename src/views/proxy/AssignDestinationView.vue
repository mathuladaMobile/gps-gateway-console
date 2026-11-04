<script setup lang="ts">
import { ref, onMounted } from "vue";
import DataTablePage from "@/components/DataTablePage.vue";
import {
  deviceApi,
  type DeviceMasterResponse,
  type DeviceMasterSaveRequest,
  type DevicesResponse,
} from "@/api";
import { useLoader } from "@/composables/useLoader";

const headers = [
  { title: "col.imei", key: "imei" },
  { title: "col.deviceName", key: "deviceName" },
  { title: "col.proxy", key: "proxyName" },
  { title: "col.destination", key: "destination" },
  { title: "col.schedule", key: "schedule" },
  { title: "col.status", key: "status" },
];

// TODO: load from API
const items = ref<Record<string, unknown>[]>([]);
const { loading, error, run } = useLoader();

async function load() {
  const [m, counts] = await Promise.all([
    run(deviceApi.master),
    deviceApi.masterDestinationCounts().catch(() => null),
  ]);
  console.log("counts", counts);
  console.log("m", m);
}

onMounted(load);
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
