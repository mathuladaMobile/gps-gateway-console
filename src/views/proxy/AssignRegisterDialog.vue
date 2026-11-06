<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { deviceApi, type RegisterAction, type RegisterFormResponse } from "@/api";

export interface RegisterRequest {
  mId: number;
  proxyCode: string;
  action: RegisterAction;
  /** Duplicate: fill the form from this device and show the new serial */
  fromMId?: number;
  newSerial?: string;
}

const props = defineProps<{ request: RegisterRequest | null }>();
const emit = defineEmits<{ done: []; cancel: [] }>();

const { t } = useI18n();
const data = ref<RegisterFormResponse>();
const values = ref<Record<string, string>>({});
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
      const d = await deviceApi.registerForm(r.mId, r.proxyCode, r.action, r.fromMId);
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
const valid = computed(
  () => !!data.value && data.value.form.every((f) => !f.required || values.value[f.key]?.trim()),
);

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
      fields: values.value,
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
                :label="f.required ? `${f.label} *` : f.label"
                :placeholder="f.placeholder"
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
