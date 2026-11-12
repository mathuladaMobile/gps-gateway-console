<script setup lang="ts">
import dayjs from "dayjs";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import {
  deviceApi,
  type DeviceLastStatusResponse,
  type DeviceTransMonitorResponse,
} from "@/api";
import { useLoader } from "@/composables/useLoader";
import { formatDateTime, orDash } from "@/utils/format";
import {
  agoText,
  durationText,
  secondsSince,
  STATUS_COLOR,
  SWIPE_IN,
  timeOnly,
} from "./lastStatus";

type DestState = "SENT" | "STALE" | "FAILED";

const props = defineProps<{
  device?: DeviceLastStatusResponse;
  /** Lag above this (seconds) counts as "stale" */
  staleSec: number;
  /** Current time (ms), ticks so the "x ago" texts stay fresh */
  now: number;
  /** Changes on every page reload; the destinations are reloaded with it */
  loadedAt: string;
}>();
const open = defineModel<boolean>({ default: false });

const { t } = useI18n();
const { smAndDown } = useDisplay();
const { loading, error, run } = useLoader();
const info = ref<DeviceTransMonitorResponse>();

async function loadDestinations() {
  const serial = props.device?.serialNo;
  if (!open.value || !serial) return;
  const res = await run(() => deviceApi.transmission([serial]));
  // Ignore a late answer for a device that is no longer shown
  if (serial !== props.device?.serialNo) return;
  info.value = res?.devices?.find((d) => d.serialNo === serial);
}
watch(
  () => [open.value, props.device?.serialNo, props.loadedAt],
  (now, before) => {
    // A different device: drop the old rows so they never show under the new one
    if (now[1] !== before?.[1]) info.value = undefined;
    loadDestinations();
  },
  { immediate: true },
);

const STATE_COLOR: Record<DestState, string> = {
  SENT: "success",
  STALE: "error",
  FAILED: "error",
};

// Lag = device recordTime − the recordTime last sent to that destination
const destinations = computed(() => {
  const deviceAt = dayjs(props.device?.recordTime);
  return (info.value?.proxy ?? []).map((p) => {
    const sentAt = dayjs(p.recordTime);
    const lagSec =
      deviceAt.isValid() && sentAt.isValid()
        ? Math.max(0, deviceAt.diff(sentAt, "second"))
        : null;
    const ok =
      p.sentStatus === 1 || (p.sentStatus >= 200 && p.sentStatus < 300);
    const state: DestState =
      p.sentStatus != null && !ok
        ? "FAILED"
        : lagSec != null && lagSec > props.staleSec
          ? "STALE"
          : "SENT";
    return {
      ...p,
      lagSec,
      stale: lagSec != null && lagSec > props.staleSec,
      sentAgo: secondsSince(p.sentTime, props.now),
      state,
    };
  });
});
const sentCount = computed(
  () => destinations.value.filter((d) => d.state === "SENT").length,
);
const problemCount = computed(() => destinations.value.length - sentCount.value);

const swipeText = computed(() => {
  const d = props.device;
  if (!d?.swipeTime) return "-";
  const kind = t(
    d.swipeType === SWIPE_IN ? "lastStatus.swipe.in" : "lastStatus.swipe.out",
  );
  return `${kind} · ${formatDateTime(d.swipeTime)} (swipeType ${d.swipeType})`;
});

const hasPosition = computed(
  () => props.device?.latitude != null && props.device?.longitude != null,
);
const mapsUrl = computed(
  () =>
    `https://www.google.com/maps?q=${props.device?.latitude},${props.device?.longitude}`,
);

const details = computed(() => {
  const d = props.device;
  if (!d) return [];
  return [
    { label: t("col.customer"), value: orDash(d.customerName) },
    { label: t("lastStatus.detail.phone"), value: orDash(d.phoneNo) },
    { label: "deviceId", value: orDash(d.deviceId), mono: true },
    {
      label: t("lastStatus.detail.receiveTime"),
      value: orDash(formatDateTime(d.receiveTime)),
      mono: true,
    },
    {
      label: t("lastStatus.detail.generateTime"),
      value: orDash(formatDateTime(d.generateTime)),
      mono: true,
    },
    {
      label: t("lastStatus.detail.engineOffTime"),
      value: d.engineOffTime ? formatDateTime(d.engineOffTime) : "—",
      mono: true,
    },
    {
      label: t("lastStatus.detail.position"),
      value: hasPosition.value ? `${d.latitude}, ${d.longitude}` : "-",
      mono: true,
    },
    { label: t("lastStatus.col.swipe"), value: swipeText.value },
    {
      label: t("lastStatus.detail.driveInfo"),
      value: orDash(d.driveInfo),
      mono: true,
      wrap: true,
    },
    {
      label: t("lastStatus.detail.eventTime"),
      value: orDash(formatDateTime(d.eventTime)),
      mono: true,
    },
    { label: "recordNo", value: orDash(d.recordNo), mono: true },
    {
      label: "updatedAt",
      value: orDash(formatDateTime(d.updatedAt)),
      mono: true,
    },
  ];
});
</script>

