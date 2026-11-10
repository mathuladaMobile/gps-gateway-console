<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { deviceApi, type DLTHistoryResponse, type ProxyList } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import { useI18n } from 'vue-i18n'
import DateRangeFields from '@/components/DateRangeFields.vue'
import SentStatusChip from '@/components/SentStatusChip.vue'
import { useLoader } from '@/composables/useLoader'
import { defaultRange, MAX_RANGE_HOURS, rangeHours, retentionMin, toApiDate } from '@/utils/format'

const headers = [
  { title: 'col.recordTime', key: 'recordTime' },
  { title: 'col.receiveTime', key: 'receiveTime' },
  { title: 'col.sentTime', key: 'sentTime' },
  { title: 'col.serialNo', key: 'serialNo' },
  { title: 'col.plateNo', key: 'plateNo' },
  { title: 'col.latitude', key: 'lat' },
  { title: 'col.longitude', key: 'lon' },
  { title: 'col.speed', key: 'speed' },
  { title: 'col.course', key: 'course' },
  { title: 'col.engine', key: 'engineStatus' },
  { title: 'col.sats', key: 'numSats' },
  { title: 'col.gsmRssi', key: 'gsmRssi' },
  { title: 'col.driver', key: 'driverId' },
  { title: 'col.sentStatus', key: 'sentStatus' },
]

const devices = ref<ProxyList[]>([])
const mId = ref<number>()
const [from, to] = defaultRange(1).map((v) => ref(v))
const items = ref<DLTHistoryResponse[]>([])
const { loading, error, run } = useLoader()
const { t } = useI18n()

const valid = computed(
  () => mId.value != null && !!from.value && !!to.value && rangeHours(from.value, to.value) <= MAX_RANGE_HOURS,
)

async function load() {
  if (mId.value == null) {
    error.value = t('monitoring.selectDevice')
    return
  }
  if (rangeHours(from.value, to.value) > MAX_RANGE_HOURS) {
    error.value = t('monitoring.rangeTooLong', { hours: MAX_RANGE_HOURS })
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
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" :search-text="$t('common.search')" :search-disabled="!valid" @search="load">
    <template #filters>
      <v-col cols="12" sm="6" md="3">
        <v-autocomplete
          v-model="mId"
          :items="devices"
          :item-title="(d: ProxyList) => `${d.serialNo} - ${d.plateNo}`"
          item-value="mId"
          :label="$t('common.device')"
          class="required"
          variant="outlined"
          density="compact"
          :hint="mId == null ? $t('common.required') : undefined"
          :class="{ 'required-empty': mId == null }"
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
    <template #item.sentStatus="{ value }">
      <SentStatusChip :status="value" />
    </template>
  </DataTablePage>
</template>
