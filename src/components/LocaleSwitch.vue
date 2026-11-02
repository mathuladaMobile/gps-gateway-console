<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LOCALES, setLocale } from '@/i18n'

const { locale, t } = useI18n()
</script>

<template>
  <v-menu>
    <template #activator="{ props }">
      <v-btn v-bind="props" v-tooltip="t('layout.language')" variant="text" prepend-icon="mdi-translate">
        {{ locale.toUpperCase() }}
      </v-btn>
    </template>
    <v-list density="compact" :selected="[locale]" color="primary">
      <v-list-item v-for="l in LOCALES" :key="l.value" :value="l.value" :title="l.title" @click="setLocale(l.value)" />
    </v-list>
  </v-menu>
</template>
