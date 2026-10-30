<script setup lang="ts" generic="T extends Record<string, any>">
import { computed, ref, useSlots } from 'vue'
import { usePermission } from '@/composables/usePermission'
import { downloadCsv } from '@/utils/format'

const props = defineProps<{
  headers: { title: string; key: string; sortable?: boolean }[]
  items: T[]
  loading?: boolean
  error?: string
  /** Label of the load button; hidden when not set. */
  searchText?: string
}>()

const emit = defineEmits<{
  search: []
  add: []
  edit: [item: T]
  duplicate: [item: T]
  delete: [item: T]
}>()

const slots = useSlots()
const { can, item: menuItem } = usePermission()
const filter = ref('')

const rowActions = computed(() => can('update') || can('duplicate') || can('delete'))
const allHeaders = computed(() =>
  rowActions.value ? [...props.headers, { title: 'Actions', key: 'actions', sortable: false }] : props.headers,
)
// Pass item.* / header.* slots through to v-data-table
const passSlots = computed(() =>
  Object.keys(slots).filter((n) => n.startsWith('item.') || n.startsWith('header.') || n === 'expanded-row'),
)

function exportCsv() {
  const date = new Date().toISOString().slice(0, 10)
  downloadCsv(`${menuItem.value?.name ?? 'export'}-${date}.csv`, props.headers, props.items)
}
</script>

<template>
  <v-card>
    <v-card-text>
      <v-row dense align="center">
        <slot name="filters" />
        <v-col v-if="searchText" cols="auto">
          <v-btn color="primary" prepend-icon="mdi-magnify" :loading="loading" @click="emit('search')">
            {{ searchText }}
          </v-btn>
        </v-col>
        <v-spacer />
        <v-col cols="12" md="3">
          <v-text-field
            v-model="filter"
            label="Filter"
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
            variant="tonal"
            prepend-icon="mdi-file-export"
            :disabled="!items.length"
            @click="exportCsv"
          >
            Export
          </v-btn>
          <v-btn v-if="can('add')" color="primary" prepend-icon="mdi-plus" @click="emit('add')">Add</v-btn>
        </v-col>
      </v-row>
      <div v-if="menuItem?.retention" class="text-caption text-medium-emphasis mt-1">
        Data retention: {{ menuItem.retention }}
      </div>
      <slot name="alerts" />
      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3">{{ error }}</v-alert>
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
      <template #item.actions="{ item }">
        <v-btn v-if="can('update')" icon="mdi-pencil" size="small" variant="text" @click="emit('edit', item)" />
        <v-btn v-if="can('duplicate')" icon="mdi-content-copy" size="small" variant="text" @click="emit('duplicate', item)" />
        <v-btn v-if="can('delete')" icon="mdi-delete" size="small" variant="text" color="error" @click="emit('delete', item)" />
      </template>
    </v-data-table>
  </v-card>
</template>
