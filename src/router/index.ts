import { createRouter, createWebHistory } from 'vue-router'
import { menu } from '@/config/menu'
import type { Role } from '@/config/roles'
import { useAuthStore } from '@/stores/auth'
import { useTabsStore } from '@/stores/tabs'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { public: true, title: 'login.title' },
    },
    {
      path: '/',
      component: DefaultLayout,
      redirect: '/dashboard',
      children: [
        ...menu.flatMap((group) =>
          group.items.map((item) => ({
            path: item.path,
            name: item.name,
            component: item.component,
            // title and group are i18n keys
            meta: { title: `menu.${item.name}`, group: `group.${group.id}`, roles: item.roles, menu: item },
          })),
        ),
        {
          path: '/forbidden',
          name: 'forbidden',
          component: () => import('@/views/ForbiddenView.vue'),
          meta: { title: 'forbidden.pageTitle' },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) return auth.isAuthenticated && to.name === 'login' ? '/dashboard' : true
  if (!auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
  const roles = to.meta.roles as Role[] | undefined
  if (roles && !auth.hasRole(roles)) return { name: 'forbidden' }
  return true
})

router.afterEach((to, _from, failure) => {
  if (!failure) useTabsStore().open(to)
})

export default router
