<script setup lang="ts">
import { authApi } from '@/api'
import PasswordForm from '@/components/PasswordForm.vue'
import { useLoader } from '@/composables/useLoader'
import { useNotify } from '@/composables/useNotify'

const { loading, run } = useLoader()
const notify = useNotify()

async function onSubmit(p: { currentPassword: string; newPassword: string }, reset: () => void) {
  await run(async () => {
    try {
      const res = await authApi.changePassword(p.currentPassword, p.newPassword)
      notify.success(res.message || 'Password changed')
      reset()
    } catch (e) {
      notify.error(e)
    }
  })
}
</script>

<template>
  <PasswordForm require-current :loading="loading" @submit="onSubmit" />
</template>
