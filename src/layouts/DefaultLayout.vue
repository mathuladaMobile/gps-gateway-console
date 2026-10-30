<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { menu } from '@/config/menu'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const theme = useTheme()
const drawer = ref(true)
const rail = ref(false)

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
    <v-list density="compact" nav>
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
    <v-btn icon="mdi-dock-left" variant="text" class="d-none d-md-flex" @click="rail = !rail" />
    <v-app-bar-title>{{ $route.meta.title }}</v-app-bar-title>
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
  </v-app-bar>

  <v-main>
    <v-container fluid class="pa-6">
      <router-view />
    </v-container>
  </v-main>
</template>
