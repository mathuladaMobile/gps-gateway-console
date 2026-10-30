<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')
const required = (v: string) => !!v || 'Required'

async function submit(e: Promise<{ valid: boolean }>) {
  if (!(await e).valid) return
  loading.value = true
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    router.push((route.query.redirect as string) || '/dashboard')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-main class="d-flex align-center justify-center bg-grey-lighten-4">
    <v-card width="400" class="pa-6" elevation="4">
      <div class="text-center mb-6">
        <v-icon icon="mdi-map-marker-radius" size="48" color="primary" />
        <div class="text-h5 mt-2">GPS Gateway Console</div>
        <div class="text-medium-emphasis">Sign in to continue</div>
      </div>
      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>
      <v-form @submit.prevent="submit">
        <v-text-field v-model="username" label="Username" prepend-inner-icon="mdi-account" :rules="[required]" />
        <v-text-field
          v-model="password"
          label="Password"
          prepend-inner-icon="mdi-lock"
          :type="showPassword ? 'text' : 'password'"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          :rules="[required]"
          @click:append-inner="showPassword = !showPassword"
        />
        <v-btn type="submit" color="primary" block size="large" :loading="loading">Login</v-btn>
      </v-form>
    </v-card>
  </v-main>
</template>
