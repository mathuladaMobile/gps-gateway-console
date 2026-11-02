<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { categoryApi, type CategoryResponse } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import { useLoader } from '@/composables/useLoader'

const headers = [
  { title: 'col.categoryId', key: 'categoryId' },
  { title: 'col.categoryName', key: 'categoryName' },
  { title: 'col.chunkSize', key: 'chunk_size' },
  { title: 'col.limitLocation', key: 'limit_location' },
  { title: 'col.maxBack', key: 'maxback' },
  { title: 'col.safetyTime', key: 'safety_time' },
  { title: 'col.updatedAt', key: 'updatedAt' },
]

const categories = ref<CategoryResponse[]>([])
const items = computed(() => categories.value.map(({ config, ...c }) => ({ ...c, ...config })))
const { loading, error, run } = useLoader()

async function load() {
  categories.value = (await run(categoryApi.list)) ?? []
}

onMounted(load)
</script>

<template>
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" :search-text="$t('common.refresh')" @search="load" />
</template>
