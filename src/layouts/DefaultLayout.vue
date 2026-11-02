<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import KeepAliveView from '@/components/KeepAliveView.vue'
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import PageTabs from '@/components/PageTabs.vue'
import { menu } from '@/config/menu'
import { useAuthStore } from '@/stores/auth'
import { useTabsStore } from '@/stores/tabs'

const auth = useAuthStore()
const tabs = useTabsStore()
const router = useRouter()
const route = useRoute()
const theme = useTheme()
const RAIL_KEY = 'gps-console-rail'
const drawer = ref(true)
// Icon-only sidebar by default; remembered per browser
const rail = ref(readRail())

function readRail() {
  try {
    return localStorage.getItem(RAIL_KEY) !== 'false'
  } catch {
    return true
  }
}

watch(rail, (v) => {
  try {
    localStorage.setItem(RAIL_KEY, String(v))
  } catch {
    // storage unavailable
  }
})

// Hide items (and empty groups) the current role cannot access
const visibleMenu = computed(() =>
  menu
    .map((g) => ({ ...g, items: g.items.filter((i) => auth.hasRole(i.roles)) }))
    .filter((g) => g.items.length),
)

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

async function logout() {
  await auth.logout(true)
  tabs.closeAll()
  router.push({ name: 'login' })
}
</script>

<template>
  <v-navigation-drawer v-model="drawer" :rail="rail" width="280">
    <v-list-item
      prepend-icon="mdi-map-marker-radius"
      title="GPS Gateway Console"
      subtitle="v1.0.0"
      class="py-3"
    />
    <v-divider />

    <!-- Rail: one icon per group, pages pop out on hover -->
    <v-list v-if="rail" density="compact" nav>
      <template v-for="group in visibleMenu" :key="group.id">
        <v-list-item
          v-if="group.items.length === 1 && group.id === 'dashboard'"
          v-tooltip:end="$t(`group.${group.id}`)"
          :to="group.items[0].path"
          :prepend-icon="group.icon"
        />
        <v-menu v-else open-on-hover location="end" :close-delay="100">
          <template #activator="{ props }">
            <v-list-item
              v-bind="props"
              :prepend-icon="group.icon"
              :active="group.items.some((i) => i.name === route.name)"
              color="primary"
            />
          </template>
          <v-list density="compact" min-width="220">
            <v-list-subheader>{{ $t(`group.${group.id}`) }}</v-list-subheader>
            <v-list-item
              v-for="item in group.items"
              :key="item.name"
              :to="item.path"
              :title="$t(`menu.${item.name}`)"
              color="primary"
            />
          </v-list>
        </v-menu>
      </template>
    </v-list>

    <v-list v-else density="compact" nav>
      <template v-for="group in visibleMenu" :key="group.id">
        <v-list-item
          v-if="group.items.length === 1 && group.id === 'dashboard'"
          :to="group.items[0].path"
          :prepend-icon="group.icon"
          :title="$t(`group.${group.id}`)"
          color="primary"
        />
        <v-list-group v-else :value="group.id">
          <template #activator="{ props }">
            <v-list-item v-bind="props" :prepend-icon="group.icon" :title="$t(`group.${group.id}`)" />
          </template>
          <v-list-item
            v-for="item in group.items"
            :key="item.name"
            :to="item.path"
            :title="$t(`menu.${item.name}`)"
            color="primary"
          />
        </v-list-group>
      </template>
    </v-list>
  </v-navigation-drawer>

  <v-app-bar flat border="b">
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-btn
      v-tooltip="$t(rail ? 'layout.expandMenu' : 'layout.minimizeMenu')"
      :icon="rail ? 'mdi-chevron-double-right' : 'mdi-chevron-double-left'"
      variant="text"
      class="d-none d-md-flex"
      @click="rail = !rail"
    />
    <v-app-bar-title class="text-uppercase text-body-1">{{ $route.meta.group ? $t(String($route.meta.group)) : '' }}</v-app-bar-title>
    <v-spacer />
    <LocaleSwitch />
    <v-btn v-tooltip="$t('layout.toggleTheme')" icon="mdi-theme-light-dark" variant="text" @click="toggleTheme" />
    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="text" prepend-icon="mdi-account-circle">
          {{ auth.user?.fullName || auth.user?.username }}
          <v-chip size="x-small" class="ml-2" color="primary">{{ auth.role }}</v-chip>
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item to="/account/change-password" prepend-icon="mdi-lock-reset" :title="$t('menu.account-change-password')" />
        <v-list-item prepend-icon="mdi-logout" :title="$t('layout.logout')" @click="logout" />
      </v-list>
    </v-menu>
    <template v-if="tabs.tabs.length" #extension>
      <PageTabs />
    </template>
  </v-app-bar>

  <v-main>
    <v-container fluid class="pa-6">
      <template v-if="$route.meta.menu">
        <div class="text-body-2 text-medium-emphasis">{{ $t(String($route.meta.group)) }} / {{ $t(String($route.meta.title)) }}</div>
        <h1 class="page-title mt-1 mb-5">{{ $t(String($route.meta.title)) }}</h1>
      </template>
      <KeepAliveView />
    </v-container>
  </v-main>
</template>
