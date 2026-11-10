<script setup lang="ts">
defineProps<{ status?: number | null }>()
</script>

<template>
  <!-- 1 = sent -->
  <v-icon v-if="status === 1" icon="mdi-check-circle" color="success" :aria-label="$t('col.sentStatus')" />
  <v-chip v-else-if="status != null" size="small" :color="status >= 200 && status < 300 ? 'success' : 'error'">
    {{ status }}
  </v-chip>
  <span v-else>-</span>
</template>
