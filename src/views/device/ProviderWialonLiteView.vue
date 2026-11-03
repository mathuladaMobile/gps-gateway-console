<script setup lang="ts">
import { ref } from "vue";
import DataTablePage from "@/components/DataTablePage.vue";

const headers = [
  { title: "col.name", key: "name" },
  { title: "col.host", key: "host" },
  { title: "col.port", key: "port" },
  { title: "col.devices", key: "deviceCount" },
  { title: "col.status", key: "status" },
];

// TODO: load from API
const items = ref<Record<string, unknown>[]>([]);
const loading = ref(false);

const watermarkText = "Next phase";
</script>

<template>
  <div class="watermark-container">
    <div class="watermark" aria-hidden="true">
      <span v-for="n in 40" :key="n" class="watermark__text">
        {{ watermarkText }}
      </span>
    </div>
    <v-alert type="info" class="mb-4">
      This is a placeholder view for Wialon Lite provider. The actual
      implementation will be done in the next phase.
    </v-alert>
    <DataTablePage :headers="headers" :items="items" :loading="loading">
    </DataTablePage>
  </div>
</template>

<style scoped>
.watermark-container {
  position: relative;
  overflow: hidden;
  min-height: 100%;
}

.watermark {
  position: absolute;
  inset: -50%;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 80px 120px;
  transform: rotate(-30deg);
  pointer-events: none;
  user-select: none;
  overflow: hidden;
}

.watermark__text {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
