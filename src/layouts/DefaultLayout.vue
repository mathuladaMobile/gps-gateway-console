<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import KeepAliveView from '@/components/KeepAliveView.vue'
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
      <template v-for="group in visibleMenu" :key="group.title">
        <v-list-item
          v-if="group.items.length === 1 && group.title === 'Dashboard'"
          v-tooltip:end="group.title"
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
            <v-list-subheader>{{ group.title }}</v-list-subheader>
            <v-list-item
              v-for="item in group.items"
              :key="item.name"
              :to="item.path"
              :title="item.title"
              color="primary"
            />
          </v-list>
        </v-menu>
      </template>
    </v-list>

    <v-list v-else density="compact" nav>
      <template v-for="group in visibleMenu" :key="group.title">
        <v-list-item
          v-if="group.items.length === 1 && group.title === 'Dashboard'"
          :to="group.items[0].path"
          :prepend-icon="group.icon"
          :title="group.title"
        />
        <v-list-group v-else :value="group.title">
          <template #activator="{ props }">
            <v-list-item v-bind="props" :prepend-icon="group.icon" :title="group.title" />
          </template>
          <v-list-item
            v-for="item in group.items"
            :key="item.name"
            :to="item.path"
            :title="item.title"
          />
        </v-list-group>
      </template>
    </v-list>
  </v-navigation-drawer>

  <v-app-bar flat border="b">
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-btn
      v-tooltip="rail ? 'Expand menu' : 'Minimize menu'"
      :icon="rail ? 'mdi-chevron-double-right' : 'mdi-chevron-double-left'"
      variant="text"
      class="d-none d-md-flex"
      @click="rail = !rail"
    />
    <v-app-bar-title class="text-uppercase text-body-1">{{ $route.meta.group }}</v-app-bar-title>
    <v-spacer />
    <v-btn icon="mdi-theme-light-dark" variant="text" @click="toggleTheme" />
    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="text" prepend-icon="mdi-account-circle">
          {{ auth.user?.fullName || auth.user?.username }}
          <v-chip size="x-small" class="ml-2" color="primary">{{ auth.role }}</v-chip>
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item to="/account/change-password" prepend-icon="mdi-lock-reset" title="Change Password" />
        <v-list-item prepend-icon="mdi-logout" title="Logout" @click="logout" />
      </v-list>
    </v-menu>
    <template v-if="tabs.tabs.length" #extension>
      <PageTabs />
    </template>
  </v-app-bar>

  <v-main>
    <v-container fluid class="pa-6">
      <h1 v-if="$route.meta.menu" class="text-h6 font-weight-bold mb-4">{{ $route.meta.title }}</h1>
      <KeepAliveView />
    </v-container>
  </v-main>
</template>
