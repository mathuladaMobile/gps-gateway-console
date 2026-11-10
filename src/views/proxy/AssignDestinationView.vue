<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  deviceApi,
  destinationApi,
  type DestinationInfoResponse,
  type DestinationSelect,
  type DeviceMasterResponse,
  type ProxyDestination,
  type DevicesResponse,
} from "@/api";
import { useLoader } from "@/composables/useLoader";
import AssignRegisterDialog, { type RegisterRequest } from "./AssignRegisterDialog.vue";
import AssignDuplicateDialog from "./AssignDuplicateDialog.vue";
import { KIND_COLOR, kindOf, supports, type Dest, type Kind } from "./assign";

const { t } = useI18n();
const route = useRoute();
const { loading, error, run } = useLoader();

const master = ref<DeviceMasterResponse>();
const info = ref<DestinationInfoResponse[]>([]);
const lines = ref<DestinationSelect[]>([]);

async function load() {
  const [m, i, l] = await Promise.all([
    run(deviceApi.master),
    destinationApi.info().catch(() => []),
    destinationApi.list().catch(() => []),
  ]);
  master.value = m;
  info.value = i;
  lines.value = l;
  if (typeof route.query.serial === "string") {
    serialInput.value = route.query.serial;
    search();
  }
}

onMounted(load);

// ---- 1. Device ----

const serialInput = ref<string | null>(null);
const device = ref<DevicesResponse>();
// Closed devices can't be assigned, so they are not offered
const serialOptions = computed(() => (master.value?.devices ?? []).filter((d) => !d.deleted));

// Match serial or plate number
function filterDevice(_value: string, query: string, item?: { raw: DevicesResponse }) {
  const q = query.trim().toUpperCase();
  return !!item && (item.raw.serialNo.toUpperCase().includes(q) || item.raw.plateNo?.toUpperCase().includes(q));
}
const searchError = ref("");
const vehicle = reactive({ plateNo: "", provinceCode: null as number | null, chassis: "" });
const savingVehicle = ref(false);
const vehicleSaved = ref(false);
const vehicleError = ref("");

async function search() {
  const s = serialInput.value?.trim() ?? "";
  device.value = undefined;
  status.value = {};
  statusError.value = message.value = searchError.value = "";
  vehicleSaved.value = false;
  if (!s) return;
  const d = master.value?.devices.find((x) => x.serialNo === s);
  if (!d) return (searchError.value = t("assign.notFound", { serial: s }));
  if (d.deleted) return (searchError.value = t("assign.deleted"));
  searchError.value = "";
  device.value = d;
  Object.assign(vehicle, { plateNo: d.plateNo, provinceCode: d.provinceCode, chassis: d.chassis });
  await loadStatus();
}

async function saveVehicle() {
  const d = device.value!;
  savingVehicle.value = true;
  vehicleError.value = "";
  try {
    await deviceApi.masterUpsert({
      mId: d.mId,
      serialNo: d.serialNo,
      categoryId: d.categoryId,
      GPSModelCode: d.GPSModelCode,
      accountId: d.accountId,
      deviceId: d.deviceId,
      ...vehicle,
    });
    // Keep the device list in step with what was saved
    Object.assign(d, vehicle);
    vehicleSaved.value = true;
  } catch (e) {
    vehicleError.value = e instanceof Error ? e.message : String(e);
  } finally {
    savingVehicle.value = false;
  }
}

// ---- 2. Destinations ----

// The device's state on each proxy, from /device/destination/info/:mId
type Status = Pick<ProxyDestination, "proxyCode" | "sending" | "registered"> & Partial<ProxyDestination>;
const status = ref<Record<string, Status>>({});
const statusError = ref("");
const busy = ref<string | null>(null);
const message = ref("");

async function loadStatus() {
  statusError.value = "";
  try {
    const res = await deviceApi.destinationInfo(device.value!.mId);
    status.value = Object.fromEntries((res.supported ?? []).map((s) => [s.proxyCode, s]));
  } catch (e) {
    statusError.value = e instanceof Error ? e.message : String(e);
  }
}

