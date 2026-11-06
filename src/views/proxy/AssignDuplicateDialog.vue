<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { deviceApi, type DestinationInfoResponse, type DevicesResponse } from "@/api";
import type { RegisterRequest } from "./AssignRegisterDialog.vue";
import { KIND_COLOR, supports, type Dest, type Kind } from "./assign";

type StepKind = "removeApi" | "removeOnly" | "close" | "add" | "open";
type StepStatus = "wait" | "done" | "fail" | "skip";
interface Step {
  proxy: string;
  kind: StepKind;
  status: StepStatus;
}

const open = defineModel<boolean>({ required: true });
const props = defineProps<{
  device: DevicesResponse;
  /** Destinations the current device is sending to */
  dests: Dest[];
  info: DestinationInfoResponse[];
  devices: DevicesResponse[];
  askRegister: (r: RegisterRequest) => Promise<boolean>;
}>();
const emit = defineEmits<{ finished: [serial: string, moved: number] }>();

const { t } = useI18n();
const serial = ref("");
const target = ref<DevicesResponse>();
const lookupError = ref("");
const picked = ref<Record<string, boolean>>({});
const steps = ref<Step[] | null>(null);
const running = ref(false);

watch(open, (o) => {
  if (!o) return;
  serial.value = lookupError.value = "";
  target.value = undefined;
  steps.value = null;
  picked.value = Object.fromEntries(props.dests.map((d) => [d.proxyCode, true]));
});

function lookup() {
  const s = serial.value.trim();
  target.value = undefined;
  lookupError.value = "";
  const d = props.devices.find((x) => x.serialNo === s && !x.deleted);
  if (!d) lookupError.value = t("assign.notFound", { serial: s });
  else if (d.mId === props.device.mId) lookupError.value = t("assign.dup.same");
  else target.value = d;
}

// Without a new device yet, assume every destination can move
const newSupports = (proxy: string) => {
  const p = props.info.find((x) => x.proxyCode === proxy);
  return !target.value || !p || supports(p, target.value.GPSModelCode);
};

const STEPS: Record<Kind, [StepKind, StepKind]> = {
  api: ["removeApi", "add"],
  reg: ["removeOnly", "add"],
  none: ["close", "open"],
};

const rows = computed(() =>
  props.dests.map((d) => {
    const unsupported = !newSupports(d.proxyCode);
    return { ...d, unsupported, on: !unsupported && !!picked.value[d.proxyCode], steps: STEPS[d.kind] };
  }),
);
const toMove = computed(() => rows.value.filter((r) => r.on));
const skipped = computed(() => rows.value.filter((r) => r.unsupported).length);
const dialogs = computed(() => toMove.value.filter((r) => r.kind !== "none").length);

async function exec(s: Step) {
  const oldId = props.device.mId;
  const newId = target.value!.mId;
  switch (s.kind) {
    case "removeApi":
    case "removeOnly":
      await deviceApi.destinationRegister({ mId: oldId, proxyCode: s.proxy, action: "REMOVE", fields: {} });
      return true;
    case "close":
    case "open":
      await deviceApi.destinationAssign({
        mId: s.kind === "close" ? oldId : newId,
        proxyCode: s.proxy,
        action: s.kind === "close" ? "CLOSE" : "OPEN",
      });
      return true;
    case "add": {
      // Destinations without user fields are registered straight away
      const form = await deviceApi.registerForm(newId, s.proxy, "ADD", oldId);
      if (!form.form.length) {
        await deviceApi.destinationRegister({ mId: newId, proxyCode: s.proxy, action: "ADD", fields: {} });
        return true;
      }
      return props.askRegister({
        mId: newId,
        proxyCode: s.proxy,
        action: "ADD",
        fromMId: oldId,
        newSerial: target.value!.serialNo,
      });
    }
  }
}

