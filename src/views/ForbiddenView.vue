<template>
  <v-empty-state icon="mdi-shield-lock" headline="403" :title="$t('forbidden.title')" :text="$t('forbidden.text')">
    <template #actions>
      <v-btn color="primary" to="/dashboard">{{ $t('forbidden.back') }}</v-btn>
    </template>
  </v-empty-state>
</template>
