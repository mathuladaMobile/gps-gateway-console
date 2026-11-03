<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { providerApi, type CategoryResponse } from "@/api";
import DataTablePage from "@/components/DataTablePage.vue";
import { useLoader } from "@/composables/useLoader";
import { headersFrom } from "@/utils/format";

const providers = ref<CategoryResponse[]>([]);
const categoryId = ref<string>();
// FEL returns DeviceFELite[], FEP returns DeviceFEPro[]
const items = ref<Record<string, unknown>[]>([]);
const headers = computed(() => headersFrom(items.value));
const { loading, error, run } = useLoader();

async function load() {
  if (!categoryId.value) return;
  items.value = ((await run(() => providerApi.devices(categoryId.value!))) ??
    []) as unknown as Record<string, unknown>[];
}

onMounted(async () => {
  providers.value = (await run(providerApi.list)) ?? [];
  categoryId.value = providers.value[0]?.categoryId;
  await load();
});
</script>

<template>
  <DataTablePage
    :headers="headers"
    :items="items"
    :loading="loading"
    :error="error"
    :search-text="$t('common.refresh')"
    @search="load"
  >
    <template #filters>
      <v-col cols="12" md="3">
        <v-select
          v-model="categoryId"
          :items="providers"
          :item-title="
            (p: CategoryResponse) => `${p.categoryName} (${p.categoryId})`
          "
          item-value="categoryId"
          :label="$t('common.provider')"
          density="compact"
          hide-details
          @update:model-value="load"
        />
      </v-col>
    </template>
    <template #item.dltSendData="{ value }">
      <v-icon
        :icon="value ? 'mdi-check' : 'mdi-minus'"
        :color="value ? 'success' : undefined"
      />
    </template>
    <template #item.diwSendData="{ value }">
      <v-icon
        :icon="value ? 'mdi-check' : 'mdi-minus'"
        :color="value ? 'success' : undefined"
      />
    </template>
  </DataTablePage>
</template>
