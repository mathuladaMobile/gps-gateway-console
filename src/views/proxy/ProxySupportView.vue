<script setup lang="ts">
import { ref, onMounted } from "vue";
import DataTablePage from "@/components/DataTablePage.vue";
import { destinationApi, type DestinationInfoResponse } from "@/api";
import { useLoader } from "@/composables/useLoader";

const headers = [
  { title: "col.proxyCode", key: "proxyCode" },
  { title: "col.name", key: "name" },
  { title: "col.host", key: "host" },
  { title: "col.port", key: "port" },
  { title: "col.description", key: "description" },
  { title: "col.status", key: "status" },
];

const items = ref<DestinationInfoResponse[]>([]);
const { loading, error, run } = useLoader();

async function load() {
  items.value = (await run(destinationApi.info)) ?? [];
}

onMounted(load);
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" />
</template>
