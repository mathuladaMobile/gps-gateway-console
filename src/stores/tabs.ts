import { defineStore } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

export interface PageTab {
  name: string
  title: string
  fullPath: string
}

const STORAGE_KEY = 'gps-console-tabs'
export const HOME_PATH = '/dashboard'

function loadTabs(): PageTab[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

/** Open page tabs; each route name is one tab and one keep-alive cache entry. */
export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<PageTab[]>(loadTabs())
  const reloading = ref(new Set<string>())
  const versions = ref<Record<string, number>>({})

  /** Names kept alive by <keep-alive :include>; removing a name drops its cached page. */
  const cachedNames = computed(() => tabs.value.map((t) => t.name).filter((n) => !reloading.value.has(n)))

  watch(tabs, (v) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v))
    } catch {
      // storage unavailable
    }
  }, { deep: true })

  function open(route: RouteLocationNormalizedLoaded) {
    if (!route.meta.menu || typeof route.name !== 'string') return
    const tab = tabs.value.find((t) => t.name === route.name)
    if (tab) tab.fullPath = route.fullPath
    else tabs.value.push({ name: route.name, title: route.meta.title as string, fullPath: route.fullPath })
  }

  /** Close a tab; returns the path to navigate to when it was the active one. */
  function close(name: string, activeName?: string): string | undefined {
    const i = tabs.value.findIndex((t) => t.name === name)
    if (i < 0) return
    tabs.value.splice(i, 1)
    if (name !== activeName) return
    return (tabs.value[i] ?? tabs.value[i - 1])?.fullPath ?? HOME_PATH
  }

  function closeOthers(name: string) {
    tabs.value = tabs.value.filter((t) => t.name === name)
  }

  function closeAll() {
    tabs.value = []
  }

  /** Re-create the page component (fresh state) without closing the tab. */
  async function reload(name: string) {
    reloading.value.add(name)
    versions.value[name] = (versions.value[name] ?? 0) + 1
    await nextTick()
    reloading.value.delete(name)
  }

  const viewKey = (name: string) => `${name}#${versions.value[name] ?? 0}`

  return { tabs, cachedNames, open, close, closeOthers, closeAll, reload, viewKey }
})
