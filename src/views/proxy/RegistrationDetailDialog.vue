<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { pretty } from "./registration";

defineProps<{
  title: string;
  subtitle?: string;
  /** Label / value rows above the JSON blocks */
  fields: { label: string; value: unknown; mono?: boolean; color?: string }[];
  /** JSON blocks, e.g. payload and response */
  blocks: { label: string; value: unknown }[];
}>();
const open = defineModel<boolean>({ default: false });
const { t } = useI18n();

async function copy(v: unknown) {
  try {
    await navigator.clipboard.writeText(pretty(v));
  } catch {
    // clipboard unavailable (insecure context)
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="760" scrollable>
    <v-card>
      <v-card-title class="d-flex align-start ga-2 pt-4">
        <div class="flex-grow-1">
          <div class="text-h6 font-weight-bold">{{ title }}</div>
          <div v-if="subtitle" class="text-body-2 text-medium-emphasis">
            {{ subtitle }}
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="t('common.close')"
          @click="open = false"
        />
      </v-card-title>
      <v-card-text class="d-flex flex-column ga-4">
        <dl class="fields">
          <template v-for="f in fields" :key="f.label">
            <dt class="text-body-2 text-medium-emphasis">{{ f.label }}</dt>
            <dd
              class="text-body-2"
              :class="[f.mono && 'font-mono', f.color && `text-${f.color}`]"
            >
              {{ f.value == null || f.value === "" ? "-" : f.value }}
            </dd>
          </template>
        </dl>
        <div v-for="b in blocks" :key="b.label">
          <div class="d-flex align-center mb-1">
            <span class="text-body-2 font-weight-bold">{{ b.label }}</span>
            <v-spacer />
            <v-btn
              size="x-small"
              variant="text"
              prepend-icon="mdi-content-copy"
              @click="copy(b.value)"
            >
              {{ t("devReg.copy") }}
            </v-btn>
          </div>
          <pre class="json font-mono">{{ pretty(b.value) }}</pre>
        </div>
        <slot />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.fields {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  margin: 0;
}
.fields dd {
  margin: 0;
  word-break: break-all;
}
.json {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface-soft));
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 320px;
  overflow: auto;
}
</style>
