<script setup lang="ts">
import dayjs from "dayjs";
import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import {
  dashboardApi,
  type DashboardAlertStatus,
  type DashboardDestination,
  type DashboardGenerator,
  type DashboardProxyModels,
  type DashboardResponse,
} from "@/api";
import { useLoader } from "@/composables/useLoader";
import { agoText } from "@/views/monitoring/lastStatus";

const REFRESH_SEC = 30;
const DEFAULT_ONLINE_MIN = 5;
const GEN_NAME: Record<string, string> = { FEL: "FE-Lite", FEP: "FE-Pro" };
const STATUS_COLOR: Record<DashboardAlertStatus, string> = {
  ALERT: "error",
  WAIT: "warning",
  OK: "success",
};

const { t, te } = useI18n();

const appLabel = (a: { appId: string; appName: string }) => {
  const key = `dashboard.apps.names.${a.appId}`;
  return te(key) ? t(key) : a.appName;
};
const { loading, error, run } = useLoader();
const proxyLoader = useLoader();

const data = ref<DashboardResponse>();
const loadedAt = ref("");
const proxyCode = ref<string | null>(null);
const proxyModels = ref<DashboardProxyModels>();
const issuesEl = ref<HTMLElement>();

async function load() {
  countdown.value = REFRESH_SEC;
  const r = await run(dashboardApi.get);
  if (!r) return;
  data.value = r;
  loadedAt.value = dayjs().format("HH:mm:ss");
  const codes = r.proxyCodes ?? [];
  if (!proxyCode.value || !codes.includes(proxyCode.value)) {
    // The watch on proxyCode loads its models
    proxyCode.value = codes[0] ?? null;
  } else {
    loadProxyModels();
  }
}

async function loadProxyModels() {
  const code = proxyCode.value;
  if (!code) {
    proxyModels.value = undefined;
    return;
  }
  const r = await proxyLoader.run(() => dashboardApi.proxyModels(code));
  // Ignore answers for a proxy the user has already switched away from
  if (r && code === proxyCode.value) proxyModels.value = r;
}
watch(proxyCode, loadProxyModels);

// Auto refresh, paused while the browser tab is hidden or this page's tab is in the background
const countdown = ref(REFRESH_SEC);
const active = ref(true);
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  load();
  timer = setInterval(() => {
    if (!active.value || document.hidden || loading.value) return;
    if (--countdown.value <= 0) load();
  }, 1000);
});
onUnmounted(() => clearInterval(timer));
onActivated(() => (active.value = true));
onDeactivated(() => (active.value = false));

const summary = computed(() => data.value?.summary);
const onlineMin = computed(
  () => data.value?.onlineMinutes ?? DEFAULT_ONLINE_MIN,
);
const generators = computed(() => data.value?.generators ?? []);
const destinations = computed(() => data.value?.destinations ?? []);
const problemDests = computed(() =>
  destinations.value.filter((d) => d.alertStatus !== "OK"),
);
const apps = computed(() => data.value?.apps ?? null);

const devicesSub = computed(() =>
  generators.value
    .map((g) => `${g.categoryId} ${fmt(g.devices)}`)
    .join(" · "),
);

const problemParts = computed(() => {
  const s = summary.value;
  if (!s) return "";
  const parts = generators.value
    .filter((g) => g.needAlert)
    .map((g) =>
      t("dashboard.issues.genNoData", {
        gen: g.categoryId,
        min: g.agoMinute ?? "-",
      }),
    );
  if (s.alert) parts.push(t("dashboard.issues.alert", { n: s.alert }));
  if (s.wait) parts.push(t("dashboard.issues.wait", { n: s.wait }));
  if (s.appProblems) parts.push(t("dashboard.issues.apps", { n: s.appProblems }));
  return parts.join(" · ");
});

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString();
const pct = (part: number, total: number) =>
  total ? (part / total) * 100 : 0;
const pctText = (part: number, total: number) =>
  `${pct(part, total).toFixed(1)}%`;
