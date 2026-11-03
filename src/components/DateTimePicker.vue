<script setup lang="ts">
import dayjs from "dayjs";
import { computed, ref, watch } from "vue";
import { toInputDate } from "@/utils/format";

// Value is a datetime-local string `YYYY-MM-DDTHH:mm`
const model = defineModel<string>({ required: true });
const props = defineProps<{ label?: string; min?: string; max?: string }>();

const open = ref(false);
const date = ref<Date>(new Date());
const time = ref("00:00");

const display = computed(() => {
  const d = dayjs(model.value);
  return d.isValid() ? d.format("DD MMM , HH:mm") : "";
});
const minDate = computed(() =>
  props.min ? dayjs(props.min).format("YYYY-MM-DD") : undefined,
);
const maxDate = computed(() =>
  props.max ? dayjs(props.max).format("YYYY-MM-DD") : undefined,
);

// Start from the current value each time the picker opens
watch(open, (v) => {
  if (!v) return;
  const d = dayjs(model.value);
  date.value = d.isValid() ? d.toDate() : new Date();
  time.value = d.isValid() ? d.format("HH:mm") : "00:00";
});

function apply() {
  const [h = 0, m = 0] = time.value.split(":").map(Number);
  let d = dayjs(date.value).hour(h).minute(m).second(0);
  // The calendar only limits the day, so clamp the time too
  if (props.min && d.isBefore(dayjs(props.min))) d = dayjs(props.min);
  if (props.max && d.isAfter(dayjs(props.max))) d = dayjs(props.max);
  model.value = toInputDate(d);
  open.value = false;
}
</script>

<template>
  <v-menu
    v-model="open"
    :close-on-content-click="false"
    location="bottom start"
  >
    <template #activator="{ props: menuProps }">
      <v-text-field
        v-bind="menuProps"
        :model-value="display"
        :label="label"
        prepend-inner-icon="mdi-calendar-clock"
        density="compact"
        hide-details
        readonly
      />
    </template>
    <v-card min-width="328">
      <v-date-picker
        v-model="date"
        :min="minDate"
        :max="maxDate"
        hide-header
        show-adjacent-months
      />
      <div class="px-4">
        <v-text-field
          v-model="time"
          type="time"
          :label="$t('common.time')"
          prepend-inner-icon="mdi-clock-outline"
          density="compact"
          hide-details
        />
      </div>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="outlined" @click="open = false">{{
          $t("common.cancel")
        }}</v-btn>
        <v-btn color="primary" variant="flat" @click="apply">{{
          $t("common.ok")
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>
