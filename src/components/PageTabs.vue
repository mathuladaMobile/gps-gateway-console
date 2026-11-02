<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HOME_PATH, useTabsStore, type PageTab } from '@/stores/tabs'

const route = useRoute()
const router = useRouter()
const tabs = useTabsStore()

// Right-click menu
const menu = ref(false)
const menuTab = ref<PageTab>()
const menuTarget = ref<[number, number]>([0, 0])

function openMenu(e: MouseEvent, tab: PageTab) {
  menuTab.value = tab
  menuTarget.value = [e.clientX, e.clientY]
  menu.value = true
}

function close(tab: PageTab) {
  const next = tabs.close(tab.name, route.name as string)
  if (next) router.push(next)
}

function closeOthers(tab: PageTab) {
  tabs.closeOthers(tab.name)
  if (route.name !== tab.name) router.push(tab.fullPath)
}

function closeAll() {
  tabs.closeAll()
  router.push(HOME_PATH)
}
</script>

<template>
  <v-tabs
    :model-value="route.name"
    density="compact"
    color="primary"
    show-arrows
    class="page-tabs border-b"
  >
    <v-tab
      v-for="tab in tabs.tabs"
      :key="tab.name"
      :value="tab.name"
      :to="tab.fullPath"
      class="text-none"
      @auxclick.middle.prevent="close(tab)"
      @contextmenu.prevent="openMenu($event, tab)"
    >
      {{ tab.title }}
      <v-btn
        icon="mdi-close"
        size="x-small"
        variant="text"
        density="comfortable"
        class="ml-2"
        @click.stop.prevent="close(tab)"
      />
    </v-tab>
  </v-tabs>

  <v-menu v-model="menu" :target="menuTarget" location="bottom start">
    <v-list v-if="menuTab" density="compact">
      <v-list-item prepend-icon="mdi-refresh" title="Reload" @click="tabs.reload(menuTab.name)" />
      <v-list-item prepend-icon="mdi-close" title="Close" @click="close(menuTab)" />
      <v-list-item prepend-icon="mdi-close-box-multiple-outline" title="Close Others" @click="closeOthers(menuTab)" />
      <v-list-item prepend-icon="mdi-close-circle-multiple-outline" title="Close All" @click="closeAll" />
    </v-list>
  </v-menu>
</template>

<style scoped>
.page-tabs :deep(.v-tab) {
  min-width: 160px;
  justify-content: space-between;
}
</style>