/** Online / Offline % rounded to 0.1 so the pair always adds up to exactly 100.0%. */
function splitPct(online: number, offline: number) {
  const total = online + offline;
  if (!total) return { online: "0.0%", offline: "0.0%" };
  const on = Math.round((online / total) * 1000) / 10;
  return { online: `${on.toFixed(1)}%`, offline: `${(100 - on).toFixed(1)}%` };
}

function timeOf(value: string | null) {
  if (!value) return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format("HH:mm:ss") : value;
}

/** Today: "16:12" · older: "27/10 14:37" */
function shortDateTime(value: string) {
  const d = dayjs(value);
  if (!d.isValid()) return value;
  return d.format(d.isSame(dayjs(), "day") ? "HH:mm" : "DD/MM HH:mm");
}

/** tmType is left off the chip for the usual "location" line */
const chipLine = (d: DashboardDestination) =>
  d.tmType && d.tmType !== "location" ? d.tmType : "";

const genColor = (g: DashboardGenerator) => (g.needAlert ? "error" : "success");

function scrollToIssues() {
  issuesEl.value?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <div class="d-flex flex-wrap align-center ga-3">
      <p class="text-medium-emphasis mb-0">{{ t("dashboard.subtitle") }}</p>
      <v-spacer />
      <span class="text-body-2 text-medium-emphasis">
        {{ t("dashboard.updatedAt", { time: loadedAt || "-", sec: REFRESH_SEC }) }}
      </span>
      <v-btn
        variant="outlined"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="load"
      >
        {{ t("dashboard.refresh") }}
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" density="compact">
      {{ error }}
    </v-alert>

    <v-card v-if="summary?.problems" class="problem-banner">
      <v-card-text class="d-flex align-center ga-3">
        <v-icon icon="mdi-circle" color="error" size="14" />
        <div>
          <div class="text-h6 font-weight-bold">
            {{ t("dashboard.issues.title", { n: summary.problems }) }}
          </div>
          <div class="text-body-2 text-medium-emphasis">{{ problemParts }}</div>
        </div>
        <v-spacer />
        <a href="#" class="text-primary" @click.prevent="scrollToIssues">
          {{ t("dashboard.issues.see") }}
        </a>
      </v-card-text>
    </v-card>

    <div class="stats">
      <v-card>
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis">
            {{ t("dashboard.stat.destinations") }}
          </div>
          <div class="text-h4 font-weight-bold tabular my-2">
            {{ summary ? fmt(summary.destinations) : "-" }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ t("dashboard.stat.destinationsSub") }}
          </div>
        </v-card-text>
      </v-card>
      <v-card>
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis">ALERT</div>
          <div
            class="text-h4 font-weight-bold tabular my-2"
            :class="{ 'text-error': summary?.alert }"
          >
            {{ summary ? fmt(summary.alert) : "-" }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ t("dashboard.stat.alertSub") }}
          </div>
        </v-card-text>
      </v-card>
      <v-card>
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis">WAIT</div>
          <div
            class="text-h4 font-weight-bold tabular my-2"
            :class="{ 'text-warning': summary?.wait }"
          >
            {{ summary ? fmt(summary.wait) : "-" }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ t("dashboard.stat.waitSub") }}
          </div>
        </v-card-text>
      </v-card>
      <v-card>
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis">
            {{ t("dashboard.stat.devices") }}
          </div>
          <div class="text-h4 font-weight-bold tabular my-2">
            {{ summary ? fmt(summary.devices) : "-" }}
          </div>
          <div class="text-caption text-medium-emphasis">{{ devicesSub }}</div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Generators -->
    <div v-if="generators.length">
      <div class="mb-2">
        <span class="text-subtitle-1 font-weight-bold">{{ t("dashboard.gen.title") }}</span>
        <span class="text-body-2 text-medium-emphasis">
          · {{ t("dashboard.gen.rule", { min: onlineMin }) }}
        </span>
      </div>
      <div class="gens">
        <v-card
          v-for="g in generators"
          :key="g.categoryId"
          class="accent-left"
          :class="`accent-left--${genColor(g)}`"
        >
          <v-card-text>
            <div class="d-flex align-center mb-3">
              <span class="text-h6 font-weight-bold">{{ g.categoryId }}</span>
              <span class="text-body-2 text-medium-emphasis ml-2">
                {{ GEN_NAME[g.categoryId] ?? "" }}
              </span>
              <v-spacer />
              <v-chip size="small" variant="tonal" :color="genColor(g)">
                {{ g.needAlert ? t("dashboard.gen.noData") : t("dashboard.gen.ok") }}
              </v-chip>
            </div>

            <div class="gen-facts mb-3">
              <div>
                <div class="text-caption text-medium-emphasis">{{ t("dashboard.gen.latest") }}</div>
                <div class="tabular">{{ timeOf(g.maxRecordTime) }}</div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">{{ t("dashboard.gen.ago") }}</div>
                <div :class="{ 'text-error font-weight-bold': g.needAlert }">
                  {{ g.agoMinute == null ? "-" : t("dashboard.gen.minutes", { n: fmt(g.agoMinute) }) }}
                </div>
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">{{ t("dashboard.gen.devices") }}</div>
                <div class="tabular">{{ fmt(g.devices) }}</div>
              </div>
            </div>

            <v-progress-linear
              :model-value="pct(g.online, g.devices)"
              color="success"
              bg-color="grey"
              bg-opacity="0.6"
              height="8"
              rounded
            />
            <div class="d-flex flex-wrap ga-4 text-body-2 mt-2 mb-4">
              <span>
                <v-icon icon="mdi-circle" color="success" size="10" class="mr-1" />
                Online <b>{{ fmt(g.online) }}</b>
                <span class="text-medium-emphasis">({{ splitPct(g.online, g.offline).online }})</span>
              </span>
              <span>
                <v-icon icon="mdi-circle" color="grey" size="10" class="mr-1" />
                Offline <b>{{ fmt(g.offline) }}</b>
                <span class="text-medium-emphasis">({{ splitPct(g.online, g.offline).offline }})</span>
              </span>
            </div>

            <div class="text-caption text-medium-emphasis mb-1">{{ t("dashboard.gen.models") }}</div>
            <v-table density="compact" class="mini-table">
              <thead>
                <tr>
                  <th>{{ t("dashboard.gen.model") }}</th>
                  <th class="text-end">{{ t("dashboard.col.total") }}</th>
                  <th class="text-end">{{ t("dashboard.col.online") }}</th>
                  <th class="text-end">{{ t("dashboard.col.offline") }}</th>
                  <th class="bar-col" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in g.models" :key="m.model">
                  <td class="text-no-wrap">{{ m.model }}</td>
                  <td class="text-end tabular">{{ fmt(m.total) }}</td>
                  <td class="text-end tabular" :class="{ 'text-success': m.online }">
                    {{ fmt(m.online) }}
                  </td>
                  <td
                    class="text-end tabular"
                    :class="{ 'text-error font-weight-bold': m.offline > m.online }"
                  >
                    {{ fmt(m.offline) }}
                  </td>
                  <td class="bar-col">
                    <v-progress-linear
                      :model-value="pct(m.online, m.total)"
                      color="success"
                      height="5"
                      rounded
                    />
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- Device types by destination -->
    <v-card v-if="data">
      <v-card-text>
        <div class="d-flex flex-wrap align-center ga-3 mb-3">
          <span class="text-subtitle-1 font-weight-bold">{{ t("dashboard.byDest.title") }}</span>
          <v-spacer />
          <span class="text-body-2 text-medium-emphasis">{{ t("dashboard.byDest.proxy") }}</span>
          <v-select
            v-model="proxyCode"
            :items="data.proxyCodes ?? []"
            density="compact"
            hide-details
            class="proxy-select"
          />
        </div>

        <v-alert
          v-if="proxyLoader.error.value"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          {{ proxyLoader.error.value }}
        </v-alert>

        <template v-if="proxyModels">
          <div class="d-flex flex-wrap ga-6 mb-2">
            <span>{{ t("dashboard.byDest.bound") }} <b>{{ fmt(proxyModels.total) }}</b></span>
            <span class="text-success">
              Online <b>{{ fmt(proxyModels.online) }}</b>
              ({{ pctText(proxyModels.online, proxyModels.total) }})
            </span>
            <span>Offline <b>{{ fmt(proxyModels.offline) }}</b></span>
            <span v-if="proxyModels.lines?.length" class="text-medium-emphasis">
              {{ t("dashboard.byDest.lines", { lines: proxyModels.lines.join(", ") }) }}
            </span>
          </div>

          <v-table :loading="proxyLoader.loading.value">
            <thead>
              <tr>
                <th>{{ t("dashboard.byDest.model") }}</th>
                <th>Gen</th>
                <th class="text-end">{{ t("dashboard.col.total") }}</th>
                <th class="text-end">{{ t("dashboard.col.online") }}</th>
                <th class="text-end">{{ t("dashboard.col.offline") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!proxyModels.models?.length">
                <td colspan="5" class="text-center text-medium-emphasis">
                  {{ t("dashboard.byDest.noData") }}
                </td>
              </tr>
              <tr v-for="m in proxyModels.models" :key="`${m.categoryId}-${m.model}`">
                <td class="font-weight-bold text-no-wrap">{{ m.model }}</td>
                <td>{{ m.categoryId }}</td>
                <td class="text-end tabular text-no-wrap">
                  {{ fmt(m.total) }}
                  <span class="text-medium-emphasis">({{ pctText(m.total, proxyModels.total) }})</span>
                </td>
                <td class="text-end tabular text-no-wrap">
                  <span :class="{ 'text-success': m.online }">{{ fmt(m.online) }}</span>
                  <span class="text-medium-emphasis"> ({{ splitPct(m.online, m.offline).online }})</span>
                </td>
                <td class="text-end tabular text-no-wrap">
                  <span :class="{ 'text-error font-weight-bold': m.offline > m.online }">{{ fmt(m.offline) }}</span>
                  <span class="text-medium-emphasis"> ({{ splitPct(m.online, m.offline).offline }})</span>
                </td>
              </tr>
            </tbody>
          </v-table>
        </template>
        <v-progress-linear v-else-if="proxyLoader.loading.value" indeterminate />

        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          {{ t("dashboard.byDest.footnote", { min: onlineMin }) }}
        </p>
      </v-card-text>
    </v-card>

    <!-- Destinations to check -->
    <div v-if="data" ref="issuesEl" class="scroll-target">
      <div class="d-flex flex-wrap align-center ga-2 mb-2">
        <span class="text-subtitle-1 font-weight-bold">{{ t("dashboard.dest.title") }}</span>
        <span class="text-body-2 text-medium-emphasis">
          · {{ t("dashboard.dest.ofCount", { n: problemDests.length, total: destinations.length }) }}
        </span>
        <v-spacer />
        <router-link to="/system-monitor/proxy-system" class="text-body-2 text-medium-emphasis">
          {{ t("dashboard.dest.detail") }}
        </router-link>
      </div>

      <div class="d-flex flex-wrap ga-2 mb-2">
        <v-chip
          v-for="d in destinations"
          :key="`${d.proxyCode}-${d.tmId}-${d.categoryId}`"
          size="small"
          variant="tonal"
          :color="STATUS_COLOR[d.alertStatus]"
        >
          <v-icon icon="mdi-circle" size="8" start />
          <b>{{ d.proxyCode }}</b>
          <span v-if="chipLine(d)" class="ml-1">{{ chipLine(d) }}</span>
          <span class="ml-1 opacity-70">{{ d.categoryId }}</span>
        </v-chip>
      </div>
      <div class="d-flex flex-wrap ga-4 text-caption text-medium-emphasis mb-3">
        <span><span class="text-error">● ALERT</span> {{ t("dashboard.dest.alertDesc") }}</span>
        <span><span class="text-warning">● WAIT</span> {{ t("dashboard.dest.waitDesc") }}</span>
        <span><span class="text-success">● OK</span> {{ t("dashboard.dest.okDesc") }}</span>
      </div>

      <v-card>
        <v-table>
          <thead>
            <tr>
              <th>{{ t("dashboard.dest.status") }}</th>
              <th>{{ t("dashboard.dest.destination") }}</th>
              <th>Gen</th>
              <th class="text-end">{{ t("dashboard.dest.devices") }}</th>
              <th>{{ t("dashboard.dest.lastSuccess") }}</th>
              <th class="text-end">{{ t("dashboard.dest.backlog") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!problemDests.length">
              <td colspan="6" class="text-center text-success">{{ t("dashboard.dest.allOk") }}</td>
            </tr>
            <tr v-for="d in problemDests" :key="`${d.proxyCode}-${d.tmId}-${d.categoryId}`">
              <td>
                <v-chip size="small" variant="tonal" :color="STATUS_COLOR[d.alertStatus]">
                  {{ d.alertStatus }}
                </v-chip>
              </td>
              <td class="text-no-wrap">
                <b>{{ d.proxyCode }}</b>
                <span class="text-body-2 text-medium-emphasis ml-1">{{ d.tmType }}</span>
              </td>
              <td>{{ d.categoryId }}</td>
              <td class="text-end tabular">{{ fmt(d.vehicleCount) }}</td>
              <td class="text-no-wrap">
                <template v-if="d.lastSuccessTime">
                  {{ shortDateTime(d.lastSuccessTime) }}
                  <span v-if="d.successDiffM != null" class="text-caption text-medium-emphasis">
                    ({{ agoText(d.successDiffM * 60) }})
                  </span>
                </template>
                <span v-else class="text-error">{{ t("dashboard.dest.never") }}</span>
              </td>
              <td
                class="text-end tabular font-weight-bold"
                :class="d.alertStatus === 'ALERT' ? 'text-error' : 'text-warning'"
              >
                {{ d.recordDiffM == null ? "-" : t("dashboard.gen.minutes", { n: fmt(d.recordDiffM) }) }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </div>

    <!-- Apps with problems (SUPER_ADMIN / ADMIN only; null for other roles) -->
    <div v-if="apps">
      <div class="d-flex flex-wrap align-center ga-2 mb-2">
        <span class="text-subtitle-1 font-weight-bold">{{ t("dashboard.apps.title") }}</span>
        <v-chip size="x-small" color="primary" variant="tonal">ADMIN</v-chip>
        <span class="text-body-2 text-medium-emphasis">
          · {{ t("dashboard.apps.ofCount", { n: apps.problems?.length ?? 0, total: apps.total }) }}
        </span>
        <v-spacer />
        <router-link to="/system-monitor/app-status" class="text-body-2 text-primary">
          {{ t("dashboard.apps.link") }}
        </router-link>
      </div>
      <div class="apps">
        <v-card
          v-for="a in apps.problems ?? []"
          :key="a.appId"
          class="accent-left"
          :class="`accent-left--${a.health === 'ERROR' ? 'error' : 'warning'}`"
        >
          <v-card-text>
            <div class="d-flex align-center ga-2">
              <span class="text-subtitle-1 font-weight-bold">{{ appLabel(a) }}</span>
              <v-spacer />
              <v-chip
                size="small"
                variant="tonal"
                :color="a.health === 'ERROR' ? 'error' : 'warning'"
              >
                {{ a.health }}
              </v-chip>
            </div>
            <div class="font-mono text-body-2 text-medium-emphasis">{{ a.appId }}</div>
            <div class="text-body-2">{{ a.healthNote || a.lastStatus }}</div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <p class="text-body-2 text-medium-emphasis mb-0">{{ t("dashboard.footnote") }}</p>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.gens {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 12px;
}
.apps {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
@media (max-width: 600px) {
  .gens {
    grid-template-columns: 1fr;
  }
}
.gen-facts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.problem-banner,
.accent-left {
  border-left: 5px solid transparent;
}
.problem-banner {
  border-left-color: rgb(var(--v-theme-error));
}
.accent-left--success {
  border-left-color: rgb(var(--v-theme-success));
}
.accent-left--warning {
  border-left-color: rgb(var(--v-theme-warning));
}
.accent-left--error {
  border-left-color: rgb(var(--v-theme-error));
}
.mini-table :deep(th),
.mini-table :deep(td) {
  padding: 0 6px !important;
}
.bar-col {
  width: 30%;
}
.proxy-select {
  max-width: 200px;
}
.pct {
  min-width: 48px;
  text-align: end;
}
.tabular {
  font-variant-numeric: tabular-nums;
}
.scroll-target {
  scroll-margin-top: 120px;
}
</style>
