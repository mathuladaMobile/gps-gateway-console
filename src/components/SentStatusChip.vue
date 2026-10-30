<script setup lang="ts">
defineProps<{ status?: number | null }>()
</script>

<template>
  <v-chip v-if="status != null" size="small" :color="status >= 200 && status < 300 ? 'success' : 'error'">
    {{ status }}
  </v-chip>
  <span v-else>-</span>
</template>
