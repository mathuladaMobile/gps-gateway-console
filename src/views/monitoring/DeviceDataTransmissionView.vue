<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { deviceApi, type DevicesResponse } from "@/api";
import DataTablePage from "@/components/DataTablePage.vue";
import { useI18n } from "vue-i18n";
import SentStatusChip from "@/components/SentStatusChip.vue";
import { useLoader } from "@/composables/useLoader";

const MAX_SERIALS = 10;

const headers = [
  { title: "col.serialNo", key: "serialNo" },
  { title: "col.plateNo", key: "plateNo" },
  { title: "col.province", key: "provinceName" },
  { title: "col.gpsModel", key: "GPSModelName" },
  { title: "col.recordTime", key: "recordTime" },
  { title: "col.proxy", key: "proxyCode" },
  { title: "col.proxyRecordTime", key: "proxyRecordTime" },
  { title: "col.sentTime", key: "sentTime" },
  { title: "col.sentStatus", key: "sentStatus" },
  { title: "col.reply", key: "sentMsgReply" },
];

const devices = ref<DevicesResponse[]>([]);
const serials = ref<string[]>([]);
const items = ref<Record<string, unknown>[]>([]);
const { loading, error, run } = useLoader();
const { t } = useI18n();

// Same rule as the device field: 1 to MAX_SERIALS devices
const valid = computed(
  () => serials.value.length > 0 && serials.value.length <= MAX_SERIALS,
);

async function load() {
  if (!serials.value.length) {
    error.value = t("monitoring.selectDevices");
    return;
  }
  const res = await run(() => deviceApi.transmission(serials.value));
  // One row per device x destination
  items.value = (res?.devices ?? []).flatMap((d) => {
    const base = { ...d, found: d.found };
    if (!d.found || !d.proxy?.length) return [base];
    return d.proxy.map((p) => ({
      ...base,
      ...p,
      recordTime: d.recordTime,
      proxyRecordTime: p.recordTime,
    }));
  });
}

onMounted(async () => {
  devices.value = (await run(deviceApi.transmissionInfo))?.devices ?? [];
});
</script>

<template>
  <DataTablePage
    :headers="headers"
    :items="items"
    :loading="loading"
    :error="error"
    :search-text="$t('common.find')"
    :search-disabled="!valid"
    @search="load"
  >
    <template #filters>
      <v-col cols="12" md="8" lg="6">
        <v-autocomplete
          v-model="serials"
          :items="devices"
          :item-title="(d: DevicesResponse) => `${d.serialNo} - ${d.plateNo}`"
          item-value="serialNo"
          :label="t('monitoring.devicesMax', { max: MAX_SERIALS })"
          class="required"
          variant="outlined"
          density="compact"
          multiple
          chips
          closable-chips
          :hint="!serials.length ? $t('common.required') : undefined"
          :class="{ 'required-empty': !serials.length }"
          persistent-hint
          hide-details="auto"
          :rules="[
            (v: string[]) =>
              v.length <= MAX_SERIALS ||
              t('monitoring.maxDevices', { max: MAX_SERIALS }),
          ]"
          @update:model-value="serials = serials.slice(0, MAX_SERIALS)"
        />
      </v-col>
    </template>
    <template #item.serialNo="{ item, value }">
      {{ value }}
      <v-chip v-if="!item.found" size="x-small" color="error" class="ml-1">{{
        t("common.notFound")
      }}</v-chip>
    </template>
    <template #item.sentStatus="{ value }">
      <SentStatusChip :status="value" />
    </template>
  </DataTablePage>
</template>
