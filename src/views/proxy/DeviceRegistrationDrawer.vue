<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import type { DeviceRegistrationRow } from "@/api";
import { orDash } from "@/utils/format";
import JsonBlock from "./JsonBlock.vue";
import { ACTION_COLOR, stamp } from "./registration";

const props = defineProps<{ row?: DeviceRegistrationRow }>();
const open = defineModel<boolean>({ default: false });

const { t } = useI18n();
const { smAndDown } = useDisplay();

const fields = computed(() => {
  const r = props.row;
  if (!r) return [];
  const by = (at: string | null, who: string | null) =>
    `${stamp(at)} · ${t("devReg.by")} ${orDash(who)}`;
  return [
    { label: "deviceID", value: orDash(r.deviceId), mono: true },
    { label: "IMEI", value: orDash(r.imeiNo), mono: true },
    { label: t("col.category"), value: orDash(r.categoryId), mono: true },
    { label: "regRef", value: orDash(r.regRef), mono: true },
    {
      label: t("devReg.col.registeredAt"),
      value: by(r.registeredAt, r.registeredBy),
    },
    { label: t("col.updatedAt"), value: by(r.updatedAt, r.updatedBy) },
  ];
});

const logLink = computed(() => ({
  name: "proxy-device-registration-log",
  query: {
    mId: String(props.row?.mId ?? ""),
    proxyCode: props.row?.proxyCode ?? "",
  },
}));
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
          <h2 class="text-h6 font-weight-bold">
            {{ row.proxyCode }} ·
            <span class="font-mono">{{ row.serialNo }}</span>
          </h2>
          <div class="text-body-2 text-medium-emphasis d-flex align-center flex-wrap ga-1">
            {{ orDash(row.plateNo) }} · mId {{ row.mId }} ·
            <v-chip
              size="x-small"
              variant="tonal"
              :color="ACTION_COLOR[row.lastAction]"
              class="font-weight-bold"
            >
              {{ row.lastAction }}
            </v-chip>
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
          <dd :class="{ 'font-mono': f.mono }">{{ f.value }}</dd>
        </template>
      </dl>

      <JsonBlock
        label="Payload"
        :hint="t('devReg.payloadHint')"
        :value="row.payload"
      />
      <JsonBlock label="Response" :value="row.response" />

      <div class="d-flex flex-column ga-1 text-body-2">
        <router-link :to="logLink" @click="open = false">
          {{ t("devReg.toLog") }} →
        </router-link>
        <router-link :to="assignLink" @click="open = false">
          {{ t("devReg.toAssign") }} →
        </router-link>
      </div>
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
</style>
