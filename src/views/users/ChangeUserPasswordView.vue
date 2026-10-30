<script setup lang="ts">
import { userApi } from '@/api'
import PasswordForm from '@/components/PasswordForm.vue'
import { useLoader } from '@/composables/useLoader'
import { useNotify } from '@/composables/useNotify'

const { loading, run } = useLoader()
const notify = useNotify()

async function onSubmit(p: { username: string; newPassword: string }, reset: () => void) {
  await run(async () => {
    try {
      const res = await userApi.changePassword(p.username, p.newPassword)
      notify.success(res.message || `Password changed for ${p.username}`)
      reset()
    } catch (e) {
      notify.error(e)
    }
  })
}
</script>

<template>
  <PasswordForm :loading="loading" @submit="onSubmit" />
</template>