const dests = computed<Dest[]>(() =>
  info.value.map((p) => ({
    proxyCode: p.proxyCode,
    kind: kindOf(p),
    lines: lines.value.filter((l) => l.proxyCode === p.proxyCode).map((l) => l.tmType || l.name),
    // Prefer the API's answer; fall back to ProxyDeviceType from /destination/info
    models: status.value[p.proxyCode]?.supportedModels ?? (p.models ?? []).map((m) => m.name),
    supported:
      status.value[p.proxyCode]?.supported ?? (!!device.value && supports(p, device.value.GPSModelCode)),
    active: !!status.value[p.proxyCode]?.sending,
    registered: !!status.value[p.proxyCode]?.registered,
  })),
);

// Supported or sending first; proxies that can't take this model go last
const rows = computed(() => {
  const usable = (d: Dest) => d.supported || d.active;
  const list = [...dests.value.filter(usable), ...dests.value.filter((d) => !usable(d))];
  const firstUnusable = list.findIndex((d) => !usable(d));
  return list.map((d, i) => ({ ...d, groupHead: i === firstUnusable }));
});
const active = computed(() => dests.value.filter((d) => d.active));

type Patch = { active?: boolean; registered?: boolean };

// Show the change at once, then reload the real state from the API
function setStatus(proxyCode: string, patch: Patch) {
  const cur: Status = status.value[proxyCode] ?? { proxyCode, sending: false, registered: false };
  status.value = {
    ...status.value,
    [proxyCode]: { ...cur, sending: patch.active ?? cur.sending, registered: patch.registered ?? cur.registered },
  };
  loadStatus();
}

async function act(proxyCode: string, fn: () => Promise<unknown>, patch: Patch, msg: string) {
  busy.value = proxyCode;
  message.value = "";
  try {
    await fn();
    setStatus(proxyCode, patch);
    message.value = msg;
  } catch (e) {
    statusError.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = null;
  }
}

async function toggle(d: Dest) {
  const mId = device.value!.mId;
  const p = d.proxyCode;
  if (!d.active) {
    if (!d.supported) return;
    if (d.kind === "none") {
      return act(p, () => deviceApi.destinationAssign({ mId, proxyCode: p, action: "OPEN" }), { active: true }, t("assign.msg.open", { proxy: p }));
    }
    const action = status.value[p]?.nextAction || (d.registered ? "UPDATE" : "ADD");
    if (await askRegister({ mId, proxyCode: p, action })) {
      setStatus(p, { active: true, registered: true });
      message.value = t("assign.msg.registered", { action, proxy: p });
    }
    return;
  }
  if (d.kind === "api") {
    if (await askRegister({ mId, proxyCode: p, action: "REMOVE" })) {
      setStatus(p, { active: false, registered: false });
      message.value = t("assign.msg.remove", { proxy: p });
    }
  } else if (d.kind === "reg") {
    await act(
      p,
      () => deviceApi.destinationRegister({ mId, proxyCode: p, action: "REMOVE" }),
      { active: false, registered: true },
      t("assign.msg.removeOnly", { proxy: p }),
    );
  } else {
    await act(p, () => deviceApi.destinationAssign({ mId, proxyCode: p, action: "CLOSE" }), { active: false }, t("assign.msg.close", { proxy: p }));
  }
}

async function openUpdate(d: Dest) {
  message.value = "";
  if (await askRegister({ mId: device.value!.mId, proxyCode: d.proxyCode, action: "UPDATE" })) {
    message.value = t("assign.msg.registered", { action: "UPDATE", proxy: d.proxyCode });
  }
}

// ---- Register dialog, awaited by toggles and Duplicate ----

const registerReq = ref<RegisterRequest | null>(null);
let resolveRegister: ((ok: boolean) => void) | null = null;

function askRegister(r: RegisterRequest) {
  registerReq.value = r;
  return new Promise<boolean>((resolve) => (resolveRegister = resolve));
}
function closeRegister(ok: boolean) {
  registerReq.value = null;
  resolveRegister?.(ok);
  resolveRegister = null;
}

