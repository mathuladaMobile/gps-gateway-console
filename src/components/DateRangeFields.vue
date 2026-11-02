<script setup lang="ts">
import DateTimePicker from "@/components/DateTimePicker.vue";

const from = defineModel<string>("from", { required: true });
const to = defineModel<string>("to", { required: true });
defineProps<{ min?: string; max?: string }>();
</script>

<template>
  <v-col cols="6" md="2">
    <DateTimePicker
      v-model="from"
      :label="$t('common.from')"
      :min="min"
      :max="max"
    />
  </v-col>
  <v-col cols="6" md="2">
    <DateTimePicker
      v-model="to"
      :label="$t('common.to')"
      :min="from"
      :max="max"
    />
  </v-col>
</template>
