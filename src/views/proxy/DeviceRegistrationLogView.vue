<script setup lang="ts">
import dayjs from "dayjs";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import {
  deviceApi,
  type RegisterAction,
  type RegistrationLogInfo,
  type RegistrationLogPage,
  type RegistrationLogQuery,
  type RegistrationLogRow,
  type RegistrationResult,
} from "@/api";
import DateRangeFields from "@/components/DateRangeFields.vue";
import { useLoader } from "@/composables/useLoader";
import { usePermission } from "@/composables/usePermission";
import { tr } from "@/i18n";
import {
  downloadExcel,
  orDash,
  rangeHours,
  retentionMin,
  toApiDate,
  toInputDate,
} from "@/utils/format";
import RegistrationLogDrawer from "./RegistrationLogDrawer.vue";
import {
  ACTION_COLOR,
  datePart,
  fetchAll,
  PAGE_SIZE,
  PAGE_SIZES,
  RESULT_COLOR,
  stamp,
  timePart,
} from "./registration";

type Row = RegistrationLogRow;
type Quick = "today" | "7d" | "31d" | "custom";

const MAX_DAYS = 31;
const MAX_HOURS = MAX_DAYS * 24;
/** Days back (besides today) for each quick range */
const QUICK_DAYS: Record<Exclude<Quick, "custom">, number> = {
  today: 0,
  "7d": 6,
  "31d": MAX_DAYS - 1,
};

const headers = [
  { title: "common.time", key: "createdAt", sortable: false },
  { title: "devReg.col.device", key: "serialNo", sortable: false },
  { title: "col.proxy", key: "proxyCode", sortable: false },
  { title: "Action", key: "action", sortable: false },
  { title: "devRegLog.col.result", key: "result", sortable: false },
  { title: "HTTP", key: "httpStatus", sortable: false },
  { title: "devRegLog.col.message", key: "errorMessage", sortable: false },
  { title: "devRegLog.col.by", key: "createdBy", sortable: false },
  { title: "", key: "view", sortable: false, align: "end" as const },
];

const exportHeaders = [
  { title: "logId", key: "logId" },
  { title: "common.time", key: "createdAt" },
  { title: "col.serialNo", key: "serialNo" },
  { title: "col.plateNo", key: "plateNo" },
  { title: "col.mId", key: "mId" },
  { title: "col.deviceId", key: "deviceId" },
  { title: "col.imei", key: "imeiNo" },
  { title: "col.proxy", key: "proxyCode" },
  { title: "Action", key: "action" },
  { title: "devRegLog.col.result", key: "result" },
  { title: "HTTP", key: "httpStatus" },
  { title: "devRegLog.col.message", key: "errorMessage" },
  { title: "devRegLog.col.by", key: "createdBy" },
  { title: "devReg.payload", key: "payload" },
  { title: "devRegLog.response", key: "response" },
];

const { t } = useI18n();
const { can, item: menuItem } = usePermission();
const { loading, error, run } = useLoader();
const route = useRoute();

const info = ref<RegistrationLogInfo>();
const res = ref<RegistrationLogPage>();

// Filters
const quick = ref<Quick>("7d");
const from = ref("");
const to = ref("");
const mId = ref<number | null>(null);
const proxyCode = ref<string | null>(null);
const action = ref<RegisterAction | "ALL">("ALL");
const result = ref<RegistrationResult | "ALL">("ALL");
const q = ref("");
const page = ref(1);
const pageSize = ref(PAGE_SIZE);
/** Filters of the last search; paging and Export reuse them */
const applied = ref<Omit<RegistrationLogQuery, "page" | "pageSize">>();

// A quick range sets the dates; editing a date by hand switches to "custom"
let quickRange = ["", ""];
function setQuick(v: Quick) {
  quick.value = v;
  if (v === "custom") return;
  quickRange = [
    toInputDate(dayjs().startOf("day").subtract(QUICK_DAYS[v], "day")),
    toInputDate(dayjs()),
  ];
  [from.value, to.value] = quickRange;
}
setQuick("7d");
watch([from, to], ([f, e]) => {
  if (f !== quickRange[0] || e !== quickRange[1]) quick.value = "custom";
});

