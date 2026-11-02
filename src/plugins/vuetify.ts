import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: { colors: { primary: '#1565C0', secondary: '#00897B' } },
      dark: { colors: { primary: '#64B5F6', secondary: '#4DB6AC' } },
    },
  },
  defaults: {
    VBtn: { variant: 'tonal' },
    VCard: { rounded: 'lg' },
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VSelect: { variant: 'outlined', density: 'comfortable' },
  },
})