// One destination at a time; the new device step is skipped when closing the old one failed
async function runSteps(only?: string) {
  running.value = true;
  for (const s of steps.value!) {
    if (s.status !== "wait" || (only && s.proxy !== only)) continue;
    const prev = steps.value!.find((x) => x.proxy === s.proxy);
    if (prev !== s && prev?.status !== "done") {
      s.status = "skip";
      continue;
    }
    try {
      s.status = (await exec(s)) ? "done" : "fail";
    } catch {
      s.status = "fail";
    }
  }
  running.value = false;
}

function start() {
  steps.value = toMove.value.flatMap((r) => r.steps.map((kind) => ({ proxy: r.proxyCode, kind, status: "wait" as const })));
  runSteps();
}

function retry(proxy: string) {
  steps.value!.filter((s) => s.proxy === proxy && s.status !== "done").forEach((s) => (s.status = "wait"));
  runSteps(proxy);
}

const progress = computed(() =>
  [...new Set(steps.value?.map((s) => s.proxy))].map((proxy) => {
    const ss = steps.value!.filter((s) => s.proxy === proxy);
    const done = ss.every((s) => s.status === "done");
    const failed = ss.some((s) => s.status === "fail" || s.status === "skip");
    const badge = done ? "done" : failed ? "fail" : ss.some((s) => s.status === "done") ? "running" : "wait";
    return { proxy, steps: ss, done, failed, oldClosed: ss[0].status === "done", badge };
  }),
);
const doneCount = computed(() => progress.value.filter((p) => p.done).length);
const failCount = computed(() => progress.value.filter((p) => p.failed).length);
const finished = computed(() => !running.value && !!steps.value?.every((s) => s.status !== "wait"));

const BADGE_COLOR: Record<string, string | undefined> = { done: "success", fail: "error" };
const MARK: Record<StepStatus, string> = { done: "✓ ", fail: "✕ ", skip: "– ", wait: "" };
const STEP_COLOR: Record<StepStatus, string> = {
  done: "text-success",
  fail: "text-error",
  skip: "text-medium-emphasis",
  wait: "",
};

function finish() {
  emit("finished", target.value!.serialNo, doneCount.value);
  open.value = false;
}
</script>

