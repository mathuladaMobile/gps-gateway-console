<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { providerApi, type Category, type DeviceFEPro, type ProviderSourceError } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import { useI18n } from 'vue-i18n'
import DateRangeFields from '@/components/DateRangeFields.vue'
import { useLoader } from '@/composables/useLoader'
import { defaultRange, headersFrom, rangeHours, retentionMin, toApiDate } from '@/utils/format'

const MAX_RANGE_HOURS = 24

const categories = ref<Category[]>([])
const sourceErrors = ref<ProviderSourceError[]>([])
const categoryId = ref<string>()
const device = ref<DeviceFEPro>()
const [from, to] = defaultRange(1).map((v) => ref(v))
const items = ref<Record<string, unknown>[]>([])
const headers = computed(() => headersFrom(items.value))
const { loading, error, run } = useLoader()
const { t } = useI18n()

// Each category holds FEL (Lite) and/or FEP (Pro) devices
const devices = computed<DeviceFEPro[]>(() => {
  const c = categories.value.find((c) => c.categoryId === categoryId.value)
  return [...(c?.FEL ?? []), ...(c?.FEP ?? [])]
})

async function load() {
  if (!categoryId.value || !device.value) {
    error.value = t('monitoring.selectProviderDevice')
    return
  }
  if (rangeHours(from.value, to.value) > MAX_RANGE_HOURS) {
    error.value = t('monitoring.rangeTooLong', { hours: MAX_RANGE_HOURS })
    return
  }
  const res = await run(() =>
    providerApi.history({
      categoryId: categoryId.value!,
      equipmentType: device.value!.equipmentType,
      serialNumber: device.value!.serialNumber,
      start: toApiDate(from.value),
      end: toApiDate(to.value),
    }),
  )
  items.value = res?.items ?? []
}

onMounted(async () => {
  const res = await run(providerApi.historyInfo)
  categories.value = res?.data ?? []
  sourceErrors.value = res?.errors ?? []
})
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" :search-text="$t('common.search')" @search="load">
    <template #filters>
      <v-col cols="12" md="2">
        <v-select
          v-model="categoryId"
          :items="categories"
          item-title="categoryName"
          item-value="categoryId"
          :label="$t('common.provider')"
          density="compact"
          hide-details
          @update:model-value="device = undefined"
        />
      </v-col>
      <v-col cols="12" md="3">
        <v-autocomplete
          v-model="device"
          :items="devices"
          :item-title="(d: DeviceFEPro) => `${d.serialNumber} (${d.equipmentType})`"
          return-object
          :label="$t('common.device')"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <DateRangeFields v-model:from="from" v-model:to="to" :min="retentionMin('6M')" />
    </template>
    <template #alerts>
      <div class="text-caption text-medium-emphasis">{{ t('monitoring.maxRange', { hours: MAX_RANGE_HOURS }) }}</div>
      <v-alert v-for="e in sourceErrors" :key="e.source" type="warning" variant="tonal" density="compact" class="mt-2">
        {{ e.source }}: {{ e.message }}
      </v-alert>
    </template>
  </DataTablePage>
</template>
