<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import type { RegistrationLogRow } from "@/api";
import { orDash } from "@/utils/format";
import JsonBlock from "./JsonBlock.vue";
import { RESULT_COLOR, stamp } from "./registration";

const props = defineProps<{ row?: RegistrationLogRow }>();
const open = defineModel<boolean>({ default: false });

const { t } = useI18n();
const { smAndDown } = useDisplay();

const fields = computed(() => {
  const r = props.row;
  if (!r) return [];
  return [
    {
      label: t("devReg.col.device"),
      value: `${r.serialNo} · ${orDash(r.plateNo)} · mId ${r.mId}`,
    },
    { label: "deviceID", value: orDash(r.deviceId) },
    { label: "IMEI", value: orDash(r.imeiNo) },
    { label: "HTTP", value: r.httpStatus ?? "-" },
  ];
});

const assignLink = computed(() => ({
  name: "proxy-assign-destination",
  query: { serial: props.row?.serialNo ?? "" },
}));
</script>

<template>
  <v-navigation-drawer
    v-model="open"
    location="right"
    temporary
    :width="smAndDown ? 360 : 560"
  >
    <div v-if="row" class="pa-5 d-flex flex-column ga-4">
      <div class="d-flex align-start ga-2">
        <div class="flex-grow-1">
          <h2 class="text-h6 font-weight-bold d-flex align-center flex-wrap ga-2">
            {{ row.proxyCode }} · {{ row.action }}
            <v-chip
              size="x-small"
              variant="tonal"
              :color="RESULT_COLOR[row.result]"
              class="font-weight-bold"
            >
              {{ row.result }}
            </v-chip>
          </h2>
          <div class="text-body-2 text-medium-emphasis">
            logId {{ row.logId }} · {{ stamp(row.createdAt) }} ·
            {{ t("devReg.by") }} {{ orDash(row.createdBy) }}
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="tonal"
          size="small"
          :aria-label="t('common.close')"
          @click="open = false"
        />
      </div>

      <dl class="fields text-body-2">
        <template v-for="f in fields" :key="f.label">
          <dt class="text-medium-emphasis">{{ f.label }}</dt>
          <dd class="font-mono">{{ f.value }}</dd>
        </template>
      </dl>

      <v-alert
        v-if="row.errorMessage"
        type="error"
        variant="tonal"
        density="compact"
        :icon="false"
      >
        <div class="font-weight-bold">errorMessage</div>
        <div class="text-body-2 message">{{ row.errorMessage }}</div>
      </v-alert>

      <JsonBlock
        :label="t('devRegLog.requestPayload')"
        :hint="t('devRegLog.payloadHint')"
        :value="row.payload"
      />
      <JsonBlock label="Response" :value="row.response" />

      <router-link
        :to="assignLink"
        class="text-body-2"
        @click="open = false"
      >
        {{ t("devRegLog.toAssign") }} →
      </router-link>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.fields {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 6px 12px;
  margin: 0;
}
.fields dd {
  margin: 0;
  min-width: 0;
  word-break: break-all;
}
.message {
  word-break: break-word;
}
</style>
