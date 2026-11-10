<script setup lang="ts">
import dayjs from "dayjs";
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import DateTimePicker from "@/components/DateTimePicker.vue";
import { DATE_TIME_FORMAT, toInputDate } from "@/utils/format";

const from = defineModel<string>("from", { required: true });
const to = defineModel<string>("to", { required: true });
const props = defineProps<{ min?: string; max?: string; maxHours?: number }>();

// "To" may not go past from + maxHours (or the overall max, whichever is earlier)
const toMax = computed(() => {
  if (!props.maxHours) return props.max;
  const limit = dayjs(from.value).add(props.maxHours, "hour");
  return props.max && dayjs(props.max).isBefore(limit)
    ? props.max
    : toInputDate(limit);
});

// Recommendations under the fields: the allowed bounds of each input
const { t } = useI18n();
const fmt = (v: string) => dayjs(v).format(DATE_TIME_FORMAT);
const fromHint = computed(() =>
  props.min ? t("common.fromHint", { date: fmt(props.min) }) : undefined,
);
const toHint = computed(() => {
  if (!toMax.value) return undefined;
  return props.maxHours
    ? t("common.toHintHours", { date: fmt(toMax.value), hours: props.maxHours })
    : t("common.toHint", { date: fmt(toMax.value) });
});

// Moving "From" pulls "To" back inside the allowed window
watch(from, (f) => {
  if (dayjs(to.value).isBefore(dayjs(f))) to.value = f;
  else if (toMax.value && dayjs(to.value).isAfter(dayjs(toMax.value)))
    to.value = toInputDate(dayjs(toMax.value));
});
</script>

<template>
  <v-col cols="12" sm="6" md="3" lg="2">
    <DateTimePicker
      v-model="from"
      :label="$t('common.from')"
      :min="min"
      :max="max"
      :hint="fromHint"
      required
    />
  </v-col>
  <v-col cols="12" sm="6" md="3" lg="2">
    <DateTimePicker
      v-model="to"
      :label="$t('common.to')"
      :min="from"
      :max="toMax"
      :hint="toHint"
      required
    />
  </v-col>
</template>
