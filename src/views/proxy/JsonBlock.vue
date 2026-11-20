<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { pretty } from "./registration";

/** A titled, copyable JSON (or text) block for the registration drawers. */
const props = defineProps<{ label: string; hint?: string; value: unknown }>();
const { t } = useI18n();

async function copy() {
  try {
    await navigator.clipboard.writeText(pretty(props.value));
  } catch {
    // clipboard unavailable (insecure context)
  }
}
</script>

<template>
  <section>
    <div class="d-flex align-center ga-2 mb-1">
      <span class="text-body-2 font-weight-bold">{{ label }}</span>
      <v-spacer />
      <span v-if="hint" class="text-caption text-medium-emphasis">{{
        hint
      }}</span>
      <v-btn
        size="x-small"
        variant="text"
        icon="mdi-content-copy"
        :aria-label="`${t('devReg.copy')} ${label}`"
        @click="copy"
      />
    </div>
    <pre class="json font-mono">{{ pretty(value) }}</pre>
  </section>
</template>

<style scoped>
.json {
  margin: 0;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface-soft));
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 360px;
  overflow: auto;
}
</style>
