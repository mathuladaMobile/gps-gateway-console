import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Action, MenuItem } from '@/config/menu'
import { useAuthStore } from '@/stores/auth'

/** Check action permissions for the current page, based on the menu config in route meta. */
export function usePermission() {
  const route = useRoute()
  const auth = useAuthStore()
  const item = computed(() => route.meta.menu as MenuItem | undefined)

  function can(action: Action) {
    const roles = item.value?.permissions?.[action] ?? (action === 'view' ? item.value?.roles : undefined)
    return !!roles && auth.hasRole(roles)
  }

  return { can, item }
}
