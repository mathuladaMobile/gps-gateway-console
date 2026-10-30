<script setup lang="ts">
import { ref } from 'vue'

// TODO: load from API
// 1. Proxy count per platform
const platforms = ref([
  { platform: 'Platform A', count: 0 },
  { platform: 'Platform B', count: 0 },
  { platform: 'Platform C', count: 0 },
])

// 2. Proxy status summary
const statusSummary = ref([
  { title: 'Online', count: 0, color: 'success', icon: 'mdi-check-circle' },
  { title: 'Delayed', count: 0, color: 'warning', icon: 'mdi-clock-alert' },
  { title: 'Offline', count: 0, color: 'error', icon: 'mdi-close-circle' },
])
</script>

<template>
  <v-row>
    <v-col v-for="s in statusSummary" :key="s.title" cols="12" sm="4">
      <v-card>
        <v-card-text class="d-flex align-center">
          <v-avatar :color="s.color" variant="tonal" size="56" class="mr-4">
            <v-icon :icon="s.icon" size="32" />
          </v-avatar>
          <div>
            <div class="text-medium-emphasis">Proxy {{ s.title }}</div>
            <div class="text-h4">{{ s.count }}</div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12">
      <v-card title="Proxy by Platform">
        <v-table>
          <thead>
            <tr>
              <th>Platform</th>
              <th class="text-right">Proxies</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in platforms" :key="p.platform">
              <td>{{ p.platform }}</td>
              <td class="text-right">{{ p.count }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </v-col>
  </v-row>
</template>
