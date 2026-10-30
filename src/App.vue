<script setup lang="ts">
import { useNotify } from '@/composables/useNotify'

const { state } = useNotify()
</script>

<template>
  <v-app>
    <router-view />
    <v-snackbar v-model="state.show" :color="state.color" timeout="4000" location="top right">
      {{ state.text }}
    </v-snackbar>
  </v-app>
</template>
