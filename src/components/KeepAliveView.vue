<script setup lang="ts">
import { defineComponent, markRaw, type Component } from 'vue'
import { useTabsStore } from '@/stores/tabs'

const tabs = useTabsStore()

// <keep-alive :include> matches component names, so wrap each page in a
// component named after its route; closing a tab then drops its cache.
const wrappers = new Map<string, Component>()
function wrapperFor(name: string) {
  let c = wrappers.get(name)
  if (!c) {
    c = markRaw(defineComponent({ name, setup: (_, { slots }) => () => slots.default?.() }))
    wrappers.set(name, c)
  }
  return c
}
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <keep-alive :include="tabs.cachedNames">
      <component
        :is="wrapperFor(String(route.name))"
        v-if="Component"
        :key="tabs.viewKey(String(route.name))"
      >
        <component :is="Component" />
      </component>
    </keep-alive>
  </router-view>
</template>
