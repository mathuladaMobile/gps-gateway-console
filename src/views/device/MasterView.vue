<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  deviceApi,
  providerApi,
  type DeviceFELite,
  type DeviceFEPro,
  type DeviceMasterResponse,
  type DeviceMasterSaveRequest,
  type DevicesResponse,
} from "@/api";
import DataTablePage from "@/components/DataTablePage.vue";
import { useLoader } from "@/composables/useLoader";
import { useNotify } from "@/composables/useNotify";
import { usePermission } from "@/composables/usePermission";

type Status = "active" | "pending" | "deleted";
type Row = DevicesResponse & {
  tmCount?: number;
  statusKey: Status;
  status: string;
};
type AddCheck = { kind: "new" } | { kind: "reopen" | "exists"; row: Row };
type ProviderDevice = DeviceFELite | DeviceFEPro;

// FEP devices (D1DLT_MDL) have no accountID / deviceID
const NO_ACCOUNT_CATEGORY = "FEP";
const isFEL = (d: ProviderDevice): d is DeviceFELite => "accountID" in d;
const TAG_COLOR: Record<AddCheck["kind"], string | undefined> = {
  new: "primary",
  reopen: "warning",
  exists: undefined,
};

const headers = [
  { title: "col.serial", key: "serialNo" },
  { title: "col.category", key: "categoryId" },
  { title: "col.plateNo", key: "plateNo" },
  { title: "col.gpsModel", key: "GPSModelName" },
  { title: "col.destinations", key: "tmCount" },
  { title: "col.status", key: "status" },
];

const STATUS_COLOR: Record<Status, string> = {
  active: "success",
  pending: "warning",
  deleted: "secondary",
};

const assignRoute = { name: "proxy-assign-destination" };

const { t } = useI18n();
const master = ref<DeviceMasterResponse>();
// null while the destination count API is unavailable
const destCounts = ref<Record<number, number> | null>(null);
const filter = ref<"all" | Status>("all");
const { loading, error, run } = useLoader();
const notify = useNotify();
const { can } = usePermission();

const allRows = computed<Row[]>(() =>
  (master.value?.devices ?? []).map((d) => {
    const tmCount = destCounts.value
      ? (destCounts.value[d.mId] ?? 0)
      : undefined;
    const statusKey: Status = d.deleted
      ? "deleted"
      : tmCount === 0
        ? "pending"
        : "active";
    // status holds the label so filtering and Excel export use the shown text
    return {
      ...d,
      tmCount,
      statusKey,
      status: t(`master.status.${statusKey}`),
    };
  }),
);

const matches = (r: Row, f: typeof filter.value) =>
  f === "all" || (f === "active" ? !r.deleted : r.statusKey === f);

const filters = computed(() =>
  (["all", "active", "pending", "deleted"] as const).map((value) => ({
    value,
    label: t(`master.filter.${value}`),
    count: allRows.value.filter((r) => matches(r, value)).length,
    disabled: value === "pending" && !destCounts.value,
  })),
);

const rows = computed(() =>
  allRows.value.filter((r) => matches(r, filter.value)),
);

// The API reports partial failures per section
const sectionErrors = computed(() => {
  const m = master.value;
  if (!m) return [];
  return [
    ["Devices", m.devicesError],
    ["Categories", m.categoriesError],
    ["GPS models", m.gpsModelsError],
    ["Provinces", m.provincesError],
  ].filter(([, e]) => e);
});

async function load() {
  const [m, counts] = await Promise.all([
    run(deviceApi.master),
    deviceApi.masterDestinationCounts().catch(() => null),
  ]);
  master.value = m;
  destCounts.value = counts;
}

// ---- Side panel: Add / Update / Delete ----

const panel = ref<"add" | "update" | "duplicate" | "delete" | "restore" | null>(
  null,
);
const target = ref<Row>();
const saving = ref(false);

