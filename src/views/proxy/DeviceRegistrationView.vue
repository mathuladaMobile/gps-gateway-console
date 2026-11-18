<script setup lang="ts">
import dayjs from "dayjs";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  deviceApi,
  type DeviceRegistrationPage,
  type DeviceRegistrationRow,
} from "@/api";
import { useLoader } from "@/composables/useLoader";
import { usePermission } from "@/composables/usePermission";
import { tr } from "@/i18n";
import { downloadExcel, orDash } from "@/utils/format";
import RegistrationDetailDialog from "./RegistrationDetailDialog.vue";
import {
  ACTION_COLOR,
  fetchAll,
  PAGE_SIZE,
  PAGE_SIZES,
  stamp,
} from "./registration";

type Row = DeviceRegistrationRow;

const headers = [
  { title: "devReg.col.device", key: "serialNo", sortable: false },
  { title: "devReg.col.deviceId", key: "deviceId", sortable: false },
  { title: "col.category", key: "categoryId", sortable: false },
  { title: "col.proxy", key: "proxyCode", sortable: false },
  { title: "regRef", key: "regRef", sortable: false },
  { title: "devReg.col.lastAction", key: "lastAction", sortable: false },
  { title: "devReg.col.registeredAt", key: "registeredAt", sortable: false },
  { title: "col.updatedAt", key: "updatedAt", sortable: false },
  { title: "", key: "view", sortable: false, align: "end" as const },
];

const exportHeaders = [
  { title: "col.serialNo", key: "serialNo" },
  { title: "col.plateNo", key: "plateNo" },
  { title: "col.mId", key: "mId" },
  { title: "col.deviceId", key: "deviceId" },
  { title: "col.imei", key: "imeiNo" },
  { title: "col.category", key: "categoryId" },
  { title: "col.proxy", key: "proxyCode" },
  { title: "regRef", key: "regRef" },
  { title: "devReg.col.lastAction", key: "lastAction" },
  { title: "devReg.col.registeredAt", key: "registeredAt" },
  { title: "devReg.col.registeredBy", key: "registeredBy" },
  { title: "col.updatedAt", key: "updatedAt" },
  { title: "devReg.col.updatedBy", key: "updatedBy" },
  { title: "devReg.payload", key: "payload" },
];

const { t } = useI18n();
const { can, item: menuItem } = usePermission();
const { loading, error, run } = useLoader();

const res = ref<DeviceRegistrationPage>();
const byProxy = ref<{ proxyCode: string; count: number }[]>([]);
const proxyCode = ref<string | null>(null);
const q = ref("");
/** Search text sent with the last load; Export uses the same filters */
const search = ref("");
const page = ref(1);
const pageSize = ref(PAGE_SIZE);

const rows = computed(() => res.value?.items ?? []);
const total = computed(() => res.value?.total ?? 0);
const allCount = computed(() =>
  byProxy.value.reduce((sum, p) => sum + p.count, 0),
);

const query = () => ({
  proxyCode: proxyCode.value ?? undefined,
  search: search.value || undefined,
});

async function load() {
  const r = await run(() =>
    deviceApi.registrations({
      ...query(),
      page: page.value,
      pageSize: pageSize.value,
    }),
  );
  if (!r) return;
  res.value = r;
  // Only page 1 carries the per-proxy counts
  if (r.byProxy) byProxy.value = r.byProxy;
}

/** New filters start again from page 1 */
function apply() {
  search.value = (q.value ?? "").trim();
  page.value = 1;
  load();
}

function pickProxy(code: string | null) {
  proxyCode.value = code;
  apply();
}

onMounted(load);

// Paging by the user (the table also emits on mount with the current values)
function onOptions(o: { page: number; itemsPerPage: number }) {
  if (o.page === page.value && o.itemsPerPage === pageSize.value) return;
  // A new page size starts again from page 1
  page.value = o.itemsPerPage === pageSize.value ? o.page : 1;
  pageSize.value = o.itemsPerPage;
  load();
}

const proxyItems = computed(() => [
  { title: t("devReg.allProxies"), value: null },
  ...byProxy.value.map((p) => ({ title: p.proxyCode, value: p.proxyCode })),
]);

// Detail dialog
const dialog = ref(false);
const selected = ref<Row>();
function openDetail(r: Row) {
  selected.value = r;
  dialog.value = true;
}
const detailFields = computed(() => {
  const r = selected.value;
  if (!r) return [];
  return [
    { label: "mId", value: r.mId, mono: true },
    { label: t("col.plateNo"), value: r.plateNo },
    { label: "deviceID", value: r.deviceId, mono: true },
    { label: "IMEI", value: r.imeiNo, mono: true },
    { label: t("col.category"), value: r.categoryId },
    { label: "regRef", value: r.regRef, mono: true },
    { label: t("devReg.col.lastAction"), value: r.lastAction },
    {
      label: t("devReg.col.registeredAt"),
      value: `${stamp(r.registeredAt)} · ${orDash(r.registeredBy)}`,
    },
    {
      label: t("col.updatedAt"),
      value: `${stamp(r.updatedAt)} · ${orDash(r.updatedBy)}`,
    },
  ];
});
const logLink = computed(() => ({
  name: "proxy-device-registration-log",
  query: {
    mId: String(selected.value?.mId ?? ""),
    proxyCode: selected.value?.proxyCode ?? "",
  },
}));

const exporting = ref(false);