const devices = computed(() => info.value?.devices ?? []);
const device = computed(() => devices.value.find((d) => d.mId === mId.value));
// With a device chosen, only the proxies it has a log at
const proxies = computed(
  () => device.value?.proxyCodes ?? info.value?.proxies ?? [],
);
watch(proxies, (list) => {
  if (proxyCode.value && list.length && !list.includes(proxyCode.value))
    proxyCode.value = null;
});

const proxyItems = computed(() => [
  { title: t("devReg.allProxies"), value: null },
  ...proxies.value.map((p) => ({ title: p, value: p })),
]);
const deviceItems = computed(() => [
  { title: t("devRegLog.allDevices"), value: null },
  ...devices.value.map((d) => ({
    title: d.plateNo ? `${d.serialNo} · ${d.plateNo}` : d.serialNo,
    value: d.mId,
  })),
]);
const actions = computed<RegisterAction[]>(
  () => info.value?.actions ?? ["ADD", "UPDATE", "REMOVE"],
);
const results = computed<RegistrationResult[]>(
  () => info.value?.results ?? ["SUCCESS", "FAILED"],
);

const tooLong = computed(
  () =>
    !!from.value && !!to.value && rangeHours(from.value, to.value) > MAX_HOURS,
);
const valid = computed(() => !!from.value && !!to.value && !tooLong.value);

async function load() {
  if (!applied.value) return;
  const r = await run(() =>
    deviceApi.registrationLog({
      ...applied.value!,
      page: page.value,
      pageSize: pageSize.value,
    }),
  );
  console.log("load", r);
  if (r) res.value = r;
}

/** Search with the current filters from page 1 (unset filters are left out of the body) */
function search() {
  if (!valid.value) {
    error.value = t("devRegLog.rangeTooLong", { days: MAX_DAYS });
    return;
  }
  applied.value = {
    from: toApiDate(from.value),
    // The picker has minutes only; include the whole last minute (… 23:59:59)
    to: dayjs(to.value).endOf("minute").format("YYYY-MM-DD HH:mm:ss"),
    mId: mId.value ?? undefined,
    proxyCode: proxyCode.value ?? undefined,
    action: action.value === "ALL" ? undefined : action.value,
    result: result.value === "ALL" ? undefined : result.value,
    search: (q.value ?? "").trim() || undefined,
  };
  page.value = 1;
  load();
}

// Paging by the user; nothing is loaded before the first search
function onOptions(o: { page: number; itemsPerPage: number }) {
  if (o.page === page.value && o.itemsPerPage === pageSize.value) return;
  // A new page size starts again from page 1
  page.value = o.itemsPerPage === pageSize.value ? o.page : 1;
  pageSize.value = o.itemsPerPage;
  load();
}

// Filter options have their own loader so they don't clear a search's error / spinner
const infoLoader = useLoader();
onMounted(async () => {
  info.value = await infoLoader.run(deviceApi.registrationLogInfo);
});

// ?mId=&proxyCode= (from DeviceRegistration) selects them and searches the default range.
// Watched, not read once, because the page is kept alive between visits.
watch(
  () => [route.query.mId, route.query.proxyCode],
  ([m, p]) => {
    const id = Number(m);
    if (typeof m !== "string" || !m || !Number.isFinite(id)) return;
    mId.value = id;
    proxyCode.value = typeof p === "string" && p ? p : null;
    action.value = "ALL";
    result.value = "ALL";
    q.value = "";
    setQuick("31d");
    search();
  },
  { immediate: true },
);

const rows = computed(() => res.value?.items ?? []);
const total = computed(() => res.value?.total ?? 0);
// The API has no totals per result, so they are counted on the page shown
const pageCounts = computed(() => {
  if (!rows.value.length) return undefined;
  const failed = rows.value.filter((r) => r.result === "FAILED").length;
  return { success: rows.value.length - failed, failed };
});

// Detail drawer
const drawer = ref(false);
const selected = ref<Row>();
function openDetail(r: Row) {
  selected.value = r;
  drawer.value = true;
}
const rowProps = ({ item }: { item: Row }) => ({
  class: {
    "row--selected": drawer.value && item.logId === selected.value?.logId,
  },
});

const exporting = ref(false);