// Add: pick a category, then a device from its provider (POST /provider/device)
const addCat = ref("");
const providerDevices = ref<Record<string, ProviderDevice[]>>({});
const providerErrors = ref<Record<string, string>>({});
const providerPending = ref<Record<string, boolean>>({});
const providerQuery = ref("");
const picked = ref<ProviderDevice>();
// Provider lists can be long, so rows are shown a page at a time
const PROVIDER_PAGE = 100;
const providerLimit = ref(PROVIDER_PAGE);
const providerLoading = computed(() => !!providerPending.value[addCat.value]);

watch(providerQuery, () => (providerLimit.value = PROVIDER_PAGE));

const blankForm = (): DeviceMasterSaveRequest => ({
  serialNo: "",
  categoryId: "",
  GPSModelCode: null,
  plateNo: "",
  provinceCode: null,
  accountId: "",
  deviceId: "",
  chassis: "",
});
const form = reactive(blankForm());

function fillForm(d?: DevicesResponse) {
  Object.assign(
    form,
    blankForm(),
    d && {
      serialNo: d.serialNo,
      categoryId: d.categoryId,
      GPSModelCode: d.GPSModelCode,
      plateNo: d.plateNo,
      provinceCode: d.provinceCode,
      accountId: d.accountId,
      deviceId: d.deviceId,
      chassis: d.chassis,
    },
  );
}

const gpsModels = computed(() =>
  (master.value?.gpsModels ?? []).filter(
    (m) => m.categoryId === form.categoryId,
  ),
);
// Required by POST /device/master/upsert: serialNo, categoryId, GPSModelCode, provinceCode
const formValid = computed(
  () =>
    !!form.serialNo.trim() &&
    !!form.categoryId &&
    form.GPSModelCode != null &&
    form.provinceCode != null,
);

const bySerial = computed(
  () => new Map(allRows.value.map((r) => [r.serialNo, r])),
);
const findSerial = (serial: string) => bySerial.value.get(serial);

function openAdd() {
  panel.value = "add";
  target.value = undefined;
  fillForm();
  pickCategory(master.value?.categories[0]?.categoryId ?? "");
  providerDevices.value = {};
  providerErrors.value = {};
  // Each category shows its list as soon as its own request finishes
  for (const { categoryId: id } of master.value?.categories ?? []) {
    providerPending.value[id] = true;
    providerApi
      .devices(id)
      .then((list) => (providerDevices.value[id] = list))
      .catch(
        (e) =>
          (providerErrors.value[id] =
            e instanceof Error ? e.message : String(e)),
      )
      .finally(() => (providerPending.value[id] = false));
  }
}

function pickCategory(id: string) {
  addCat.value = id;
  providerQuery.value = "";
  providerLimit.value = PROVIDER_PAGE;
  picked.value = undefined;
  fillForm();
}

const tagOf = (serial: string): AddCheck["kind"] => {
  const row = findSerial(serial);
  return !row ? "new" : row.deleted ? "reopen" : "exists";
};

const providerRows = computed(() => {
  const q = providerQuery.value.trim().toLowerCase();
  return (providerDevices.value[addCat.value] ?? [])
    .filter((d) => {
      const text = isFEL(d)
        ? `${d.serialNumber} ${d.deviceID} ${d.dltPlateNo}`
        : d.serialNumber;
      return !q || text.toLowerCase().includes(q);
    })
    .map((d) => ({
      device: d,
      tag: tagOf(d.serialNumber),
      sub: isFEL(d)
        ? [`${d.accountID} / ${d.deviceID}`, d.dltPlateNo]
            .filter(Boolean)
            .join(" · ")
        : addCat.value,
    }));
});
const visibleProviderRows = computed(() =>
  providerRows.value.slice(0, providerLimit.value),
);

function pickDevice(d: ProviderDevice) {
  picked.value = d;
  const row = findSerial(d.serialNumber);
  if (row?.deleted) return fillForm(row);
  // New device: prefill what the provider knows
  fillForm();
  Object.assign(form, { serialNo: d.serialNumber, categoryId: addCat.value });
  if (isFEL(d))
    Object.assign(form, {
      accountId: d.accountID,
      deviceId: d.deviceID,
      plateNo: d.dltPlateNo,
      chassis: d.chassisNo,
    });
}

