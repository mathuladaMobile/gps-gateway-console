<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  /** Ask for the current password (self-service) instead of a username (admin). */
  requireCurrent?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { username: string; currentPassword: string; newPassword: string }, reset: () => void]
}>()

const { t } = useI18n()
const form = ref<{ reset: () => void }>()
const username = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const required = (v: string) => !!v || t('common.required')
const minLength = (v: string) => (v?.length ?? 0) >= 8 || t('password.minLength', { n: 8 })
const matches = (v: string) => v === newPassword.value || t('password.mismatch')

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
        <v-text-field v-if="!requireCurrent" v-model="username" :label="t('password.username')" :rules="[required]" />
        <v-text-field
          v-if="requireCurrent"
          v-model="currentPassword"
          type="password"
          :label="t('password.current')"
          :rules="[required]"
        />
        <v-text-field v-model="newPassword" type="password" :label="t('password.new')" :rules="[required, minLength]" />
        <v-text-field v-model="confirmPassword" type="password" :label="t('password.confirm')" :rules="[required, matches]" />
        <v-btn type="submit" color="primary" :loading="loading">{{ t('common.save') }}</v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>
