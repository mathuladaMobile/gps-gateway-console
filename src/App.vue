<script setup lang="ts">
import { watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useNotify } from '@/composables/useNotify'
import { tr } from '@/i18n'

const { state } = useNotify()
const { locale } = useI18n()
const route = useRoute()

// Follow the current language and page
watchEffect(() => {
  document.documentElement.lang = locale.value
  const title = route.meta.title as string | undefined
  document.title = title ? `${tr(title)} | GPS Gateway Console` : 'GPS Gateway Console'
})
</script>

<template>
  <v-app>
    <router-view />
    <v-snackbar v-model="state.show" :color="state.color" timeout="4000" location="top right">
      {{ state.text }}
    </v-snackbar>
  </v-app>
</template>
