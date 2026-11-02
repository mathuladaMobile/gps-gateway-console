<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const required = (v: string) => !!v || t('common.required')

async function submit(e: Promise<{ valid: boolean }>) {
  if (!(await e).valid) return
  loading.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    router.push((route.query.redirect as string) || '/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('login.failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-main class="d-flex align-center justify-center bg-background">
    <div class="locale-switch"><LocaleSwitch /></div>
    <v-card width="400" class="pa-6" elevation="4">
      <div class="text-center mb-6">
        <v-icon icon="mdi-map-marker-radius" size="48" color="primary" />
        <div class="text-h5 mt-2">GPS Gateway Console</div>
        <div class="text-medium-emphasis">{{ t('login.subtitle') }}</div>
      </div>
      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>
      <v-form @submit.prevent="submit">
        <v-text-field v-model="username" :label="t('login.username')" prepend-inner-icon="mdi-account" :rules="[required]" />
        <v-text-field
          v-model="password"
          :label="t('login.password')"
          prepend-inner-icon="mdi-lock"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          :rules="[required]"
          @click:append-inner="showPassword = !showPassword"
        />
        <v-btn type="submit" color="primary" variant="flat" block size="large" :loading="loading">{{ t('login.submit') }}</v-btn>
      </v-form>
    </v-card>
  </v-main>
</template>

<style scoped>
.locale-switch {
  position: absolute;
  top: 16px;
  right: 16px;
}
</style>
