<script setup lang="ts">
import dayjs from "dayjs";
import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import {
  deviceApi,
  type DeviceLastStatus,
  type DeviceLastStatusEnvelope,
  type DeviceLastStatusResponse,
} from "@/api";
import { useLoader } from "@/composables/useLoader";
import { usePermission } from "@/composables/usePermission";
import { tr } from "@/i18n";
import { downloadExcel, orDash } from "@/utils/format";
import DeviceLastStatusDrawer from "./DeviceLastStatusDrawer.vue";
import {
  agoText,
  dateOnly,
  diffText,
  secondsSince,
  STATUS_COLOR,
  SWIPE_IN,
  timeOnly,
} from "./lastStatus";

type Row = DeviceLastStatusResponse;
type StatusFilter = "ALL" | DeviceLastStatus | "MISMATCH";

const PAGE_SIZE = 50;
const REFRESH_SEC = 60;
// Used until the first response arrives
const DEFAULT_ONLINE_MIN = 5;
const DEFAULT_MISMATCH_SEC = 60;

// Several fields share a cell; `key` is what the column sorts by
const headers = [
  { title: "lastStatus.col.device", key: "serialNo" },
  { title: "lastStatus.col.categoryModel", key: "categoryId" },
  { title: "lastStatus.col.recordTime", key: "recordTime" },
  { title: "col.status", key: "status" },
  { title: "col.engine", key: "engineStatus" },
  { title: "lastStatus.col.swipe", key: "swipeTime" },
  { title: "lastStatus.col.diffMI", key: "diffMISec" },
  { title: "lastStatus.col.diffProvider", key: "diffProviderSec" },
  { title: "col.customer", key: "customerName" },
  { title: "", key: "view", sortable: false, align: "end" as const },
];

// Excel keeps one field per column
const exportHeaders = [
  { title: "col.status", key: "status" },
  { title: "col.serialNo", key: "serialNo" },
  { title: "col.plateNo", key: "plateNo" },
  { title: "col.province", key: "provinceName" },
  { title: "col.customer", key: "customerName" },
  { title: "col.category", key: "categoryId" },
  { title: "col.gpsModel", key: "gpsModelName" },
  { title: "col.recordTime", key: "recordTime" },
  { title: "col.receiveTime", key: "receiveTime" },
  { title: "col.ageSec", key: "ageSec" },
  { title: "col.diffMISec", key: "diffMISec" },
  { title: "col.diffProviderSec", key: "diffProviderSec" },
  { title: "col.engine", key: "engineStatus" },
  { title: "col.latitude", key: "latitude" },
  { title: "col.longitude", key: "longitude" },
];

const { t } = useI18n();
const { can, item: menuItem } = usePermission();
const { loading, error, run } = useLoader();

const res = ref<DeviceLastStatusEnvelope>();
const loadedAt = ref("");
const q = ref("");
const category = ref("ALL");
const model = ref<string | null>(null);
const status = ref<StatusFilter>("ALL");
const page = ref(1);

async function load() {
  countdown.value = REFRESH_SEC;
  const r = await run(deviceApi.lastStatus);
  if (!r) return;
  res.value = r;
  loadedMs.value = Date.now();
  loadedAt.value = dayjs(loadedMs.value).format("HH:mm:ss");
}

// Auto refresh: tick every second, reload when the countdown hits 0.
// Paused while a load is running, the browser tab is hidden or this page's
// tab is in the background (the page is kept alive).
const autoRefresh = ref(true);
const countdown = ref(REFRESH_SEC);
const active = ref(true);
/** Ticks every second so the "x ago" texts stay fresh between loads */
const now = ref(Date.now());
const loadedMs = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  load();
  timer = setInterval(() => {
    if (!active.value || document.hidden) return;
    now.value = Date.now();
    if (!autoRefresh.value || loading.value) return;
    if (--countdown.value <= 0) load();
  }, 1000);
});
onUnmounted(() => clearInterval(timer));
onActivated(() => (active.value = true));
onDeactivated(() => (active.value = false));
watch(autoRefresh, () => (countdown.value = REFRESH_SEC));

// The API's ageSec is as of the load; add the time since then
const ageNow = (r: Row) =>
  (r.ageSec ?? 0) + Math.max(0, (now.value - loadedMs.value) / 1000);

