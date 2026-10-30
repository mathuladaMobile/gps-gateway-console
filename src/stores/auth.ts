import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api'
import { tokenStorage } from '@/api/token'
import { ROLES, type Role } from '@/config/roles'

interface User {
  userId: number
  username: string
  fullName: string
  roles: Role[]
}

const STORAGE_KEY = 'gps-console-user'

function loadUser(): User | null {
  try {
    return tokenStorage.access ? JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(loadUser())
  const isAuthenticated = computed(() => !!user.value)
  const roles = computed(() => user.value?.roles ?? [])
  /** Highest role, for display. */
  const role = computed(() => ROLES.find((r) => roles.value.includes(r)))

  async function login(username: string, password: string) {
    const { data } = await authApi.login(username, password)
    tokenStorage.set(data.access_token, data.refresh_token)
    user.value = {
      userId: data.user_id,
      username: data.username,
      fullName: data.full_name,
      roles: data.roles.map((r) => r.toUpperCase()) as Role[],
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user.value))
  }

  /** Clear local session; pass `remote` to also revoke the refresh token on the server. */
  async function logout(remote = false) {
    const refresh = tokenStorage.refresh
    if (remote && refresh) await authApi.logout(refresh).catch(() => {})
    tokenStorage.clear()
    user.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  function hasRole(allowed: Role[]) {
    return roles.value.some((r) => allowed.includes(r))
  }

  return { user, roles, role, isAuthenticated, login, logout, hasRole }
})