// ---- Duplicate ----

const dupOpen = ref(false);

async function onDuplicated(serial: string, moved: number) {
  message.value = t("assign.dup.finished", { serial, n: moved });
  await loadStatus();
}

const modelName = computed(() => device.value?.GPSModelName ?? "");

function linesText(d: Dest) {
  const text = t("assign.lines", { n: d.lines.length, names: d.lines.join(", ") });
  return !d.active && d.registered ? `${text} · ${t("assign.registeredBefore")}` : text;
}

function supportNote(d: Dest) {
  const models = d.models.join(", ") || t("assign.noSupportedModels");
  const prefix = d.active ? t("assign.noLongerSupported", { model: modelName.value }) : "";
  return prefix + t("assign.supportedModels", { models });
}

const KINDS: Kind[] = ["api", "reg", "none"];
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <p class="text-medium-emphasis mb-0">{{ t("assign.subtitle") }}</p>
    <v-alert v-if="error" type="error" variant="tonal" density="compact">{{ error }}</v-alert>

    <!-- 1. Device -->
    <v-card variant="outlined">
      <v-card-text class="d-flex flex-column ga-4">
        <div class="d-flex flex-wrap justify-space-between align-center ga-2">
          <h2 class="text-subtitle-1 font-weight-bold">{{ t("assign.box") }}</h2>
          <v-btn variant="outlined" prepend-icon="mdi-content-copy" :disabled="!active.length" @click="dupOpen = true">
            {{ t("assign.dup.title") }}
          </v-btn>
        </div>

        <v-autocomplete
          v-model="serialInput"
          :items="serialOptions"
          item-title="serialNo"
          item-value="serialNo"
          :custom-filter="filterDevice"
          :label="t('col.serial')"
          class="font-mono"
          density="comfortable"
          prepend-inner-icon="mdi-magnify"
          :error-messages="searchError"
          :loading="loading"
          clearable
          auto-select-first
          @update:model-value="search"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :subtitle="`${item.raw.plateNo} · ${item.raw.GPSModelName}`" />
          </template>
        </v-autocomplete>

        <template v-if="device">
          <div class="info-grid">
            <div><div class="text-caption text-medium-emphasis">mId</div>{{ device.mId }}</div>
            <div><div class="text-caption text-medium-emphasis">{{ t("col.category") }}</div>{{ device.categoryId }}</div>
            <div><div class="text-caption text-medium-emphasis">{{ t("col.gpsModel") }}</div>{{ device.GPSModelName }}</div>
            <div>
              <div class="text-caption text-medium-emphasis">{{ t("assign.sending") }}</div>
              {{ t("master.destCount", { n: active.length }) }}
            </div>
          </div>

          <div class="vehicle-grid">
            <v-text-field v-model="vehicle.plateNo" :label="t('master.form.plateNo')" density="comfortable" hide-details />
            <v-autocomplete
              v-model="vehicle.provinceCode"
              :label="t('master.form.province')"
              :items="master?.provinces ?? []"
              item-title="provinceName"
              item-value="provinceId"
              density="comfortable"
              hide-details
            />
            <v-text-field v-model="vehicle.chassis" :label="t('master.form.chassis')" density="comfortable" hide-details />
          </div>
          <div class="d-flex flex-wrap justify-space-between align-center ga-3">
            <span class="text-body-2 text-medium-emphasis">{{ t("assign.vehicleNote") }}</span>
            <v-btn color="primary" variant="flat" :loading="savingVehicle" @click="saveVehicle">
              {{ t("assign.saveVehicle") }}
            </v-btn>
          </div>
          <v-alert v-if="vehicleSaved" type="success" variant="tonal" density="compact">{{ t("assign.vehicleSaved") }}</v-alert>
          <v-alert v-if="vehicleError" type="error" variant="tonal" density="compact">{{ vehicleError }}</v-alert>
        </template>
      </v-card-text>
    </v-card>

    <!-- 2. Destinations -->
    <v-card v-if="device" variant="outlined">
      <v-card-text class="d-flex flex-column ga-2">
        <div class="d-flex flex-wrap justify-space-between align-baseline ga-2">
          <h2 class="text-subtitle-1 font-weight-bold">{{ t("assign.dest") }}</h2>
          <span class="text-body-2 text-medium-emphasis">
            {{ t("assign.activeOf", { active: active.length, total: dests.length }) }}
          </span>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">{{ t("assign.destHint") }}</p>
        <div class="d-flex flex-wrap ga-1 ga-sm-4 text-caption mb-2">
          <span v-for="k in KINDS" :key="k">
            <v-chip size="x-small" label variant="tonal" :color="KIND_COLOR[k]" class="font-weight-bold me-1">
              {{ t(`assign.kind.${k}`) }}
            </v-chip>
            {{ t(`assign.kindHint.${k}`) }}
          </span>
        </div>

        <v-alert v-if="statusError" type="warning" variant="tonal" density="compact">
          {{ t("assign.statusError", { error: statusError }) }}
        </v-alert>

        <template v-for="d in rows" :key="d.proxyCode">
          <div v-if="d.groupHead" class="group-head text-body-2 font-weight-bold text-medium-emphasis">
            {{ t("assign.unsupportedHead", { model: modelName }) }}
          </div>
          <div :class="['dest-row', { 'dest-row--on': d.active, 'dest-row--off': !d.supported && !d.active }]">
            <v-checkbox
              :model-value="d.active"
              :disabled="(!d.supported && !d.active) || busy === d.proxyCode"
              color="primary"
              hide-details
              density="comfortable"
              class="flex-1-1"
              @update:model-value="toggle(d)"
            >
              <template #label>
                <div class="ms-1">
                  <div class="d-flex flex-wrap align-center ga-2">
                    <span class="font-weight-bold" :class="{ 'text-medium-emphasis': !d.supported && !d.active }">
                      {{ d.proxyCode }}
                    </span>
                    <v-chip size="x-small" label variant="tonal" :color="KIND_COLOR[d.kind]" class="font-weight-bold">
                      {{ t(`assign.kind.${d.kind}`) }}
                    </v-chip>
                  </div>
                  <div class="text-caption text-medium-emphasis">{{ linesText(d) }}</div>
                  <div v-if="!d.supported" class="text-caption text-warning">{{ supportNote(d) }}</div>
                </div>
              </template>
            </v-checkbox>
            <div class="d-flex align-center ga-2">
              <v-progress-circular v-if="busy === d.proxyCode" indeterminate size="20" width="2" />
              <v-btn
                v-if="d.active && d.kind !== 'none' && d.supported"
                variant="outlined"
                color="primary"
                size="small"
                @click="openUpdate(d)"
              >
                {{ t("assign.updateAtDest") }}
              </v-btn>
              <v-chip v-if="d.active" size="small" color="success" variant="tonal" class="font-weight-bold">
                {{ t("assign.sending") }}
              </v-chip>
            </div>
          </div>
        </template>

        <v-alert v-if="message" type="success" variant="tonal" density="compact" class="mt-2">{{ message }}</v-alert>
      </v-card-text>
    </v-card>

    <AssignRegisterDialog :request="registerReq" @done="closeRegister(true)" @cancel="closeRegister(false)" />
    <AssignDuplicateDialog
      v-if="device"
      v-model="dupOpen"
      :device="device"
      :dests="active"
      :info="info"
      :devices="master?.devices ?? []"
      :ask-register="askRegister"
      @finished="onDuplicated"
    />
  </div>
</template>

<style scoped>
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface-soft));
}
.vehicle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.dest-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 2px 14px 2px 6px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
}
.dest-row--on {
  border-color: rgba(var(--v-theme-primary), 0.35);
  background: rgba(var(--v-theme-primary), 0.04);
}
.dest-row--off {
  background: rgb(var(--v-theme-surface-soft));
}
.group-head {
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px dashed rgba(var(--v-border-color), 0.4);
}
</style>
