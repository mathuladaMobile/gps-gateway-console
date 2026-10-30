<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { categoryApi, type CategoryResponse } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import { useLoader } from '@/composables/useLoader'

const headers = [
  { title: 'Category ID', key: 'categoryId' },
  { title: 'Category Name', key: 'categoryName' },
  { title: 'Chunk Size', key: 'chunk_size' },
  { title: 'Limit Location', key: 'limit_location' },
  { title: 'Max Back', key: 'maxback' },
  { title: 'Safety Time', key: 'safety_time' },
  { title: 'Updated At', key: 'updatedAt' },
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
  <DataTablePage :headers="headers" :items="items" :loading="loading" :error="error" search-text="Refresh" @search="load" />
</template>
