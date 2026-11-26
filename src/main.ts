import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { setPasswordChangeRequiredHandler, setUnauthorizedHandler } from './api'
import { i18n } from './i18n'
import { useAuthStore } from './stores/auth'

const app = createApp(App).use(createPinia()).use(i18n).use(router).use(vuetify)

// Session expired and refresh failed -> back to login
setUnauthorizedHandler(() => {
  useAuthStore().logout()
  if (router.currentRoute.value.name !== 'login') {
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
  }
})

// API says the password must be changed first (e.g. first login) -> change-password page
setPasswordChangeRequiredHandler(() => {
  if (router.currentRoute.value.path !== '/account/change-password') {
    router.push('/account/change-password')
  }
})

app.mount('#app')
