<script setup lang="ts">
const from = defineModel<string>('from', { required: true })
const to = defineModel<string>('to', { required: true })
defineProps<{ min?: string }>()
</script>

<template>
  <v-col cols="6" md="2">
    <v-text-field v-model="from" type="datetime-local" label="From" density="compact" hide-details :min="min" />
  </v-col>
  <v-col cols="6" md="2">
    <v-text-field v-model="to" type="datetime-local" label="To" density="compact" hide-details :min="from" />
  </v-col>
</template>
