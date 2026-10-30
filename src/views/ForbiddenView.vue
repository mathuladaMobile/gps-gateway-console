<template>
  <v-empty-state
    icon="mdi-shield-lock"
    headline="403"
    title="Access denied"
    text="Your role does not have permission to open this page."
  >
    <template #actions>
      <v-btn color="primary" to="/dashboard">Back to Dashboard</v-btn>
    </template>
  </v-empty-state>
</template>
