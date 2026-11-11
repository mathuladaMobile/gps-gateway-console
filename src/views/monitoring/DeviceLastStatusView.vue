<script setup lang="ts">
import dayjs from "dayjs";
import { computed, onMounted, ref, watch } from "vue";
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
import { downloadCsv, formatDateTime, orDash } from "@/utils/format";

type Row = DeviceLastStatusResponse;
type StatusFilter = "ALL" | DeviceLastStatus | "MISMATCH";

const PAGE_SIZE = 50;
// Used until the first response arrives
const DEFAULT_ONLINE_MIN = 5;
const DEFAULT_MISMATCH_SEC = 60;

const headers = [
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

const STATUS_COLOR: Record<DeviceLastStatus, string> = {
  ONLINE: "success",
  OFFLINE: "error",
  NEVER: "grey",
};

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
  const r = await run(deviceApi.lastStatus);
  if (!r) return;
  res.value = r;
  loadedAt.value = dayjs().format("HH:mm:ss");
}
onMounted(load);

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
        .filter((r) => category.value === "ALL" || r.categoryId === category.value)
        .map((r) => r.gpsModelName)
        .filter(Boolean),
    ),
  ].sort(),
);
watch(models, (list) => {
  if (model.value && !list.includes(model.value)) model.value = null;
});

const query = computed(() => (q.value ?? "").trim().toLowerCase());
const filtered = computed(() => !!query.value || category.value !== "ALL" || !!model.value);

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
  const by = (st: DeviceLastStatus) => list.filter((r) => r.status === st).length;
  const useApi = s && !filtered.value;
  return {
    total: useApi ? s.total : list.length,
    online: useApi ? s.online : by("ONLINE"),
    offline: useApi ? s.offline : by("OFFLINE"),
    never: useApi ? s.never : by("NEVER"),
    mismatchMI: useApi ? s.mismatchMI : list.filter(misMI).length,
    mismatchProvider: useApi ? s.mismatchProvider : list.filter(misProvider).length,
    // The summary has no union of the two, so it is always counted here
    mismatch: list.filter(isMismatch).length,
  };
});

const stats = computed(() => {
  const c = counts.value;
  const min = onlineMin.value;
  return [
    { key: "ALL", label: t("lastStatus.stat.total"), value: c.total, sub: t("lastStatus.stat.totalSub") },
    { key: "ONLINE", label: t("lastStatus.stat.online"), value: c.online, sub: t("lastStatus.stat.onlineSub", { min }), color: "success" },
    { key: "OFFLINE", label: t("lastStatus.stat.offline"), value: c.offline, sub: t("lastStatus.stat.offlineSub", { min }), color: "error" },
    { key: "NEVER", label: t("lastStatus.stat.never"), value: c.never, sub: t("lastStatus.stat.neverSub") },
    {
      key: "MISMATCH",
      label: t("lastStatus.stat.mismatch"),
      value: c.mismatch,
      sub: t("lastStatus.stat.mismatchSub", { mi: c.mismatchMI, provider: c.mismatchProvider, sec: mismatchSec.value }),
      color: c.mismatch ? "warning" : undefined,
    },
  ] as { key: StatusFilter; label: string; value: number; sub: string; color?: string }[];
});

const refInfo = computed(() => {
  const r = res.value?.ref;
  if (!r?.at) return "";
  const at = dayjs(r.at);
  return t("lastStatus.infoRef", { at: at.isValid() ? at.format("HH:mm:ss") : r.at, ttl: r.ttlSec });
});

const partialSources = computed(() =>
  (res.value?.errors ?? []).map((e) => (e.message ? `${e.source} (${e.message})` : e.source)).join(", "),
);

const pageCount = computed(() => Math.max(1, Math.ceil(shown.value.length / PAGE_SIZE)));

function ageText(sec: number | null | undefined) {
  if (sec == null) return "-";
  const n = Math.max(0, sec);
  if (n < 60) return t("lastStatus.unit.sec", { n });
  if (n < 3600) return t("lastStatus.unit.min", { n: Math.floor(n / 60) });
  if (n < 86400) return t("lastStatus.unit.hour", { n: Math.floor(n / 3600) });
  return t("lastStatus.unit.day", { n: Math.floor(n / 86400) });
}

const diffText = (v: number | null) => (v == null ? "-" : v > 0 ? `+${v}` : String(v));
// + = gateway behind, - = other system older
const diffClass = (v: number | null) =>
  v == null ? "text-medium-emphasis" : off(v) ? (v > 0 ? "text-error font-weight-bold" : "text-warning font-weight-bold") : undefined;