// Detail drawer, kept by serialNo so it follows the row across reloads
const drawer = ref(false);
const selectedSerial = ref<string>();
const selected = computed(() =>
  rows.value.find((r) => r.serialNo === selectedSerial.value),
);
function openDetail(r: Row) {
  selectedSerial.value = r.serialNo;
  drawer.value = true;
}
const onRowClick = (_e: Event, { item }: { item: Row }) => openDetail(item);
const rowProps = ({ item }: { item: Row }) => ({
  class: {
    "row--clickable": true,
    "row--selected": drawer.value && item.serialNo === selectedSerial.value,
  },
});

function swipeCaption(r: Row) {
  const sec = secondsSince(r.swipeTime, now.value);
  const time = timeOnly(r.swipeTime);
  return sec == null ? time : `${time} · ${agoText(sec)}`;
}

const rows = computed(() => res.value?.data ?? []);
const summary = computed(() => res.value?.summary);
const onlineMin = computed(
  () => summary.value?.onlineMinutes ?? DEFAULT_ONLINE_MIN,
);
const mismatchSec = computed(
  () => summary.value?.mismatchSec ?? DEFAULT_MISMATCH_SEC,
);

const off = (v: number | null) => v != null && Math.abs(v) > mismatchSec.value;
const misMI = (r: Row) => off(r.diffMISec);
const misProvider = (r: Row) => off(r.diffProviderSec);
const isMismatch = (r: Row) => misMI(r) || misProvider(r);

const categories = computed(() =>
  [...new Set(rows.value.map((r) => r.categoryId).filter(Boolean))].sort(),
);
// Models offered for the chosen category only
const models = computed(() =>
  [
    ...new Set(
      rows.value
        .filter(
          (r) => category.value === "ALL" || r.categoryId === category.value,
        )
        .map((r) => r.gpsModelName)
        .filter(Boolean),
    ),
  ].sort(),
);
watch(models, (list) => {
  if (model.value && !list.includes(model.value)) model.value = null;
});

const query = computed(() => (q.value ?? "").trim().toLowerCase());
const filtered = computed(
  () => !!query.value || category.value !== "ALL" || !!model.value,
);

// Rows matching search / category / model; the stat cards count these
const base = computed(() =>
  rows.value.filter(
    (r) =>
      (category.value === "ALL" || r.categoryId === category.value) &&
      (!model.value || r.gpsModelName === model.value) &&
      (!query.value ||
        [r.serialNo, r.plateNo, r.customerName].some((v) =>
          v?.toLowerCase().includes(query.value),
        )),
  ),
);

const shown = computed(() =>
  base.value.filter((r) =>
    status.value === "ALL"
      ? true
      : status.value === "MISMATCH"
        ? isMismatch(r)
        : r.status === status.value,
  ),
);
watch([q, category, model, status], () => (page.value = 1));

// Counts come from the API summary; with filters they are counted here
const counts = computed(() => {
  const s = summary.value;
  const list = base.value;
  const by = (st: DeviceLastStatus) =>
    list.filter((r) => r.status === st).length;
  const useApi = s && !filtered.value;
  return {
    total: useApi ? s.total : list.length,
    online: useApi ? s.online : by("ONLINE"),
    offline: useApi ? s.offline : by("OFFLINE"),
    never: useApi ? s.never : by("NEVER"),
    mismatchMI: useApi ? s.mismatchMI : list.filter(misMI).length,
    mismatchProvider: useApi
      ? s.mismatchProvider
      : list.filter(misProvider).length,
    // The summary has no union of the two, so it is always counted here
    mismatch: list.filter(isMismatch).length,
  };
});

const stats = computed(() => {
  const c = counts.value;
  const min = onlineMin.value;
  return [
    {
      key: "ALL",
      label: t("lastStatus.stat.total"),
      value: c.total,
      sub: t("lastStatus.stat.totalSub"),
    },
    {
      key: "ONLINE",
      label: t("lastStatus.stat.online"),
      value: c.online,
      sub: t("lastStatus.stat.onlineSub", { min }),
      color: "success",
    },
    {
      key: "OFFLINE",
      label: t("lastStatus.stat.offline"),
      value: c.offline,
      sub: t("lastStatus.stat.offlineSub", { min }),
      color: "error",
    },
    {
      key: "NEVER",
      label: t("lastStatus.stat.never"),
      value: c.never,
      sub: t("lastStatus.stat.neverSub"),
    },
    {
      key: "MISMATCH",
      label: t("lastStatus.stat.mismatch"),
      value: c.mismatch,
      sub: t("lastStatus.stat.mismatchSub", {
        mi: c.mismatchMI,
        provider: c.mismatchProvider,
        sec: mismatchSec.value,
      }),
      color: c.mismatch ? "warning" : undefined,
    },
  ] as {
    key: StatusFilter;
    label: string;
    value: number;
    sub: string;
    color?: string;
  }[];
});