<template>
  <v-dialog v-model="open" max-width="600" persistent scrollable>
    <v-card>
      <v-card-item class="border-b">
        <v-card-title>{{ t("assign.dup.title") }}</v-card-title>
        <v-card-subtitle class="text-wrap">
          {{ t("assign.dup.sub", { serial: device.serialNo, mId: device.mId }) }}
        </v-card-subtitle>
        <template #append>
          <v-btn
            icon="mdi-close"
            variant="tonal"
            size="small"
            :disabled="running"
            :aria-label="t('common.close')"
            @click="open = false"
          />
        </template>
      </v-card-item>

      <!-- Select the new device and destinations -->
      <template v-if="!steps">
        <v-card-text class="d-flex flex-column ga-3">
          <div class="d-flex ga-2 align-start">
            <v-text-field
              v-model="serial"
              :label="t('assign.dup.newSerial')"
              class="font-mono"
              density="comfortable"
              :error-messages="lookupError"
              @keyup.enter="lookup"
            />
            <v-btn variant="outlined" color="primary" height="48" :disabled="!serial.trim()" @click="lookup">
              {{ t("master.check") }}
            </v-btn>
          </div>
          <div v-if="target" class="text-body-2 text-success">
            {{ t("assign.dup.found", { mId: target.mId, model: target.GPSModelName }) }}
          </div>

          <div class="text-body-2 font-weight-bold">{{ t("assign.dup.steps") }}</div>
          <div class="d-flex flex-column ga-2">
            <div v-for="r in rows" :key="r.proxyCode" :class="['dup-row', { 'dup-row--warn': r.unsupported }]">
              <v-checkbox
                :disabled="r.unsupported"
                :model-value="r.on"
                density="compact"
                hide-details
                @update:model-value="(v) => (picked[r.proxyCode] = !!v)"
              >
                <template #label>
                  <span class="font-weight-bold flex-1-1">{{ r.proxyCode }}</span>
                </template>
              </v-checkbox>
              <v-chip size="x-small" label variant="tonal" :color="KIND_COLOR[r.kind]" class="font-weight-bold">
                {{ t(`assign.kind.${r.kind}`) }}
              </v-chip>
              <div v-if="r.unsupported" class="w-100 ps-8 text-body-2 text-warning">
                {{ t("assign.dup.unsupported") }}
              </div>
              <ol v-if="r.on" class="w-100 ps-12 text-body-2 text-medium-emphasis">
                <li v-for="k in r.steps" :key="k" :class="{ 'text-primary font-weight-bold': k === 'add' }">
                  {{ t(`assign.dup.step.${k}`, { proxy: r.proxyCode }) }}
                </li>
              </ol>
            </div>
          </div>
          <v-alert variant="tonal" density="compact" class="text-body-2">
            {{ t("assign.dup.summary", { n: toMove.length, p: dialogs }) }}
            <template v-if="skipped">{{ t("assign.dup.skipped", { n: skipped }) }}</template>
            {{ t("assign.dup.summaryTail") }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="border-t pa-4 ga-2">
          <v-btn variant="outlined" size="large" class="flex-1-1" @click="open = false">{{ t("common.cancel") }}</v-btn>
          <v-btn
            variant="flat"
            color="primary"
            size="large"
            class="flex-2-1"
            :disabled="!target || !toMove.length"
            @click="start"
          >
            {{ t("assign.dup.start") }}
          </v-btn>
        </v-card-actions>
      </template>

      <!-- Progress -->
      <template v-else>
        <v-card-text class="d-flex flex-column ga-3">
          <div class="d-flex justify-space-between text-body-2">
            <span class="font-weight-bold">{{ t("assign.dup.progress") }}</span>
            <span class="text-medium-emphasis">
              {{ t("assign.dup.progressText", { done: doneCount, total: progress.length }) }}
              <template v-if="failCount">{{ t("assign.dup.failedCount", { n: failCount }) }}</template>
            </span>
          </div>
          <div v-for="p in progress" :key="p.proxy" :class="['dup-row', { 'dup-row--error': p.failed && !running }]">
            <div class="d-flex justify-space-between align-center w-100">
              <span class="font-weight-bold">{{ p.proxy }}</span>
              <v-chip size="small" variant="tonal" :color="BADGE_COLOR[p.badge]" class="font-weight-bold">
                {{ t(`assign.dup.badge.${p.badge}`) }}
              </v-chip>
            </div>
            <ol class="w-100 ps-5 text-body-2">
              <li v-for="s in p.steps" :key="s.kind" :class="STEP_COLOR[s.status]">
                {{ MARK[s.status] }}{{ t(`assign.dup.step.${s.kind}`, { proxy: p.proxy }) }}
              </li>
            </ol>
            <div v-if="p.failed && !running" class="d-flex flex-wrap justify-space-between align-center ga-2 w-100 text-body-2 text-error">
              <span>{{ p.oldClosed ? t("assign.dup.failClosed", { proxy: p.proxy }) : t("assign.dup.failOpen") }}</span>
              <v-btn variant="outlined" color="error" size="small" @click="retry(p.proxy)">{{ t("assign.dup.retry") }}</v-btn>
            </div>
          </div>
          <v-alert v-if="finished" :type="failCount ? 'error' : 'success'" variant="tonal" density="compact">
            {{ failCount ? t("assign.dup.doneFail") : t("assign.dup.doneOk") }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="border-t pa-4">
          <v-btn variant="flat" color="primary" size="large" block :disabled="!finished" @click="finish">
            {{ t("common.close") }}
          </v-btn>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dup-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  padding: 6px 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
.dup-row--warn {
  border-color: rgba(var(--v-theme-warning), 0.5);
  background: rgba(var(--v-theme-warning), 0.05);
}
.dup-row--error {
  border-color: rgba(var(--v-theme-error), 0.5);
}
.dup-row ol {
  margin: 0;
}
.flex-2-1 {
  flex: 2 1 0;
}
</style>