function openRestore(row: Row) {
  panel.value = "restore";
  target.value = row;
  fillForm(row);
}

const showAccountFields = computed(
  () => form.categoryId !== NO_ACCOUNT_CATEGORY,
);

function openUpdate(row: Row) {
  panel.value = "update";
  target.value = row;
  fillForm(row);
}

// Duplicate: copy the vehicle data into a new device; the Serial must be unique so it starts empty
function openDuplicate(row: Row) {
  panel.value = "duplicate";
  target.value = row;
  fillForm(row);
  form.serialNo = "";
}

function openDelete(row: Row) {
  panel.value = "delete";
  target.value = row;
}

function close() {
  panel.value = null;
  target.value = undefined;
}

// The device list from /device/master includes closed devices, so the check runs on it
const addCheck = computed<AddCheck | null>(() => {
  if (!picked.value) return null;
  const row = findSerial(picked.value.serialNumber);
  if (!row) return { kind: "new" };
  return { kind: row.deleted ? "reopen" : "exists", row };
});

const serialChanged = computed(
  () =>
    panel.value === "update" &&
    !!target.value &&
    form.serialNo.trim() !== target.value.serialNo,
);
const serialTaken = computed(
  () =>
    (serialChanged.value || panel.value === "duplicate") &&
    !!findSerial(form.serialNo.trim()),
);

const view = computed(() => {
  const d = target.value;
  const steps: [string, string][] = [];
  const v = {
    title: "",
    sub: "",
    ok: "",
    okDisabled: false,
    danger: false,
    showForm: false,
    formHint: "",
    next: "",
    steps,
  };
  const nextInstall = t("master.next.install");

  if (panel.value === "add") {
    Object.assign(v, {
      title: t("common.add"),
      sub: t("master.add.sub"),
      ok: t("master.add.ok"),
    });
    const c = addCheck.value;
    if (!c || c.kind === "exists") v.okDisabled = true;
    else if (c.kind === "new") {
      Object.assign(v, {
        showForm: true,
        formHint: t("master.form.hintNew"),
        next: nextInstall,
      });
      steps.push([
        t("master.step.add"),
        t("master.step.addDetail", {
          serial: form.serialNo,
          category: addCat.value,
        }),
      ]);
    } else {
      Object.assign(v, {
        showForm: true,
        formHint: t("master.form.hintReopen"),
        next: nextInstall,
        ok: t("master.add.okReopen"),
      });
      steps.push([
        t("master.step.reopen"),
        t("master.step.reopenDetail", { mId: c.row.mId }),
      ]);
    }
  } else if (panel.value === "restore" && d) {
    Object.assign(v, {
      title: t("master.restore.title"),
      sub: t("master.restore.sub", { serial: d.serialNo, mId: d.mId }),
      showForm: true,
      formHint: t("master.form.hintRestore"),
      ok: t("master.add.okReopen"),
      next: t("master.next.restore"),
    });
    steps.push([
      t("master.step.reopen"),
      t("master.step.reopenDetail", { mId: d.mId }),
    ]);
    steps.push([
      t("master.step.destinations"),
      t("master.step.destinationsDetail"),
    ]);
  } else if (panel.value === "update" && d) {
    Object.assign(v, {
      title: t("common.update"),
      sub: `${d.serialNo} · mId ${d.mId}`,
      showForm: true,
      formHint: t("master.form.hintUpdate"),
      ok: t("master.update.ok"),
    });
    if (serialTaken.value) v.okDisabled = true;
    else if (serialChanged.value) {
      steps.push([
        t("master.step.newDevice"),
        t("master.step.newDeviceDetail", {
          serial: form.serialNo.trim(),
          mId: d.mId,
        }),
      ]);
      v.next = t("master.next.swap", { serial: d.serialNo });
      v.ok = t("master.update.okNewDevice");
    } else steps.push([t("master.step.update"), t("master.step.updateDetail")]);
  } else if (panel.value === "duplicate" && d) {
    Object.assign(v, {
      title: t("common.duplicate"),
      sub: t("master.duplicate.sub", { serial: d.serialNo, mId: d.mId }),
      showForm: true,
      formHint: t("master.form.hintDuplicate"),
      ok: t("master.duplicate.ok"),
      next: t("master.next.install"),
    });
    if (!form.serialNo.trim() || serialTaken.value) v.okDisabled = true;
    else
      steps.push([
        t("master.step.add"),
        t("master.step.addDetail", {
          serial: form.serialNo.trim(),
          category: form.categoryId,
        }),
      ]);
  } else if (panel.value === "delete" && d) {
    Object.assign(v, {
      title: t("common.delete"),
      sub: t("master.delete.sub"),
      danger: true,
      ok: t("master.delete.ok"),
    });
    steps.push([t("master.step.delete"), t("master.step.deleteDetail")]);
  }

  if (v.showForm && !formValid.value) v.okDisabled = true;
  return v;
});

