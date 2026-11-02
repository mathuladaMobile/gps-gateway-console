<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { systemApi, type HealthResponse } from '@/api'
import { useLoader } from '@/composables/useLoader'

const health = ref<HealthResponse>()
const { loading, error, run } = useLoader()

async function load() {
  health.value = await run(systemApi.health)
}

onMounted(load)
</script>

<template>
  <v-row>
    <v-col cols="12" md="4">
      <v-card :loading="loading">
        <v-card-title class="d-flex align-center">
          GPS Gateway API
          <v-spacer />
          <v-btn icon="mdi-refresh" variant="text" size="small" @click="load" />
        </v-card-title>
        <v-card-text>
          <v-alert v-if="error" type="error" variant="tonal" density="compact">{{ error }}</v-alert>
          <v-list v-else-if="health" density="compact">
            <v-list-item :title="$t('appStatus.status')">
              <template #append>
                <v-chip size="small" :color="health.status === 'running' ? 'success' : 'error'">{{ health.status }}</v-chip>
              </template>
            </v-list-item>
            <v-list-item :title="$t('appStatus.app')" :subtitle="health.app" />
            <v-list-item :title="$t('appStatus.environment')" :subtitle="health.APP_ENV" />
            <v-list-item :title="$t('appStatus.goVersion')" :subtitle="health.go_version" />
          </v-list>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