<template>
  <v-navigation-drawer
    v-model="open"
    location="right"
    temporary
    :width="smAndDown ? 360 : 560"
  >
    <template v-if="device">
      <div class="d-flex align-start ga-2 pa-4 pb-2">
        <div class="flex-grow-1">
          <div class="text-h6 font-mono">{{ device.serialNo }}</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ orDash(device.plateNo) }} {{ device.provinceName ?? "" }} ·
            {{ device.categoryId }} {{ device.gpsModelName }}
          </div>
          <div class="d-flex align-center ga-2 mt-2">
            <v-chip
              size="small"
              variant="tonal"
              :color="STATUS_COLOR[device.status]"
            >
              {{ t(`lastStatus.status.${device.status}`) }}
            </v-chip>
            <span class="text-body-2 text-medium-emphasis">
              recordTime {{ orDash(formatDateTime(device.recordTime)) }}
            </span>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="t('common.close')"
          @click="open = false"
        />
      </div>

      <div class="pa-4 pt-2 d-flex flex-column ga-4">
        <section>
          <div class="d-flex align-center ga-2 mb-2">
            <div class="text-subtitle-2">
              {{ t("lastStatus.detail.destinations") }}
            </div>
            <template v-if="destinations.length">
              <v-chip size="small" variant="tonal">
                {{
                  t("lastStatus.detail.sentOf", {
                    n: sentCount,
                    total: destinations.length,
                  })
                }}
              </v-chip>
              <v-chip
                v-if="problemCount"
                size="small"
                variant="tonal"
                color="error"
              >
                {{ t("lastStatus.detail.problems", { n: problemCount }) }}
              </v-chip>
            </template>
            <v-spacer />
            <v-btn
              icon="mdi-refresh"
              variant="text"
              size="small"
              :loading="loading"
              :aria-label="t('lastStatus.reload')"
              @click="loadDestinations"
            />
          </div>

          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-2"
            >{{ error }}</v-alert
          >

          <v-table density="compact" class="dest border rounded">
            <thead>
              <tr>
                <th>{{ t("lastStatus.detail.destination") }}</th>
                <th>{{ t("lastStatus.detail.lastSent") }}</th>
                <th>{{ t("lastStatus.detail.lag") }}</th>
                <th>{{ t("col.status") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading && !destinations.length">
                <td colspan="4" class="text-center text-medium-emphasis">
                  <v-progress-circular indeterminate size="20" />
                </td>
              </tr>
              <tr v-else-if="!destinations.length">
                <td colspan="4" class="text-center text-medium-emphasis">
                  {{ t("lastStatus.detail.noDestinations") }}
                </td>
              </tr>
              <tr v-for="d in destinations" :key="`${d.proxyCode}-${d.tmId}`">
                <td class="font-mono text-no-wrap">
                  {{ d.proxyCode }} #{{ d.tmId }}
                </td>
                <td class="font-mono">
                  <div>{{ timeOnly(d.sentTime) }}</div>
                  <div
                    v-if="d.sentAgo != null"
                    class="text-caption text-medium-emphasis"
                  >
                    {{ agoText(d.sentAgo) }}
                  </div>
                </td>
                <td>
                  <v-chip
                    v-if="d.stale"
                    size="small"
                    variant="tonal"
                    color="error"
                    class="font-weight-bold"
                  >
                    {{ durationText(d.lagSec) }}
                  </v-chip>
                  <span v-else class="text-body-2 text-success">
                    {{
                      d.lagSec == null ? "-" : t("lastStatus.detail.noLag")
                    }}
                  </span>
                </td>
                <td>
                  <v-chip
                    size="small"
                    variant="tonal"
                    :color="STATE_COLOR[d.state]"
                  >
                    {{ t(`lastStatus.detail.state.${d.state}`) }}
                  </v-chip>
                  <div
                    v-if="d.state === 'FAILED' && d.sentMsgReply"
                    class="text-caption font-mono reply mt-1"
                  >
                    {{ d.sentMsgReply }}
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </section>

        <dl class="details">
          <template v-for="row in details" :key="row.label">
            <dt class="text-medium-emphasis">{{ row.label }}</dt>
            <dd :class="{ 'font-mono': row.mono, 'pre-wrap': row.wrap }">
              {{ row.value }}
            </dd>
          </template>
        </dl>

        <div class="d-flex flex-wrap ga-4 text-body-2">
          <a
            v-if="hasPosition"
            :href="mapsUrl"
            target="_blank"
            rel="noopener"
            class="text-primary"
          >
            {{ t("lastStatus.detail.openMap") }}
            <v-icon icon="mdi-open-in-new" size="14" />
          </a>
          <router-link
            :to="{
              name: 'device-data-transmission',
              query: { serial: device.serialNo },
            }"
            class="text-primary"
          >
            {{ t("lastStatus.detail.toTransmission") }} →
          </router-link>
          <router-link
            :to="{ name: 'dlt-history', query: { mId: String(device.mId) } }"
            class="text-primary"
          >
            {{ t("lastStatus.detail.toDltHistory") }} →
          </router-link>
        </div>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<style scoped>
.details {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 24px;
  margin: 0;
}
.details dd {
  margin: 0;
  min-width: 0;
}
.pre-wrap,
.reply {
  white-space: pre-wrap;
  word-break: break-all;
}
.dest td {
  vertical-align: top;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}
</style>
