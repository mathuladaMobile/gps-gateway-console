<script setup lang="ts" generic="T extends Record<string, any>">
import dayjs from "dayjs";
import { computed, ref, useSlots } from "vue";
import { useI18n } from "vue-i18n";
import { usePermission } from "@/composables/usePermission";
import { tr } from "@/i18n";
import { downloadCsv, formatDateTime, isDateKey } from "@/utils/format";

const props = defineProps<{
  /** `title` may be an i18n key (e.g. `col.serialNo`); other titles are shown as is */
  headers: { title: string; key: string; sortable?: boolean }[];
  items: T[];
  loading?: boolean;
  error?: string;
  /** Label of the load button; hidden when not set. */
  searchText?: string;
}>();

const emit = defineEmits<{
  search: [];
  add: [];
  edit: [item: T];
  duplicate: [item: T];
  delete: [item: T];
}>();

const slots = useSlots();
const { can, item: menuItem } = usePermission();
const { t } = useI18n();
const filter = ref("");

const headers = computed(() =>
  props.headers.map((h) => ({ ...h, title: tr(h.title) })),
);

const rowActions = computed(
  () => can("update") || can("duplicate") || can("delete"),
);
const allHeaders = computed(() =>
  rowActions.value
    ? [
        ...headers.value,
        { title: t("common.actions"), key: "actions", sortable: false, align: "end" as const },
      ]
    : headers.value,
);
// Pass item.* / header.* slots through to v-data-table
const passSlots = computed(() =>
  Object.keys(slots).filter(
    (n) =>
      n.startsWith("item.") || n.startsWith("header.") || n === "expanded-row",
  ),
);
// Date/time columns without a custom slot are formatted with dayjs
const dateSlots = computed(() =>
  props.headers
    .map((h) => `item.${h.key}`)
    .filter((n) => isDateKey(n.slice(5)) && !passSlots.value.includes(n)),
);
// Remaining columns without a custom slot show "-" for null values
const plainSlots = computed(() =>
  props.headers
    .map((h) => `item.${h.key}`)
    .filter((n) => !isDateKey(n.slice(5)) && !passSlots.value.includes(n)),
);

function exportCsv() {
  const stamp = dayjs().format("YYYYMMDD-HHmmss");
  downloadCsv(
    `${menuItem.value?.name ?? "export"}-${stamp}.csv`,
    headers.value,
    props.items,
  );
}
</script>

<template>
  <v-card>
    <v-card-text>
      <v-row dense align="center">
        <slot name="filters" />
        <v-col v-if="searchText" cols="auto">
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-magnify"
            :loading="loading"
            @click="emit('search')"
          >
            {{ searchText }}
          </v-btn>
        </v-col>
        <v-spacer />
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filter"
            :label="t('common.filter')"
            prepend-inner-icon="mdi-filter-variant"
            density="compact"
            clearable
            hide-details
          />
        </v-col>
        <v-col cols="auto" class="d-flex ga-2">
          <slot name="toolbar" />
          <v-btn
            v-if="can('export')"
            variant="outlined"
            prepend-icon="mdi-download"
            :disabled="!items.length"
            @click="exportCsv"
          >
            {{ t("common.export") }}
          </v-btn>
          <v-btn
            v-if="can('add')"
            color="primary"
            variant="flat"
            prepend-icon="mdi-plus"
            @click="emit('add')"
            >{{ t("common.add") }}</v-btn
          >
        </v-col>
      </v-row>
      <div
        v-if="menuItem?.retention"
        class="text-caption text-medium-emphasis mt-1"
      >
        {{ t("common.dataRetention", { retention: menuItem.retention }) }}
      </div>
      <slot name="alerts" />
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-3"
        >{{ error }}</v-alert
      >
    </v-card-text>

    <v-data-table
      :headers="allHeaders"
      :items="items"
      :loading="loading"
      :search="filter"
      density="comfortable"
      hover
    >
      <template v-for="name in passSlots" :key="name" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps ?? {}" />
      </template>
      <template v-for="name in dateSlots" :key="name" #[name]="{ value }">
        <span class="text-no-wrap">{{ formatDateTime(value) ?? "-" }}</span>
      </template>
      <template v-for="name in plainSlots" :key="name" #[name]="{ value }">
        {{ value ?? "-" }}
      </template>
      <template #item.actions="{ item }">
        <div class="d-flex justify-end ga-1">
          <v-btn
            v-if="can('update')"
            v-tooltip="t('common.update')"
            icon="mdi-pencil-outline"
            size="small"
            variant="outlined"
            @click="emit('edit', item)"
          />
          <v-btn
            v-if="can('duplicate')"
            v-tooltip="t('common.duplicate')"
            icon="mdi-content-copy"
            size="small"
            variant="outlined"
            @click="emit('duplicate', item)"
          />
          <v-btn
            v-if="can('delete')"
            v-tooltip="t('common.delete')"
            icon="mdi-delete-outline"
            size="small"
            variant="outlined"
            color="error"
            @click="emit('delete', item)"
          />
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>
