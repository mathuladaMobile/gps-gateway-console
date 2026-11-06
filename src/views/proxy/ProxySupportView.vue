<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  destinationApi,
  type DestinationInfoResponse,
  type Models,
} from "@/api";
import { useLoader } from "@/composables/useLoader";

type View = "proxy" | "matrix";
type RegisterType = "ALL" | "API" | "ASSIGN";

const { t } = useI18n();
const items = ref<DestinationInfoResponse[]>([]);
const { loading, error, run } = useLoader();

const view = ref<View>("proxy");
const type = ref<RegisterType>("ALL");
const q = ref("");

async function load() {
  items.value = (await run(destinationApi.info)) ?? [];
}

onMounted(load);

const query = computed(() => (q.value ?? "").trim().toUpperCase());

function hitModel(m: Models) {
  return (
    !query.value ||
    m.name.toUpperCase().includes(query.value) ||
    m.categoryId.toUpperCase().includes(query.value)
  );
}

// Proxies matching the type filter and search (proxy code or any model)
const list = computed(() =>
  items.value.filter((p) => {
    if (type.value !== "ALL" && p.registerType !== type.value) return false;
    if (!query.value) return true;
    return (
      p.proxyCode.toUpperCase().includes(query.value) ||
      (p.models ?? []).some(hitModel)
    );
  }),
);

const stats = computed(() => {
  const api = items.value.filter((p) => p.registerType === "API").length;
  const empty = items.value.filter((p) => !p.models?.length);
  return [
    {
      label: t("proxySupport.stat.total"),
      value: items.value.length,
      sub: t("proxySupport.stat.totalSub"),
      color: undefined,
    },
    {
      label: "API",
      value: api,
      sub: t("proxySupport.stat.apiSub"),
      color: "primary",
    },
    {
      label: "ASSIGN",
      value: items.value.length - api,
      sub: t("proxySupport.stat.assignSub"),
      color: "success",
    },
    {
      label: t("proxySupport.stat.noModels"),
      value: empty.length,
      sub: empty.length
        ? empty.map((p) => p.proxyCode).join(", ")
        : t("proxySupport.stat.allBound"),
      color: empty.length ? "warning" : undefined,
    },
  ];
});

const typeColor = (rt: string) => (rt === "API" ? "primary" : "success");

function howText(p: DestinationInfoResponse) {
  if (p.registerType !== "API") return t("proxySupport.how.assign");
  return p.canRemove
    ? t("proxySupport.how.apiRemove")
    : t("proxySupport.how.apiNoRemove");
}

