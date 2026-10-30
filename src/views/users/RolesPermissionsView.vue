<script setup lang="ts">
import { menu, type Action } from '@/config/menu'
import { ROLES } from '@/config/roles'

const ACTIONS: Action[] = ['export', 'add', 'update', 'delete', 'duplicate']

// Read-only matrix generated from src/config/menu.ts
</script>

<template>
  <v-card>
    <v-table density="compact" fixed-header>
      <thead>
        <tr>
          <th>Menu</th>
          <th v-for="role in ROLES" :key="role" class="text-center">{{ role }}</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="group in menu" :key="group.title">
          <tr class="bg-surface-variant">
            <td :colspan="ROLES.length + 1" class="font-weight-bold">
              <v-icon :icon="group.icon" size="small" class="mr-2" />{{ group.title }}
            </td>
          </tr>
          <tr v-for="item in group.items" :key="item.name">
            <td class="pl-10">{{ item.title }}</td>
            <td v-for="role in ROLES" :key="role" class="text-center">
              <template v-if="item.roles.includes(role)">
                <v-chip size="x-small" color="success" class="ma-1">view</v-chip>
                <template v-for="action in ACTIONS" :key="action">
                  <v-chip v-if="item.permissions?.[action]?.includes(role)" size="x-small" color="primary" class="ma-1">
                    {{ action }}
                  </v-chip>
                </template>
              </template>
              <v-icon v-else icon="mdi-minus" size="small" color="disabled" />
            </td>
          </tr>
        </template>
      </tbody>
    </v-table>
  </v-card>
</template>
