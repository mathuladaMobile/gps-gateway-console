import { createI18n } from 'vue-i18n'
import { en as vuetifyEn, th as vuetifyTh } from 'vuetify/locale'
import en from './en'
import th from './th'

export const LOCALES = [
  { value: 'th', title: 'ไทย' },
  { value: 'en', title: 'English' },
] as const
export type Locale = (typeof LOCALES)[number]['value']

const STORAGE_KEY = 'gps-console-locale'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'th' || saved === 'en') return saved
  } catch {
    // storage unavailable
  }
  return navigator.language.toLowerCase().startsWith('th') ? 'th' : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'en',
  // $vuetify holds Vuetify's own texts (no data, rows per page, ...)
  messages: {
    en: { ...en, $vuetify: vuetifyEn },
    th: { ...th, $vuetify: vuetifyTh },
  },
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // storage unavailable
  }
}

/** Translate a key, or return it unchanged when it isn't one (e.g. column titles built from API fields). */
export function tr(key: string) {
  return i18n.global.te(key) ? i18n.global.t(key) : key
}