async function exportExcel() {
  const f = applied.value;
  if (!f) return;
  exporting.value = true;
  try {
    const all = await run(() =>
      fetchAll((p, size) =>
        deviceApi.registrationLog({ ...f, page: p, pageSize: size }),
      ),
    );
    if (!all) return;
    await downloadExcel(
      `${menuItem.value?.name ?? "device-registration-log"}-${dayjs().format("YYYYMMDD-HHmmss")}.xlsx`,
      exportHeaders.map((h) => ({ ...h, title: tr(h.title) })),
      all.map((r) => ({ ...r, createdAt: stamp(r.createdAt) })),
    );
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <p class="text-medium-emphasis mb-0">{{ t("devRegLog.subtitle") }}</p>

    <v-card>
      <v-card-text>
        <v-row dense align="start">
          <DateRangeFields
            v-model:from="from"
            v-model:to="to"
            :min="retentionMin('12M')"
            :max="toInputDate(dayjs().endOf('day'))"
            :max-hours="MAX_HOURS"
          />
          <v-col cols="12" md="auto">
            <v-btn-toggle
              :model-value="quick"
              mandatory
              class="segmented"
              :aria-label="t('devRegLog.quick')"
              @update:model-value="setQuick"
            >
              <v-btn value="today" variant="text">{{
                t("devRegLog.today")
              }}</v-btn>
              <v-btn value="7d" variant="text">{{
                t("devRegLog.days", { n: 7 })
              }}</v-btn>
              <v-btn value="31d" variant="text">{{
                t("devRegLog.days", { n: MAX_DAYS })
              }}</v-btn>
              <v-btn value="custom" variant="text">{{
                t("devRegLog.custom")
              }}</v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>

        <v-row dense align="end" class="mt-1">
          <v-col cols="12" sm="6" md="3">
            <div class="text-body-2 mb-1">{{ t("devReg.col.device") }}</div>
            <v-autocomplete
              v-model="mId"
              :items="deviceItems"
              density="compact"
              variant="outlined"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="6" md="2">
            <div class="text-body-2 mb-1">{{ t("col.proxy") }}</div>
            <v-select
              v-model="proxyCode"
              :items="proxyItems"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="auto">
            <div class="text-body-2 mb-1">Action</div>
            <v-btn-toggle
              v-model="action"
              mandatory
              class="segmented"
              aria-label="Action"
            >
              <v-btn value="ALL" variant="text">{{
                t("master.filter.all")
              }}</v-btn>
              <v-btn v-for="a in actions" :key="a" :value="a" variant="text">{{
                a
              }}</v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col cols="12" sm="auto">
            <div class="text-body-2 mb-1">{{ t("devRegLog.col.result") }}</div>
            <v-btn-toggle
              v-model="result"
              mandatory
              class="segmented"
              :aria-label="t('devRegLog.col.result')"
            >
              <v-btn value="ALL" variant="text">{{
                t("master.filter.all")
              }}</v-btn>
              <v-btn v-for="r in results" :key="r" :value="r" variant="text">{{
                r
              }}</v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>

        <v-row dense align="end" class="mt-1">
          <v-col>
            <div class="text-body-2 mb-1">{{ t("common.search") }}</div>
            <v-text-field
              v-model="q"
              :placeholder="t('devRegLog.searchPlaceholder')"
              density="compact"
              clearable
              hide-details
              @keyup.enter="search"
            />
          </v-col>
          <v-col cols="auto">
            <v-btn
              color="primary"
              variant="flat"
              height="40"
              :loading="loading"
              :disabled="!valid"
              @click="search"
            >
              {{ t("common.search") }}
            </v-btn>
          </v-col>
        </v-row>
        <div v-if="tooLong" class="text-caption text-error mt-2" role="alert">
          {{ t("devRegLog.rangeTooLong", { days: MAX_DAYS }) }}
        </div>
      </v-card-text>
    </v-card>
    <v-card>
      <v-card-text class="d-flex flex-wrap align-center ga-3">
        <div v-if="res" class="text-body-2">
          <b>{{ total.toLocaleString() }}</b>
          {{ t("devRegLog.records") }}
          <span v-if="pageCounts" class="text-medium-emphasis">
            ·
            {{
              t("devRegLog.pageCounts", {
                success: pageCounts.success,
                failed: pageCounts.failed,
              })
            }}
          </span>
        </div>
        <div v-else class="text-body-2 text-medium-emphasis">
          {{ t("devRegLog.notSearched") }}
        </div>
        <v-spacer />
        <v-btn
          v-if="can('export')"
          variant="outlined"
          prepend-icon="mdi-microsoft-excel"
          :disabled="!total"
          :loading="exporting"
          @click="exportExcel"
        >
          {{ t("common.export") }}
        </v-btn>
      </v-card-text>

      <v-card-text v-if="error || infoLoader.error.value" class="pt-0">
        <v-alert
          v-if="infoLoader.error.value"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-2"
          >{{
            t("devRegLog.infoError", { error: infoLoader.error.value })
          }}</v-alert
        >
        <v-alert v-if="error" type="error" variant="tonal" density="compact">{{
          error
        }}</v-alert>
      </v-card-text>

      <v-data-table-server
        :page="page"
        :items-per-page="pageSize"
        :items-per-page-options="PAGE_SIZES"
        :headers="headers.map((h) => ({ ...h, title: tr(h.title) }))"
        :items="rows"
        :items-length="total"
        :loading="loading"
        :no-data-text="res ? t('devRegLog.noData') : t('devRegLog.notSearched')"
        item-value="logId"
        :row-props="rowProps"
        density="comfortable"
        hover
        @update:options="onOptions"
      >
        <template #item.createdAt="{ value }">
          <div class="text-no-wrap">{{ datePart(value) || "-" }}</div>
          <div class="text-caption text-medium-emphasis text-no-wrap">
            {{ timePart(value) }}
          </div>
        </template>
        <template #item.serialNo="{ item }">
          <div class="font-mono text-no-wrap">{{ item.serialNo }}</div>
          <div class="text-caption text-medium-emphasis text-no-wrap">
            {{ orDash(item.plateNo) }}
          </div>
        </template>
        <template #item.proxyCode="{ value }">
          <span class="font-mono font-weight-bold">{{ value }}</span>
        </template>
        <template #item.action="{ item }">
          <v-chip
            size="small"
            variant="tonal"
            :color="ACTION_COLOR[item.action]"
            class="font-weight-bold"
          >
            {{ item.action }}
          </v-chip>
        </template>
        <template #item.result="{ item }">
          <v-chip
            size="small"
            variant="tonal"
            :color="RESULT_COLOR[item.result]"
            class="font-weight-bold"
          >
            {{ item.result }}
          </v-chip>
        </template>
        <template #item.httpStatus="{ value }">
          <span class="font-mono">{{ value ?? "-" }}</span>
        </template>
        <template #item.errorMessage="{ item }">
          <div
            class="message text-body-2"
            :class="{ 'text-error': item.result === 'FAILED' }"
          >
            {{ orDash(item.errorMessage) }}
          </div>
        </template>
        <template #item.createdBy="{ value }">{{ orDash(value) }}</template>
        <template #item.view="{ item }">
          <v-btn size="small" variant="outlined" @click="openDetail(item)">
            {{ t("devReg.view") }}
          </v-btn>
        </template>
      </v-data-table-server>
    </v-card>

    <p class="text-body-2 text-medium-emphasis mb-0">
      {{ t("devRegLog.footnote", { days: MAX_DAYS }) }}
    </p>

    <RegistrationLogDrawer v-model="drawer" :row="selected" />
  </div>
</template>

<style scoped>
:deep(.row--selected) {
  background: rgba(var(--v-theme-primary), 0.06);
}
.message {
  min-width: 220px;
  max-width: 420px;
  word-break: break-word;
}

/* Segmented toggle: grey track, selected option as a white pill (same as MasterView) */
.segmented {
  height: auto !important;
  padding: 4px;
  gap: 4px;
  border-radius: 10px;
  background: rgb(var(--v-theme-surface-soft));
}
.segmented .v-btn {
  height: 32px !important;
  border-radius: 8px !important;
  font-weight: 400;
}
.segmented .v-btn--active {
  font-weight: 600;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-input-border));
}
.segmented .v-btn--active :deep(.v-btn__overlay) {
  opacity: 0;
}
</style>
