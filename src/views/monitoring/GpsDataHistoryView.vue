<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  providerApi,
  type Category,
  type HistoryDevice,
  type ProviderSourceError,
} from "@/api";
import DataTablePage from "@/components/DataTablePage.vue";
import { useI18n } from "vue-i18n";
import DateRangeFields from "@/components/DateRangeFields.vue";
import { useLoader } from "@/composables/useLoader";
import {
  defaultRange,
  headersFrom,
  MAX_RANGE_HOURS,
  rangeHours,
  retentionMin,
  toApiDate,
} from "@/utils/format";

const categories = ref<Category[]>([]);
const sourceErrors = ref<ProviderSourceError[]>([]);
const categoryId = ref<string>();
const device = ref<HistoryDevice>();
const [from, to] = defaultRange(1).map((v) => ref(v));
const items = ref<Record<string, unknown>[]>([]);
const headers = computed(() => headersFrom(items.value));
const { loading, error, run } = useLoader();
const { t } = useI18n();

const valid = computed(
  () =>
    !!categoryId.value &&
    !!device.value &&
    !!from.value &&
    !!to.value &&
    rangeHours(from.value, to.value) <= MAX_RANGE_HOURS,
);

// FEL shows its equipmentType; FEP only has a serial
const deviceTitle = (d: HistoryDevice) =>
  "equipmentType" in d ? `${d.serialNumber} (${d.equipmentType})` : d.serialNumber;

// Each category holds FEL (Lite) and/or FEP (Pro) devices
const devices = computed<HistoryDevice[]>(() => {
  const c = categories.value.find((c) => c.categoryId === categoryId.value);
  return [...(c?.FEL ?? []), ...(c?.FEP ?? [])];
});

async function load() {
  if (!categoryId.value || !device.value) {
    error.value = t("monitoring.selectProviderDevice");
    return;
  }
  if (rangeHours(from.value, to.value) > MAX_RANGE_HOURS) {
    error.value = t("monitoring.rangeTooLong", { hours: MAX_RANGE_HOURS });
    return;
  }
  const res = await run(() =>
    providerApi.history({
      categoryId: categoryId.value!,
      // FEP devices only have a serial
      equipmentType: "equipmentType" in device.value! ? device.value.equipmentType : undefined,
      serialNumber: device.value!.serialNumber,
      start: toApiDate(from.value),
      end: toApiDate(to.value),
    }),
  );
  items.value = res?.items ?? [];
}

onMounted(async () => {
  const res = await run(providerApi.historyInfo);
  categories.value = res?.data ?? [];
  sourceErrors.value = res?.errors ?? [];
});
</script>

<template>
  <DataTablePage
    :headers="headers"
    :items="items"
    :loading="loading"
    :error="error"
    :search-text="$t('common.search')"
    :search-disabled="!valid"
    @search="load"
  >
    <template #filters>
      <v-col cols="12" sm="6" md="3" lg="2">
        <v-select
          v-model="categoryId"
          :items="categories"
          item-title="categoryName"
          item-value="categoryId"
          :label="$t('common.provider')"
          class="required"
          density="compact"
          :hint="!categoryId ? $t('common.required') : undefined"
          :class="{ 'required-empty': !categoryId }"
          persistent-hint
          hide-details="auto"
          @update:model-value="device = undefined"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-autocomplete
          v-model="device"
          :items="devices"
          :item-title="deviceTitle"
          return-object
          :label="$t('common.device')"
          class="required"
          variant="outlined"
          density="compact"
          :hint="!device ? $t('common.required') : undefined"
          :class="{ 'required-empty': !device }"
          persistent-hint
          hide-details="auto"
        />
      </v-col>
      <DateRangeFields
        v-model:from="from"
        v-model:to="to"
        :min="retentionMin('6M')"
        :max="new Date().toISOString()"
        :max-hours="MAX_RANGE_HOURS"
      />
    </template>
    <template #alerts>
      <v-alert
        v-for="e in sourceErrors"
        :key="e.source"
        type="warning"
        variant="tonal"
        density="compact"
        class="mt-2"
      >
        {{ e.source }}: {{ e.message }}
      </v-alert>
    </template>
  </DataTablePage>
</template>