const refInfo = computed(() => {
  const r = res.value?.ref;
  if (!r?.at) return "";
  const at = dayjs(r.at);
  return t("lastStatus.infoRef", {
    at: at.isValid() ? at.format("HH:mm:ss") : r.at,
    ttl: r.ttlSec,
  });
});

const partialSources = computed(() =>
  (res.value?.errors ?? [])
    .map((e) => (e.message ? `${e.source} (${e.message})` : e.source))
    .join(", "),
);

// + = gateway behind (error), - = other system older (warning)
const diffColor = (v: number) => (v > 0 ? "error" : "warning");
const diffClass = (v: number | null) =>
  v == null ? "text-medium-emphasis" : v === 0 ? "text-success" : undefined;

const exporting = ref(false);

async function exportExcel() {
  const stamp = dayjs().format("YYYYMMDD-HHmmss");
  exporting.value = true;
  try {
    await downloadExcel(
      `${menuItem.value?.name ?? "device-last-status"}-${stamp}.xlsx`,
      exportHeaders.map((h) => ({ ...h, title: tr(h.title) })),
      shown.value.map((r) => ({
        ...r,
        status: t(`lastStatus.status.${r.status}`),
      })),
    );
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <p class="text-medium-emphasis mb-0">
      {{ t("lastStatus.subtitle", { min: onlineMin }) }}
    </p>

    <div class="stats">
      <v-card
        v-for="s in stats"
        :key="s.key"
        class="stat"
        :class="{ 'stat--active': status === s.key }"
        @click="status = s.key"
      >
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis">{{ s.label }}</div>
          <div
            class="text-h4 font-weight-bold tabular my-2"
            :class="s.color && `text-${s.color}`"
          >
            {{ s.value.toLocaleString() }}
          </div>
          <div class="text-caption text-medium-emphasis">{{ s.sub }}</div>
        </v-card-text>
      </v-card>
    </div>

    <v-card>
      <v-card-text>
        <v-row dense align="end">
          <v-col cols="12" md="5">
            <div class="text-body-2 mb-1">{{ t("lastStatus.search") }}</div>
            <v-text-field
              v-model="q"
              :placeholder="t('lastStatus.searchPlaceholder')"
              prepend-inner-icon="mdi-magnify"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" sm="auto">
            <div class="text-body-2 mb-1">{{ t("lastStatus.category") }}</div>
            <v-btn-toggle
              v-model="category"
              mandatory
              density="compact"
              variant="outlined"
              divided
              color="primary"
            >
              <v-btn value="ALL">{{ t("lastStatus.allCategories") }}</v-btn>
              <v-btn v-for="c in categories" :key="c" :value="c">{{ c }}</v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col cols="12" sm>
            <div class="text-body-2 mb-1">{{ t("lastStatus.gpsModel") }}</div>
            <v-select
              v-model="model"
              :items="[
                { title: t('lastStatus.allModels'), value: null },
                ...models.map((m) => ({ title: m, value: m })),
              ]"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="auto" class="d-flex align-center ga-3">
            <v-btn
              variant="outlined"
              height="40"
              prepend-icon="mdi-refresh"
              :loading="loading"
              @click="load"
            >
              {{ t("lastStatus.reload") }}
            </v-btn>
            {{ t("lastStatus.autoRefreshIn", { sec: countdown }) }}
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-text class="d-flex flex-wrap align-center ga-3">
        <div class="text-body-2">
          <i18n-t keypath="lastStatus.info" scope="global">
            <template #shown
              ><b>{{ shown.length.toLocaleString() }}</b></template
            >
            <template #total>{{ counts.total.toLocaleString() }}</template>
            <template #loadedAt>{{ loadedAt || "-" }}</template>
          </i18n-t>
          <span v-if="refInfo" class="text-medium-emphasis">
            · {{ refInfo }}</span
          >
        </div>
        <v-spacer />
        <v-btn
          v-if="can('export')"
          variant="outlined"
          prepend-icon="mdi-microsoft-excel"
          :disabled="!shown.length"
          :loading="exporting"
          @click="exportExcel"
        >
          {{ t("common.export") }}
        </v-btn>
      </v-card-text>

      <v-card-text
        v-if="error || partialSources"
        class="pt-0 d-flex flex-column ga-2"
      >
        <v-alert v-if="error" type="error" variant="tonal" density="compact">{{
          error
        }}</v-alert>
        <v-alert
          v-if="partialSources"
          type="warning"
          variant="tonal"
          density="compact"
        >
          {{ t("lastStatus.partial", { sources: partialSources }) }}
        </v-alert>
      </v-card-text>

      <v-data-table
        v-model:page="page"
        :headers="headers.map((h) => ({ ...h, title: tr(h.title) }))"
        :items="shown"
        :items-per-page="PAGE_SIZE"
        :loading="loading"
        :no-data-text="t('lastStatus.noData')"
        :row-props="rowProps"
        density="comfortable"
        hover
        @click:row="onRowClick"
      >
        <template #item.serialNo="{ item }">
          <div class="font-mono text-no-wrap">{{ item.serialNo }}</div>
          <div class="text-caption text-medium-emphasis text-no-wrap">
            {{ orDash(item.plateNo) }} {{ item.provinceName ?? "" }}
          </div>
        </template>
        <template #item.categoryId="{ item }">
          <v-chip
            v-if="item.categoryId"
            size="x-small"
            variant="tonal"
            color="primary"
            class="font-weight-bold"
          >
            {{ item.categoryId }}
          </v-chip>
          <div class="text-caption text-medium-emphasis">
            {{ orDash(item.gpsModelName) }}
          </div>
        </template>
        <template #item.recordTime="{ value }">
          <template v-if="value">
            <div class="text-no-wrap">{{ dateOnly(value) }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ timeOnly(value) }}
            </div>
          </template>
          <span v-else class="text-medium-emphasis">—</span>
        </template>
        <template #item.status="{ item }">
          <v-chip
            size="small"
            variant="tonal"
            :color="STATUS_COLOR[item.status]"
          >
            {{ t(`lastStatus.status.${item.status}`) }}
          </v-chip>
          <div
            v-if="item.status !== 'NEVER'"
            class="text-caption text-medium-emphasis text-no-wrap"
          >
            {{ agoText(ageNow(item)) }}
          </div>
        </template>
        <template #item.engineStatus="{ item }">
          <v-chip
            v-if="item.status !== 'NEVER'"
            size="small"
            variant="tonal"
            :color="item.engineStatus ? 'success' : undefined"
          >
            {{
              t(item.engineStatus ? "lastStatus.engine.on" : "lastStatus.engine.off")
            }}
          </v-chip>
          <span v-else class="text-medium-emphasis">—</span>
        </template>
        <template #item.swipeTime="{ item }">
          <template v-if="item.swipeTime">
            <v-chip
              size="small"
              variant="tonal"
              :color="item.swipeType === SWIPE_IN ? 'success' : 'warning'"
            >
              {{
                t(
                  item.swipeType === SWIPE_IN
                    ? "lastStatus.swipe.in"
                    : "lastStatus.swipe.out",
                )
              }}
            </v-chip>
            <div class="text-caption text-medium-emphasis text-no-wrap">
              {{ swipeCaption(item) }}
            </div>
          </template>
          <span v-else class="text-body-2 text-disabled">
            {{ t("lastStatus.swipe.none") }}
          </span>
        </template>
        <template
          v-for="k in ['diffMISec', 'diffProviderSec'] as const"
          :key="k"
          #[`item.${k}`]="{ value }"
        >
          <v-chip
            v-if="off(value)"
            size="small"
            variant="tonal"
            :color="diffColor(value)"
            class="font-mono font-weight-bold"
          >
            {{ diffText(value) }}
          </v-chip>
          <span
            v-else
            class="font-mono text-no-wrap"
            :class="diffClass(value)"
          >
            {{ diffText(value) }}
          </span>
        </template>
        <template #item.customerName="{ value }">
          <div class="customer">{{ orDash(value) }}</div>
        </template>
        <template #item.view="{ item }">
          <v-btn size="small" variant="outlined" @click.stop="openDetail(item)">
            {{ t("lastStatus.view") }}
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <p class="text-body-2 text-medium-emphasis mb-0">
      {{ t("lastStatus.footnote", { sec: mismatchSec }) }}
    </p>

    <DeviceLastStatusDrawer
      v-model="drawer"
      :device="selected"
      :stale-sec="mismatchSec"
      :now="now"
      :loaded-at="loadedAt"
    />
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}
.stat {
  border: 2px solid transparent;
}
.stat--active {
  border-color: rgb(var(--v-theme-primary));
}
.tabular {
  font-variant-numeric: tabular-nums;
}
.customer {
  min-width: 120px;
  max-width: 180px;
}
:deep(.row--selected) {
  background: rgba(var(--v-theme-primary), 0.08);
}
:deep(.row--clickable) {
  cursor: pointer;
}
</style>
