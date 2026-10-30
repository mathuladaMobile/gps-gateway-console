import { createRouter, createWebHistory } from 'vue-router'
import { menuItems } from '@/config/menu'
import type { Role } from '@/config/roles'
import { useAuthStore } from '@/stores/auth'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { public: true, title: 'Login' },
    },
    {
      path: '/',
      component: DefaultLayout,
      redirect: '/dashboard',
      children: [
        ...menuItems.map((item) => ({
          path: item.path,
          name: item.name,
          component: item.component,
          meta: { title: item.title, roles: item.roles, menu: item },
        })),
        {
          path: '/forbidden',
          name: 'forbidden',
          component: () => import('@/views/ForbiddenView.vue'),
          meta: { title: 'Forbidden' },
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

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | GPS Gateway Console` : 'GPS Gateway Console'
})

export default router
