<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  /** Ask for the current password (self-service) instead of a username (admin). */
  requireCurrent?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { username: string; currentPassword: string; newPassword: string }, reset: () => void]
}>()

const form = ref<{ reset: () => void }>()
const username = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const required = (v: string) => !!v || 'Required'
const minLength = (v: string) => (v?.length ?? 0) >= 8 || 'At least 8 characters'
const matches = (v: string) => v === newPassword.value || 'Passwords do not match'

async function submit(e: Promise<{ valid: boolean }>) {
  if (!(await e).valid) return
  emit(
    'submit',
    { username: username.value, currentPassword: props.requireCurrent ? currentPassword.value : '', newPassword: newPassword.value },
    () => form.value?.reset(),
  )
}
</script>

<template>
  <v-card max-width="560">
    <v-card-text>
      <v-form ref="form" @submit.prevent="submit">
        <v-text-field v-if="!requireCurrent" v-model="username" label="Username" :rules="[required]" />
        <v-text-field
          v-if="requireCurrent"
          v-model="currentPassword"
          type="password"
          label="Current Password"
          :rules="[required]"
        />
        <v-text-field v-model="newPassword" type="password" label="New Password" :rules="[required, minLength]" />
        <v-text-field v-model="confirmPassword" type="password" label="Confirm Password" :rules="[required, matches]" />
        <v-btn type="submit" color="primary" :loading="loading">Save</v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>