// Matrix rows: every distinct model, unless the search targets models only
const allModels = computed(() => {
  const map = new Map<number, Models>();
  items.value.forEach((p) =>
    (p.models ?? []).forEach((m) => map.set(m.gpsModelCode, m)),
  );
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
});
const matrixRows = computed(() => {
  const proxyHit = list.value.some((p) =>
    p.proxyCode.toUpperCase().includes(query.value),
  );
  const models =
    !query.value || proxyHit
      ? allModels.value
      : allModels.value.filter(hitModel);
  return models.map((m) => {
    const cells = list.value.map((p) => ({
      code: p.proxyCode,
      ok: (p.models ?? []).some((x) => x.gpsModelCode === m.gpsModelCode),
    }));
    return { ...m, cells, total: cells.filter((c) => c.ok).length };
  });
});
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <p class="text-medium-emphasis mb-0">{{ t("proxySupport.subtitle") }}</p>

    <div class="stats">
      <v-card v-for="s in stats" :key="s.label" class="stat">
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis">{{ s.label }}</div>
          <div
            class="text-h5 font-weight-bold tabular"
            :class="s.color ? `text-${s.color}` : ''"
          >
            {{ s.value }}
          </div>
          <div class="text-caption text-medium-emphasis">{{ s.sub }}</div>
        </v-card-text>
      </v-card>
    </div>

    <div class="d-flex flex-wrap ga-3 align-center justify-space-between">
      <div class="d-flex flex-wrap ga-3 align-center">
        <v-btn-toggle
          v-model="view"
          mandatory
          class="segmented"
          :aria-label="t('proxySupport.view')"
        >
          <v-btn value="proxy" variant="text">{{
            t("proxySupport.byProxy")
          }}</v-btn>
          <v-btn value="matrix" variant="text">{{
            t("proxySupport.byMatrix")
          }}</v-btn>
        </v-btn-toggle>
        <v-btn-toggle
          v-model="type"
          mandatory
          class="segmented"
          :aria-label="t('col.registerType')"
        >
          <v-btn value="ALL" variant="text">{{ t("master.filter.all") }}</v-btn>
          <v-btn value="API" variant="text">API</v-btn>
          <v-btn value="ASSIGN" variant="text">ASSIGN</v-btn>
        </v-btn-toggle>
      </div>
      <v-text-field
        v-model="q"
        :placeholder="t('proxySupport.search')"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        clearable
        hide-details
        class="search"
      />
    </div>

    <v-alert v-if="error" type="error" variant="tonal" density="compact">{{
      error
    }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" />

    <template v-if="list.length">
      <!-- Cards: one per proxy -->
      <div v-if="view === 'proxy'" class="cards">
        <v-card
          v-for="p in list"
          :key="p.proxyCode"
          :class="['proxy-card', { 'proxy-card--empty': !p.models?.length }]"
        >
          <v-card-text class="d-flex flex-column ga-3">
            <div class="d-flex justify-space-between align-start ga-2">
              <div>
                <h2 class="text-h6 font-weight-bold font-mono">
                  {{ p.proxyCode }}
                </h2>
                <div class="text-body-2 text-medium-emphasis">
                  {{
                    t("proxySupport.summary", {
                      lines: p.sendLines,
                      count: p.modelCount,
                    })
                  }}
                </div>
              </div>
              <div class="d-flex flex-wrap ga-1 justify-end">
                <v-chip
                  size="small"
                  :color="typeColor(p.registerType)"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  {{ p.registerType }}
                </v-chip>
                <v-chip
                  v-if="p.canRemove"
                  size="small"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  {{ t("proxySupport.removeApi") }}
                </v-chip>
              </div>
            </div>

            <div v-if="p.models?.length" class="d-flex flex-wrap ga-2">
              <v-chip
                v-for="m in p.models"
                :key="m.gpsModelCode"
                v-tooltip="`${m.gpsModelCode}`"
                label
                size="small"
                :variant="query && hitModel(m) ? 'tonal' : 'outlined'"
                :color="query && hitModel(m) ? 'primary' : undefined"
              >
                {{ m.name }}
                <span
                  class="text-caption text-medium-emphasis font-mono ms-1"
                  >{{ m.categoryId }}</span
                >
              </v-chip>
            </div>
            <v-alert
              v-else
              type="warning"
              variant="tonal"
              density="compact"
              :icon="false"
              class="text-body-2"
            >
              {{ t("proxySupport.noModels") }}
            </v-alert>

            <div class="text-caption text-medium-emphasis how">
              {{ howText(p) }}
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Matrix: GPS model × proxy -->
      <template v-else>
        <v-card>
          <v-table density="comfortable" class="matrix">
            <thead>
              <tr>
                <th class="sticky">{{ t("col.gpsModel") }}</th>
                <th
                  v-for="p in list"
                  :key="p.proxyCode"
                  class="text-center font-mono"
                >
                  {{ p.proxyCode }}
                  <div :class="`text-${typeColor(p.registerType)} type-label`">
                    {{ p.registerType }}
                  </div>
                </th>
                <th class="text-center">{{ t("proxySupport.total") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in matrixRows" :key="r.gpsModelCode">
                <td class="sticky text-no-wrap">
                  <span class="font-weight-bold">{{ r.name }}</span>
                  <span
                    class="text-caption text-medium-emphasis font-mono ms-1"
                  >
                    {{ r.categoryId }} · {{ r.gpsModelCode }}
                  </span>
                </td>
                <td
                  v-for="c in r.cells"
                  :key="c.code"
                  :class="[
                    'text-center font-weight-bold',
                    c.ok ? 'cell-ok' : 'cell-no',
                  ]"
                  :aria-label="`${c.code} ${c.ok ? t('proxySupport.supported') : t('proxySupport.notSupported')}`"
                >
                  {{ c.ok ? "✓" : "–" }}
                </td>
                <td class="text-center tabular text-medium-emphasis">
                  {{ r.total }}/{{ list.length }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ t("proxySupport.legend") }}
        </p>
      </template>
    </template>

    <v-card v-else-if="!loading">
      <v-card-text class="text-center pa-8 text-medium-emphasis">
        {{
          query ? t("proxySupport.noResult", { q }) : t("proxySupport.noData")
        }}
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 12px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.proxy-card--empty {
  border-color: rgb(var(--v-theme-warning));
}
.how {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 8px;
}
.search {
  flex: 0 1 300px;
}
.tabular {
  font-variant-numeric: tabular-nums;
}
.type-label {
  font-size: 10px;
  font-weight: 600;
  font-family: inherit;
}
.matrix .sticky {
  position: sticky;
  left: 0;
  z-index: 1;
  min-width: 200px;
  background: rgb(var(--v-theme-surface));
}
.cell-ok {
  color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.08);
}
.cell-no {
  opacity: 0.35;
}

/* Segmented toggle: grey track, selected option as a white pill (same as MasterView) */
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
</style>
