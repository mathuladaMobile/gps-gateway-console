<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { deviceApi, type RegisterAction, type RegistrationInfo } from "@/api";
import { formatDateTime } from "@/utils/format";

export interface RegisterRequest {
  mId: number;
  proxyCode: string;
  action: RegisterAction;
  /** Duplicate: fill the form from this device's registration and show the new serial */
  fromMId?: number;
  newSerial?: string;
}

/** Popup data built from GET /device/destination/register/info */
interface FormData {
  /** Registration details, read-only */
  auto: { label: string; value: string }[];
  /** Editable fields: from the last payload, else the destination's defaults */
  form: { key: string; value: string }[];
  /** Last payload + defaults; edited values are written over it when sending */
  base: Record<string, unknown>;
}

const props = defineProps<{ request: RegisterRequest | null }>();
const emit = defineEmits<{ done: []; cancel: [] }>();

const { t } = useI18n();
const data = ref<FormData>();
const values = ref<Record<string, string>>({});

const isPrimitive = (v: unknown) => v == null || ["string", "number", "boolean"].includes(typeof v);

function toFormData(info: RegistrationInfo): FormData {
  // The popup fills from the payload first; fields missing there use the defaults
  const base = { ...(info.defaults ?? {}), ...(info.payload ?? {}) };
  const show = (v: unknown) => (v == null || v === "" ? "-" : String(isPrimitive(v) ? formatDateTime(v) : JSON.stringify(v)));
  const auto = [
    { label: "mId", value: String(info.mId) },
    { label: "registered", value: String(!!info.registered) },
    { label: "regRef", value: show(info.regRef) },
    { label: "lastAction", value: show(info.lastAction) },
    { label: "registeredAt", value: `${show(info.registeredAt)} · ${show(info.registeredBy)}` },
    { label: "updatedAt", value: `${show(info.updatedAt)} · ${show(info.updatedBy)}` },
    // Nested values are sent unchanged, so they are only shown
    ...Object.entries(base)
      .filter(([, v]) => !isPrimitive(v))
      .map(([k, v]) => ({ label: k, value: show(v) })),
  ];
  const form = Object.entries(base)
    .filter(([, v]) => isPrimitive(v))
    .map(([key, v]) => ({ key, value: v == null ? "" : String(v) }));
  return { auto, form, base };
}

// Edited text goes back with the type the field had (number / boolean / string)
function toPayload(d: FormData) {
  const out: Record<string, unknown> = { ...d.base };
  for (const { key } of d.form) {
    const v = values.value[key] ?? "";
    const orig = d.base[key];
    out[key] =
      typeof orig === "number" && v.trim() !== "" && !isNaN(Number(v))
        ? Number(v)
        : typeof orig === "boolean"
          ? v.trim().toLowerCase() === "true"
          : v;
  }
  return out;
}
const loading = ref(false);
const saving = ref(false);
const loadError = ref("");
const saveError = ref("");

watch(
  () => props.request,
  async (r) => {
    data.value = undefined;
    loadError.value = saveError.value = "";
    if (!r) return;
    loading.value = true;
    try {
      const d = toFormData(await deviceApi.registerInfo(r.fromMId ?? r.mId, r.proxyCode));
      // REMOVE sends the registered data only
      if (r.action === "REMOVE") d.form = [];
      data.value = d;
      values.value = Object.fromEntries(d.form.map((f) => [f.key, f.value]));
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  },
);

const action = computed(() => props.request?.action ?? "ADD");
// The API does not mark required fields, so any loaded form can be sent
const valid = computed(() => !!data.value);

async function confirm() {
  const r = props.request;
  if (!r) return;
  saving.value = true;
  saveError.value = "";
  try {
    await deviceApi.destinationRegister({
      mId: r.mId,
      proxyCode: r.proxyCode,
      action: r.action,
      ...(r.action !== "REMOVE" && data.value && { form: toPayload(data.value) }),
    });
    emit("done");
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <v-dialog :model-value="!!request" max-width="600" persistent>
    <v-card v-if="request">
      <v-card-item class="border-b">
        <v-card-title>{{ request.action }} · {{ request.proxyCode }}</v-card-title>
        <v-card-subtitle class="text-wrap">{{ t(`assign.dialog.sub.${action}`) }}</v-card-subtitle>
        <div v-if="request.newSerial" class="text-caption font-weight-bold text-primary mt-1">
          {{ t("assign.dialog.dupNote", { serial: request.newSerial }) }}
        </div>
        <template #append>
          <v-btn icon="mdi-close" variant="tonal" size="small" :aria-label="t('common.close')" @click="emit('cancel')" />
        </template>
      </v-card-item>

      <v-card-text class="d-flex flex-column ga-3">
        <v-progress-linear v-if="loading" indeterminate color="primary" />
        <v-alert v-if="loadError" type="error" variant="tonal" density="compact">{{ loadError }}</v-alert>

        <template v-if="data">
          <div class="text-body-2 font-weight-bold text-medium-emphasis">
            {{ action === "REMOVE" ? t("assign.dialog.autoTitleRemove") : t("assign.dialog.autoTitle") }}
          </div>
          <div class="auto-grid">
            <div v-for="a in data.auto" :key="a.label" class="min-w-0">
              <div class="text-caption text-medium-emphasis">{{ a.label }}</div>
              <div class="font-mono text-body-2 wrap-anywhere">{{ a.value }}</div>
            </div>
          </div>

          <template v-if="data.form.length">
            <div class="text-body-2 font-weight-bold text-medium-emphasis">
              {{ t("assign.dialog.formTitle") }}
              <span class="font-weight-regular">· {{ t("assign.dialog.formHint") }}</span>
            </div>
            <div class="form-grid">
              <v-text-field
                v-for="f in data.form"
                :key="f.key"
                v-model="values[f.key]"
                :label="f.key"
                density="comfortable"
                hide-details
              />
            </div>
          </template>
          <v-alert v-else variant="tonal" density="compact" class="text-body-2">
            {{ action === "REMOVE" ? t("assign.dialog.noFormRemove") : t("assign.dialog.noForm") }}
          </v-alert>
        </template>

        <v-alert v-if="saveError" type="error" variant="tonal" density="compact">
          <div class="font-weight-bold">REGISTER_{{ request.proxyCode }}_API_FAILED</div>
          <div>{{ t("assign.dialog.failed") }}</div>
          <div class="text-caption">{{ saveError }}</div>
        </v-alert>
      </v-card-text>

      <v-card-actions class="border-t pa-4 ga-2">
        <v-btn variant="outlined" size="large" class="flex-1-1" @click="emit('cancel')">{{ t("common.cancel") }}</v-btn>
        <v-btn
          variant="flat"
          size="large"
          class="flex-2-1"
          :color="action === 'REMOVE' ? 'error' : 'primary'"
          :disabled="!valid"
          :loading="saving"
          @click="confirm"
        >
          {{ t(`assign.dialog.ok.${action}`) }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.auto-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface-soft));
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.min-w-0 {
  min-width: 0;
}
.wrap-anywhere {
  overflow-wrap: anywhere;
}
.flex-2-1 {
  flex: 2 1 0;
}
</style>