async function exportExcel() {
  exporting.value = true;
  try {
    const f = query();
    const all = await run(() =>
      fetchAll((p, size) =>
        deviceApi.registrations({ ...f, page: p, pageSize: size }),
      ),
    );
    if (!all) return;
    await downloadExcel(
      `${menuItem.value?.name ?? "device-registration"}-${dayjs().format("YYYYMMDD-HHmmss")}.xlsx`,
      exportHeaders.map((h) => ({ ...h, title: tr(h.title) })),
      all.map((r) => ({
        ...r,
        registeredAt: stamp(r.registeredAt),
        updatedAt: stamp(r.updatedAt),
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
      {{ t("devReg.subtitle") }}
      <router-link :to="{ name: 'proxy-device-registration-log' }">
        {{ t("menu.proxy-device-registration-log") }}
      </router-link>
    </p>

    <div class="stats">
      <v-card
        class="stat"
        :class="{ 'stat--active': proxyCode == null }"
        @click="pickProxy(null)"
      >
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis">
            {{ t("devReg.all") }}
          </div>
          <div class="text-h5 font-weight-bold tabular mt-1 text-primary">
            {{ allCount.toLocaleString() }}
          </div>
        </v-card-text>
      </v-card>
      <v-card
        v-for="p in byProxy"
        :key="p.proxyCode"
        class="stat"
        :class="{ 'stat--active': proxyCode === p.proxyCode }"
        @click="pickProxy(p.proxyCode)"
      >
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis">{{ p.proxyCode }}</div>
          <div class="text-h5 font-weight-bold tabular mt-1">
            {{ p.count.toLocaleString() }}
          </div>
        </v-card-text>
      </v-card>
    </div>

    <v-card>
      <v-card-text>
        <v-row dense align="end">
          <v-col cols="12" sm="4" md="3" lg="2">
            <div class="text-body-2 mb-1">{{ t("col.proxy") }}</div>
            <v-select
              :model-value="proxyCode"
              :items="proxyItems"
              density="compact"
              hide-details
              @update:model-value="pickProxy"
            />
          </v-col>
          <v-col cols="12" sm>
            <div class="text-body-2 mb-1">{{ t("common.search") }}</div>
            <v-text-field
              v-model="q"
              :placeholder="t('devReg.searchPlaceholder')"
              density="compact"
              clearable
              hide-details
              @keyup.enter="apply"
              @click:clear="
                q = '';
                apply();
              "
            />
          </v-col>
          <v-col cols="auto">
            <v-btn
              color="primary"
              variant="flat"
              height="40"
              :loading="loading"
              @click="apply"
            >
              {{ t("common.search") }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-text class="d-flex flex-wrap align-center ga-3">
        <div class="text-body-2">
          <b>{{ total.toLocaleString() }}</b>
          {{ t("devReg.devices") }} ·
          {{ proxyCode ?? t("devReg.allProxies") }}
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

      <v-card-text v-if="error" class="pt-0">
        <v-alert type="error" variant="tonal" density="compact">{{
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
        :no-data-text="t('devReg.noData')"
        item-value="mId"
        density="comfortable"
        hover
        @update:options="onOptions"
      >
        <template #item.serialNo="{ item }">
          <div class="font-mono text-no-wrap">{{ item.serialNo }}</div>
          <div class="text-caption text-medium-emphasis text-no-wrap">
            {{ orDash(item.plateNo) }} · mId {{ item.mId }}
          </div>
        </template>
        <template #item.deviceId="{ item }">
          <div class="font-mono text-no-wrap">{{ item.deviceId || "—" }}</div>
          <div class="text-caption text-medium-emphasis font-mono text-no-wrap">
            {{ orDash(item.imeiNo) }}
          </div>
        </template>
        <template #item.categoryId="{ value }">{{ orDash(value) }}</template>
        <template #item.proxyCode="{ value }">
          <span class="font-mono font-weight-bold">{{ value }}</span>
        </template>
        <template #item.regRef="{ value }">
          <div class="font-mono text-caption regref">{{ value || "—" }}</div>
        </template>
        <template #item.lastAction="{ item }">
          <v-chip
            size="small"
            variant="tonal"
            :color="ACTION_COLOR[item.lastAction]"
            class="font-weight-bold"
          >
            {{ item.lastAction }}
          </v-chip>
        </template>
        <template
          v-for="k in ['registeredAt', 'updatedAt'] as const"
          :key="k"
          #[`item.${k}`]="{ item }"
        >
          <div class="text-no-wrap">{{ stamp(item[k]) }}</div>
          <div class="text-caption text-medium-emphasis">
            {{
              orDash(k === "registeredAt" ? item.registeredBy : item.updatedBy)
            }}
          </div>
        </template>
        <template #item.view="{ item }">
          <v-btn
            v-tooltip="t('devReg.view')"
            icon="mdi-eye-outline"
            size="small"
            variant="outlined"
            :aria-label="t('devReg.view')"
            @click="openDetail(item)"
          />
        </template>
      </v-data-table-server>
    </v-card>

    <p class="text-body-2 text-medium-emphasis mb-0">
      {{ t("devReg.footnote") }}
    </p>

    <RegistrationDetailDialog
      v-model="dialog"
      :title="`${selected?.serialNo ?? ''} · ${selected?.proxyCode ?? ''}`"
      :subtitle="t('devReg.detailSub')"
      :fields="detailFields"
      :blocks="[{ label: t('devReg.payload'), value: selected?.payload }]"
    >
      <div>
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-history"
          :to="logLink"
          @click="dialog = false"
        >
          {{ t("devReg.toLog") }}
        </v-btn>
      </div>
    </RegistrationDetailDialog>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
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
.regref {
  max-width: 200px;
  word-break: break-all;
}
</style>