async function confirm() {
  const d = target.value;
  const c = addCheck.value;
  const body = {
    ...form,
    serialNo: form.serialNo.trim(),
    plateNo: form.plateNo.trim(),
  };
  saving.value = true;
  try {
    if (panel.value === "add") {
      await (c?.kind === "reopen"
        ? deviceApi.masterReopen(c.row.mId, body)
        : deviceApi.masterCreate(body));
    } else if (panel.value === "restore" && d)
      await deviceApi.masterReopen(d.mId, body);
    else if (panel.value === "update" && d)
      await deviceApi.masterUpdate(d.mId, body);
    else if (panel.value === "duplicate") await deviceApi.masterCreate(body);
    else if (panel.value === "delete" && d) await deviceApi.masterDelete(d.mId);
    notify.success(t("master.success", { action: view.value.title }));
    close();
    await load();
  } catch (e) {
    notify.error(e);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <v-row>
    <v-col cols="12" :lg="panel ? 8 : 12">
      <DataTablePage
        :headers="headers"
        :items="rows"
        :loading="loading"
        :error="error"
        :search-text="t('common.refresh')"
        @search="load"
        @add="openAdd"
        @edit="openUpdate"
        @duplicate="openDuplicate"
        @delete="openDelete"
        :hide-row-actions="(r: Row) => r.deleted"
      >
        <template #actions-extra="{ item }">
          <v-btn
            v-if="item.deleted && can('update')"
            variant="outlined"
            color="primary"
            size="small"
            prepend-icon="mdi-restore"
            @click="openRestore(item)"
          >
            {{ t("master.restore.title") }}
          </v-btn>
        </template>
        <template #filters>
          <v-col cols="auto">
            <v-btn-toggle
              v-model="filter"
              mandatory
              class="segmented"
              :aria-label="t('col.status')"
            >
              <v-btn
                v-for="f in filters"
                :key="f.value"
                :value="f.value"
                :disabled="f.disabled"
                variant="text"
              >
                {{ f.label
                }}<span class="text-medium-emphasis ms-1">{{ f.count }}</span>
              </v-btn>
            </v-btn-toggle>
          </v-col>
        </template>
        <template #alerts>
          <v-alert
            v-for="[name, e] in sectionErrors"
            :key="name"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            {{ name }}: {{ e }}
          </v-alert>
          <v-alert
            v-if="master && !destCounts"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            {{ t("master.noCountApi") }}
          </v-alert>
        </template>

        <template #item.serialNo="{ item }">
          <span class="font-mono">{{ item.serialNo }}</span>
          <div class="text-caption text-medium-emphasis">
            mId {{ item.mId }}
          </div>
        </template>
        <template #item.plateNo="{ item }">
          {{ item.plateNo || "-" }}
          <div class="text-caption text-medium-emphasis">
            {{ item.provinceName }}
          </div>
        </template>
        <template #item.tmCount="{ item }">
          <span
            v-if="item.tmCount === undefined || (item.deleted && !item.tmCount)"
            >-</span
          >
          <router-link v-else-if="item.tmCount" :to="assignRoute">{{
            t("master.destCount", { n: item.tmCount })
          }}</router-link>
          <router-link v-else :to="assignRoute">{{
            t("master.notSet")
          }}</router-link>
        </template>
        <template #item.status="{ item }">
          <v-chip
            size="small"
            variant="tonal"
            :color="STATUS_COLOR[item.statusKey as Status]"
            class="font-weight-bold"
          >
            {{ item.status }}
          </v-chip>
        </template>
      </DataTablePage>
    </v-col>

    <v-col v-if="panel" cols="12" lg="4">
      <v-card :aria-label="view.title">
        <v-card-item>
          <v-card-title>{{ view.title }}</v-card-title>
          <v-card-subtitle>{{ view.sub }}</v-card-subtitle>
          <template #append>
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              :aria-label="t('common.close')"
              @click="close"
            />
          </template>
        </v-card-item>
        <v-divider />

        <v-card-text class="d-flex flex-column ga-4">
          <template v-if="panel === 'add'">
            <!-- 1. Category -->
            <div class="d-flex flex-column ga-2">
              <div class="text-body-2 font-weight-bold">
                <v-avatar size="20" color="primary" class="text-caption me-1"
                  >1</v-avatar
                >
                {{ t("master.add.pickCategory") }}
              </div>
              <div class="cat-grid" role="radiogroup">
                <v-card
                  v-for="c in master?.categories ?? []"
                  :key="c.categoryId"
                  role="radio"
                  :aria-checked="addCat === c.categoryId"
                  variant="outlined"
                  :class="[
                    'cat-card',
                    { 'cat-card--on': addCat === c.categoryId },
                  ]"
                  @click="pickCategory(c.categoryId)"
                >
                  <v-card-text class="pa-2 px-3">
                    <div class="font-mono font-weight-bold">
                      {{ c.categoryId }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ c.categoryName }}
                      <template v-if="providerDevices[c.categoryId]">
                        ·
                        {{
                          t("master.add.deviceCount", {
                            n: providerDevices[c.categoryId].length,
                          })
                        }}
                      </template>
                      <v-progress-circular
                        v-else-if="providerPending[c.categoryId]"
                        indeterminate
                        size="12"
                        width="2"
                        class="ms-1"
                        :aria-label="t('master.add.loading')"
                      />
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </div>

            <!-- 2. Device from the provider -->
            <div class="d-flex flex-column ga-2">
              <div class="text-body-2 font-weight-bold">
                <v-avatar size="20" color="primary" class="text-caption me-1"
                  >2</v-avatar
                >
                {{ t("master.add.pickDevice") }}
              </div>
              <v-text-field
                v-model="providerQuery"
                :placeholder="t('master.add.searchDevice')"
                prepend-inner-icon="mdi-magnify"
                density="compact"
                clearable
                :disabled="providerLoading"
                hide-details
              />
              <v-alert
                v-if="providerErrors[addCat]"
                type="error"
                variant="tonal"
                density="compact"
              >
                {{ providerErrors[addCat] }}
              </v-alert>
              <v-sheet
                border
                rounded="lg"
                class="device-list"
                :aria-busy="providerLoading"
              >
                <template v-if="providerLoading">
                  <v-progress-linear indeterminate color="primary" />
                  <div class="text-caption text-medium-emphasis px-3 pt-2">
                    {{ t("master.add.loading") }}
                  </div>
                  <v-skeleton-loader
                    v-for="i in 4"
                    :key="i"
                    type="list-item-two-line"
                  />
                </template>
                <v-list v-else density="compact" class="py-0" role="listbox">
                  <v-list-item
                    v-for="r in visibleProviderRows"
                    :key="r.device.serialNumber"
                    :active="picked?.serialNumber === r.device.serialNumber"
                    :disabled="r.tag === 'exists'"
                    color="primary"
                    class="border-b"
                    @click="pickDevice(r.device)"
                  >
                    <v-list-item-title class="font-mono">{{
                      r.device.serialNumber
                    }}</v-list-item-title>
                    <v-list-item-subtitle>{{ r.sub }}</v-list-item-subtitle>
                    <template #append>
                      <v-chip
                        size="small"
                        variant="tonal"
                        :color="TAG_COLOR[r.tag]"
                        class="font-weight-bold"
                      >
                        {{ t(`master.add.tag.${r.tag}`) }}
                      </v-chip>
                    </template>
                  </v-list-item>
                  <v-list-item
                    v-if="!providerRows.length"
                    class="text-medium-emphasis"
                  >
                    {{ t("master.add.noDevices") }}
                  </v-list-item>
                  <div
                    v-if="providerRows.length > providerLimit"
                    class="text-center pa-2"
                  >
                    <v-btn
                      variant="text"
                      color="primary"
                      size="small"
                      @click="providerLimit += PROVIDER_PAGE"
                    >
                      {{
                        t("master.add.loadMore", {
                          shown: visibleProviderRows.length,
                          total: providerRows.length,
                        })
                      }}
                    </v-btn>
                  </div>
                </v-list>
              </v-sheet>
              <span class="text-caption text-medium-emphasis">
                {{
                  t("master.add.providerHint", {
                    n: providerDevices[addCat]?.length ?? 0,
                    category: addCat,
                  })
                }}
              </span>
            </div>

            <v-alert
              v-if="addCheck?.kind === 'new'"
              type="info"
              variant="tonal"
              density="compact"
              :title="t('master.checkNew.title')"
            >
              {{ t("master.checkNew.text") }}
            </v-alert>
            <v-alert
              v-else-if="addCheck?.kind === 'reopen'"
              type="warning"
              variant="tonal"
              density="compact"
              :title="t('master.checkReopen.title')"
            >
              {{ t("master.checkReopen.text", { mId: addCheck.row.mId }) }}
            </v-alert>
            <v-alert
              v-else-if="addCheck?.kind === 'exists'"
              type="error"
              variant="tonal"
              density="compact"
              :title="t('master.checkExists.title')"
            >
              {{ t("master.checkExists.text", { mId: addCheck.row.mId }) }}
              <template #append>
                <v-btn
                  size="small"
                  variant="outlined"
                  @click="openUpdate(addCheck.row)"
                  >{{ t("common.update") }}</v-btn
                >
              </template>
            </v-alert>
          </template>

          <template v-if="panel === 'delete' && target">
            <v-sheet border rounded="lg" class="pa-3 bg-surface-soft">
              <div class="font-mono font-weight-medium">
                {{ target.serialNo }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                mId {{ target.mId }} · {{ target.plateNo }}
                {{ target.provinceName }}
              </div>
            </v-sheet>
            <!-- <v-alert
              v-if="target.tmCount"
              type="warning"
              variant="tonal"
              density="compact"
              :title="t('master.delete.blockedTitle', { n: target.tmCount })"
            >
              <i18n-t keypath="master.delete.blockedText" scope="global">
                <template #link>
                  <router-link :to="assignRoute" class="font-weight-bold">{{
                    t("menu.proxy-assign-destination")
                  }}</router-link>
                </template>
              </i18n-t>
            </v-alert>
            <v-alert
              v-else-if="target.tmCount === undefined"
              type="warning"
              variant="tonal"
              density="compact"
            >
              {{ t("master.delete.unknown") }}
            </v-alert>
            <div v-else class="text-body-2">
              {{ t("master.delete.allowed") }}
            </div> -->
          </template>
          <!-- {{ target }} -->

          <template v-if="view.showForm">
            <div>
              <div class="font-weight-bold">{{ t("master.form.title") }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ view.formHint }}
              </div>
            </div>
            <template v-if="panel === 'update' && target">
              <v-text-field
                v-model="form.serialNo"
                :label="t('col.serial')"
                class="font-mono required"
                :color="serialChanged ? 'warning' : undefined"
                :error-messages="
                  serialTaken ? t('master.serialTaken') : undefined
                "
                hide-details="auto"
              />
              <v-alert
                v-if="serialChanged && !serialTaken"
                type="warning"
                variant="tonal"
                density="compact"
                :title="t('master.serialChanged.title')"
              >
                {{
                  t("master.serialChanged.text", { serial: target.serialNo })
                }}
              </v-alert>
            </template>
            <v-text-field
              v-else-if="panel === 'duplicate'"
              v-model="form.serialNo"
              :label="t('master.duplicate.newSerial')"
              class="font-mono required"
              autofocus
              :error-messages="
                serialTaken ? t('master.serialTaken') : undefined
              "
              hide-details="auto"
            />
            <v-row dense>
              <v-col cols="6">
                <v-select
                  v-model="form.categoryId"
                  :items="master?.categories ?? []"
                  item-title="categoryId"
                  item-value="categoryId"
                  :label="t('col.category')"
                  class="required"
                  :disabled="panel === 'add'"
                  hide-details
                  @update:model-value="form.GPSModelCode = null"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="form.GPSModelCode"
                  :items="gpsModels"
                  item-title="gpsModelName"
                  item-value="gpsModelCode"
                  :label="t('col.gpsModel')"
                  class="required"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="form.plateNo"
                  :label="t('master.form.plateNo')"
                  :placeholder="t('master.form.platePlaceholder')"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-autocomplete
                  v-model="form.provinceCode"
                  :items="master?.provinces ?? []"
                  item-title="provinceName"
                  item-value="provinceId"
                  :label="t('master.form.province')"
                  class="required"
                  hide-details
                />
              </v-col>
              <template v-if="showAccountFields">
                <v-col cols="6">
                  <v-text-field
                    v-model="form.accountId"
                    label="accountID"
                    hide-details
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="form.deviceId"
                    label="deviceID"
                    hide-details
                  />
                </v-col>
              </template>
              <v-col cols="12">
                <v-text-field
                  v-model="form.chassis"
                  :label="t('master.form.chassis')"
                  :placeholder="t('master.form.optional')"
                  hide-details
                />
              </v-col>
            </v-row>
          </template>

          <div v-if="view.steps.length">
            <v-divider class="mb-3" />
            <div class="font-weight-bold mb-2">
              {{ t("master.stepsTitle") }}
            </div>
            <ol class="steps">
              <li
                v-for="([title, detail], i) in view.steps"
                :key="i"
                class="d-flex ga-2 align-start text-body-2"
              >
                <v-avatar
                  size="22"
                  color="primary"
                  variant="tonal"
                  class="text-caption font-weight-bold"
                  >{{ i + 1 }}</v-avatar
                >
                <span>
                  <span class="font-weight-bold">{{ title }}</span>
                  <span class="text-medium-emphasis"> {{ detail }}</span>
                </span>
              </li>
            </ol>
          </div>

          <v-sheet
            v-if="view.next"
            border
            rounded="lg"
            class="next-step d-flex ga-2 pa-3 text-body-2"
          >
            <v-icon
              icon="mdi-arrow-right"
              color="primary"
              size="18"
              class="mt-1"
            />
            <span>
              {{ view.next }}
              <router-link :to="assignRoute" class="font-weight-bold">{{
                t("master.goAssign")
              }}</router-link>
            </span>
          </v-sheet>

          <div class="d-flex ga-2">
            <v-btn
              variant="outlined"
              size="large"
              class="flex-1-1"
              @click="close"
              >{{ t("common.cancel") }}</v-btn
            >
            <v-btn
              :color="view.danger ? 'error' : 'primary'"
              variant="flat"
              size="large"
              class="ok-btn"
              :disabled="view.okDisabled"
              :loading="saving"
              @click="confirm"
            >
              {{ view.ok }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
/* Segmented status filter: grey track, selected option as a white pill */
.segmented {
  height: auto !important;
  padding: 4px;
  gap: 4px;
  border-radius: 10px;
  background: rgb(var(--v-theme-surface-soft));
}
.segmented .v-btn {
  height: 36px !important;
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
.steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.cat-card--on {
  border: 2px solid rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}
.device-list {
  max-height: 236px;
  overflow-y: auto;
}
.next-step {
  border-style: dashed !important;
}
.ok-btn {
  flex: 2 1 0;
}
</style>