function exportCsv() {
  const stamp = dayjs().format("YYYYMMDD-HHmmss");
  downloadCsv(
    `${menuItem.value?.name ?? "device-last-status"}-${stamp}.csv`,
    headers.map((h) => ({ ...h, title: tr(h.title) })),
    shown.value.map((r) => ({ ...r, status: t(`lastStatus.status.${r.status}`) })),
  );
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
          <div class="text-h4 font-weight-bold tabular my-2" :class="s.color && `text-${s.color}`">
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
            <v-btn-toggle v-model="category" mandatory density="compact" variant="outlined" divided color="primary">
              <v-btn value="ALL">{{ t("lastStatus.allCategories") }}</v-btn>
              <v-btn v-for="c in categories" :key="c" :value="c">{{ c }}</v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col cols="12" sm>
            <div class="text-body-2 mb-1">{{ t("lastStatus.gpsModel") }}</div>
            <v-select
              v-model="model"
              :items="[{ title: t('lastStatus.allModels'), value: null }, ...models.map((m) => ({ title: m, value: m }))]"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="auto">
            <v-btn variant="outlined" height="40" prepend-icon="mdi-refresh" :loading="loading" @click="load">
              {{ t("lastStatus.reload") }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-text class="d-flex flex-wrap align-center ga-3">
        <div class="text-body-2">
          <i18n-t keypath="lastStatus.info" scope="global">
            <template #shown><b>{{ shown.length.toLocaleString() }}</b></template>
            <template #total>{{ counts.total.toLocaleString() }}</template>
            <template #loadedAt>{{ loadedAt || "-" }}</template>
          </i18n-t>
          <span v-if="refInfo" class="text-medium-emphasis"> · {{ refInfo }}</span>
        </div>
        <v-spacer />
        <v-btn
          v-if="can('export')"
          variant="outlined"
          prepend-icon="mdi-file-delimited-outline"
          :disabled="!shown.length"
          @click="exportCsv"
        >
          {{ t("lastStatus.exportCsv") }}
        </v-btn>
      </v-card-text>

      <v-card-text v-if="error || partialSources" class="pt-0 d-flex flex-column ga-2">
        <v-alert v-if="error" type="error" variant="tonal" density="compact">{{ error }}</v-alert>
        <v-alert v-if="partialSources" type="warning" variant="tonal" density="compact">
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
        density="comfortable"
        hover
      >
        <template #item.status="{ value }">
          <v-chip size="small" variant="tonal" :color="STATUS_COLOR[value as DeviceLastStatus]">
            {{ t(`lastStatus.status.${value}`) }}
          </v-chip>
        </template>
        <template #item.serialNo="{ value }">
          <span class="font-mono">{{ value }}</span>
        </template>
        <template v-for="k in ['plateNo', 'provinceName', 'customerName', 'categoryId', 'gpsModelName', 'latitude', 'longitude']" :key="k" #[`item.${k}`]="{ value }">
          {{ orDash(value) }}
        </template>
        <template v-for="k in ['recordTime', 'receiveTime']" :key="k" #[`item.${k}`]="{ value }">
          <span class="text-no-wrap">{{ orDash(formatDateTime(value)) }}</span>
        </template>
        <template #item.ageSec="{ item }">
          <span class="text-no-wrap" :class="{ 'text-medium-emphasis': item.status === 'NEVER' }">
            {{ item.status === "NEVER" ? "-" : ageText(item.ageSec) }}
          </span>
        </template>
        <template v-for="k in ['diffMISec', 'diffProviderSec'] as const" :key="k" #[`item.${k}`]="{ value }">
          <span class="tabular" :class="diffClass(value)">{{ diffText(value) }}</span>
        </template>
        <template #item.engineStatus="{ item, value }">
          <v-chip v-if="item.status !== 'NEVER'" size="small" :color="value ? 'success' : 'grey'">
            {{ t(value ? "common.on" : "common.off") }}
          </v-chip>
          <span v-else>-</span>
        </template>

        <template #bottom>
          <v-divider />
          <div class="d-flex flex-wrap align-center ga-3 pa-4">
            <div class="text-body-2 text-medium-emphasis">
              {{ t("lastStatus.page", { page, size: PAGE_SIZE }) }}
            </div>
            <v-spacer />
            <v-pagination v-model="page" :length="pageCount" :total-visible="7" density="comfortable" />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <p class="text-body-2 text-medium-emphasis mb-0">
      {{ t("lastStatus.footnote", { sec: mismatchSec }) }}
    </p>
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
</style>
