<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { deviceApi, type DeviceMasterResponse, type DeviceMasterSaveRequest, type DevicesResponse } from '@/api'
import DataTablePage from '@/components/DataTablePage.vue'
import { useLoader } from '@/composables/useLoader'
import { useNotify } from '@/composables/useNotify'

type Status = 'active' | 'pending' | 'deleted'
type Row = DevicesResponse & { tmCount?: number; statusKey: Status; status: string }
type AddCheck = { kind: 'new' } | { kind: 'reopen' | 'exists'; row: Row }

const headers = [
  { title: 'col.serial', key: 'serialNo' },
  { title: 'col.category', key: 'categoryId' },
  { title: 'col.plateNo', key: 'plateNo' },
  { title: 'col.gpsModel', key: 'GPSModelName' },
  { title: 'col.destinations', key: 'tmCount' },
  { title: 'col.status', key: 'status' },
]

const STATUS_COLOR: Record<Status, string> = { active: 'success', pending: 'warning', deleted: 'secondary' }

const assignRoute = { name: 'proxy-assign-destination' }

const { t } = useI18n()
const master = ref<DeviceMasterResponse>()
// null while the destination count API is unavailable
const destCounts = ref<Record<number, number> | null>(null)
const filter = ref<'all' | Status>('all')
const { loading, error, run } = useLoader()
const notify = useNotify()

const allRows = computed<Row[]>(() =>
  (master.value?.devices ?? []).map((d) => {
    const tmCount = destCounts.value ? (destCounts.value[d.mId] ?? 0) : undefined
    const statusKey: Status = d.deleted ? 'deleted' : tmCount === 0 ? 'pending' : 'active'
    // status holds the label so filtering and CSV export use the shown text
    return { ...d, tmCount, statusKey, status: t(`master.status.${statusKey}`) }
  }),
)

const matches = (r: Row, f: typeof filter.value) =>
  f === 'all' || (f === 'active' ? !r.deleted : r.statusKey === f)

const filters = computed(() =>
  (['all', 'active', 'pending', 'deleted'] as const).map((value) => ({
    value,
    label: t(`master.filter.${value}`),
    count: allRows.value.filter((r) => matches(r, value)).length,
    disabled: value === 'pending' && !destCounts.value,
  })),
)

const rows = computed(() => allRows.value.filter((r) => matches(r, filter.value)))

// The API reports partial failures per section
const sectionErrors = computed(() => {
  const m = master.value
  if (!m) return []
  return [
    ['Devices', m.devicesError],
    ['Categories', m.categoriesError],
    ['GPS models', m.gpsModelsError],
    ['Provinces', m.provincesError],
  ].filter(([, e]) => e)
})

async function load() {
  const [m, counts] = await Promise.all([
    run(deviceApi.master),
    deviceApi.masterDestinationCounts().catch(() => null),
  ])
  master.value = m
  destCounts.value = counts
}

// ---- Side panel: Add / Update / Delete ----

const panel = ref<'add' | 'update' | 'delete' | null>(null)
const target = ref<Row>()
const serialInput = ref('')
const checkedSerial = ref<string | null>(null)
const saving = ref(false)

const blankForm = (): DeviceMasterSaveRequest => ({
  serialNo: '',
  categoryId: '',
  GPSModelCode: null,
  plateNo: '',
  provinceCode: null,
  accountId: '',
  deviceId: '',
  chassis: '',
})
const form = reactive(blankForm())

function fillForm(d?: DevicesResponse) {
  Object.assign(
    form,
    blankForm(),
    d && {
      serialNo: d.serialNo,
      categoryId: d.categoryId,
      GPSModelCode: d.GPSModelCode,
      plateNo: d.plateNo,
      provinceCode: d.provinceCode,
      accountId: d.accountId,
      deviceId: d.deviceId,
      chassis: d.chassis,
    },
  )
}

const gpsModels = computed(() => (master.value?.gpsModels ?? []).filter((m) => m.categoryId === form.categoryId))
const formValid = computed(
  () => !!form.categoryId && form.GPSModelCode != null && !!form.plateNo.trim() && form.provinceCode != null,
)

const findSerial = (serial: string) => allRows.value.find((r) => r.serialNo === serial)

function openAdd() {
  panel.value = 'add'
  target.value = undefined
  serialInput.value = ''
  checkedSerial.value = null
  fillForm()
}

function openUpdate(row: Row) {
  panel.value = 'update'
  target.value = row
  fillForm(row)
}

function openDelete(row: Row) {
  panel.value = 'delete'
  target.value = row
}

function close() {
  panel.value = null
  target.value = undefined
}

// The device list from /device/master includes closed devices, so the check runs on it
const addCheck = computed<AddCheck | null>(() => {
  if (checkedSerial.value === null) return null
  const row = findSerial(checkedSerial.value)
  if (!row) return { kind: 'new' }
  return { kind: row.deleted ? 'reopen' : 'exists', row }
})

function check() {
  const serial = serialInput.value.trim()
  if (!serial) return
  checkedSerial.value = serial
  const row = findSerial(serial)
  fillForm(row?.deleted ? row : undefined)
  form.serialNo = serial
}

const serialChanged = computed(
  () => panel.value === 'update' && !!target.value && form.serialNo.trim() !== target.value.serialNo,
)
const serialTaken = computed(() => serialChanged.value && !!findSerial(form.serialNo.trim()))

const view = computed(() => {
  const d = target.value
  const steps: [string, string][] = []
  const v = { title: '', sub: '', ok: '', okDisabled: false, danger: false, showForm: false, formHint: '', next: '', steps }
  const nextInstall = t('master.next.install')

  if (panel.value === 'add') {
    Object.assign(v, { title: t('common.add'), sub: t('master.add.sub'), ok: t('master.add.ok') })
    const c = addCheck.value
    if (!c || c.kind === 'exists') v.okDisabled = true
    else if (c.kind === 'new') {
      Object.assign(v, { showForm: true, formHint: t('master.form.hintNew'), next: nextInstall })
      steps.push([t('master.step.add'), t('master.step.addDetail', { serial: checkedSerial.value })])
    } else {
      Object.assign(v, {
        showForm: true,
        formHint: t('master.form.hintReopen'),
        next: nextInstall,
        ok: t('master.add.okReopen'),
      })
      steps.push([t('master.step.reopen'), t('master.step.reopenDetail', { mId: c.row.mId })])
    }
  } else if (panel.value === 'update' && d) {
    Object.assign(v, {
      title: t('common.update'),
      sub: `${d.serialNo} · mId ${d.mId}`,
      showForm: true,
      formHint: t('master.form.hintUpdate'),
      ok: t('master.update.ok'),
    })
    if (serialTaken.value) v.okDisabled = true
    else if (serialChanged.value) {
      steps.push([
        t('master.step.newDevice'),
        t('master.step.newDeviceDetail', { serial: form.serialNo.trim(), mId: d.mId }),
      ])
      v.next = t('master.next.swap', { serial: d.serialNo })
      v.ok = t('master.update.okNewDevice')
    } else steps.push([t('master.step.update'), t('master.step.updateDetail')])
  } else if (panel.value === 'delete' && d) {
    Object.assign(v, { title: t('common.delete'), sub: t('master.delete.sub'), danger: true, ok: t('master.delete.ok') })
    // Blocked while sending to any destination, or while the count is unknown
    if (d.tmCount !== 0) v.okDisabled = true
    else steps.push([t('master.step.delete'), t('master.step.deleteDetail')])
  }

  if (v.showForm && !formValid.value) v.okDisabled = true
  return v
})

async function confirm() {
  const d = target.value
  const c = addCheck.value
  const body = { ...form, serialNo: form.serialNo.trim(), plateNo: form.plateNo.trim() }
  saving.value = true
  try {
    if (panel.value === 'add') {
      await (c?.kind === 'reopen' ? deviceApi.masterReopen(c.row.mId, body) : deviceApi.masterCreate(body))
    } else if (panel.value === 'update' && d) await deviceApi.masterUpdate(d.mId, body)
    else if (panel.value === 'delete' && d) await deviceApi.masterDelete(d.mId)
    notify.success(t('master.success', { action: view.value.title }))
    close()
    await load()
  } catch (e) {
    notify.error(e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <v-row>
    <v-col cols="12" :lg="panel ? 8 : 12">
      <DataTablePage
        :headers="headers"
        :items="rows"
        :loading="loading"
        :error="error"
        :search-text="t('common.refresh')"
        @search="load"
        @add="openAdd"
        @edit="openUpdate"
        @delete="openDelete"
      >
        <template #filters>
          <v-col cols="auto">
            <v-btn-toggle v-model="filter" mandatory class="segmented" :aria-label="t('col.status')">
              <v-btn v-for="f in filters" :key="f.value" :value="f.value" :disabled="f.disabled" variant="text">
                {{ f.label }}<span class="text-medium-emphasis ms-1">{{ f.count }}</span>
              </v-btn>
            </v-btn-toggle>
          </v-col>
        </template>
        <template #alerts>
          <v-alert v-for="[name, e] in sectionErrors" :key="name" type="warning" variant="tonal" density="compact" class="mt-2">
            {{ name }}: {{ e }}
          </v-alert>
          <v-alert v-if="master && !destCounts" type="info" variant="tonal" density="compact" class="mt-2">
            {{ t('master.noCountApi') }}
          </v-alert>
        </template>

        <template #item.serialNo="{ item }">
          <span class="font-mono">{{ item.serialNo }}</span>
          <div class="text-caption text-medium-emphasis">mId {{ item.mId }}</div>
        </template>
        <template #item.plateNo="{ item }">
          {{ item.plateNo || '-' }}
          <div class="text-caption text-medium-emphasis">{{ item.provinceName }}</div>
        </template>
        <template #item.tmCount="{ item }">
          <span v-if="item.tmCount === undefined || (item.deleted && !item.tmCount)">-</span>
          <router-link v-else-if="item.tmCount" :to="assignRoute">{{ t('master.destCount', { n: item.tmCount }) }}</router-link>
          <router-link v-else :to="assignRoute">{{ t('master.notSet') }}</router-link>
        </template>
        <template #item.status="{ item }">
          <v-chip size="small" variant="tonal" :color="STATUS_COLOR[item.statusKey as Status]" class="font-weight-bold">
            {{ item.status }}
          </v-chip>
        </template>
      </DataTablePage>
    </v-col>

    <v-col v-if="panel" cols="12" lg="4">
      <v-card :aria-label="view.title">
        <v-card-item>
          <v-card-title>{{ view.title }}</v-card-title>
          <v-card-subtitle>{{ view.sub }}</v-card-subtitle>
          <template #append>
            <v-btn icon="mdi-close" variant="text" size="small" :aria-label="t('common.close')" @click="close" />
          </template>
        </v-card-item>
        <v-divider />

        <v-card-text class="d-flex flex-column ga-4">
          <template v-if="panel === 'add'">
            <div class="d-flex ga-2 align-start">
              <v-text-field
                v-model="serialInput"
                :label="t('col.serial')"
                class="font-mono"
                hide-details
                autofocus
                @update:model-value="checkedSerial = null"
                @keyup.enter="check"
              />
              <v-btn color="primary" variant="outlined" height="48" :disabled="!serialInput.trim()" @click="check">
                {{ t('master.check') }}
              </v-btn>
            </div>
            <v-alert
              v-if="addCheck?.kind === 'new'"
              type="info"
              variant="tonal"
              density="compact"
              :title="t('master.checkNew.title')"
            >
              {{ t('master.checkNew.text') }}
            </v-alert>
            <v-alert
              v-else-if="addCheck?.kind === 'reopen'"
              type="warning"
              variant="tonal"
              density="compact"
              :title="t('master.checkReopen.title')"
            >
              {{ t('master.checkReopen.text', { mId: addCheck.row.mId }) }}
            </v-alert>
            <v-alert
              v-else-if="addCheck?.kind === 'exists'"
              type="error"
              variant="tonal"
              density="compact"
              :title="t('master.checkExists.title')"
            >
              {{ t('master.checkExists.text', { mId: addCheck.row.mId }) }}
              <template #append>
                <v-btn size="small" variant="outlined" @click="openUpdate(addCheck.row)">{{ t('common.update') }}</v-btn>
              </template>
            </v-alert>
          </template>

          <template v-if="panel === 'delete' && target">
            <v-sheet border rounded="lg" class="pa-3 bg-surface-soft">
              <div class="font-mono font-weight-medium">{{ target.serialNo }}</div>
              <div class="text-body-2 text-medium-emphasis">
                mId {{ target.mId }} · {{ target.plateNo }} {{ target.provinceName }}
              </div>
            </v-sheet>
            <v-alert
              v-if="target.tmCount"
              type="warning"
              variant="tonal"
              density="compact"
              :title="t('master.delete.blockedTitle', { n: target.tmCount })"
            >
              <i18n-t keypath="master.delete.blockedText" scope="global">
                <template #link>
                  <router-link :to="assignRoute" class="font-weight-bold">{{ t('menu.proxy-assign-destination') }}</router-link>
                </template>
              </i18n-t>
            </v-alert>
            <v-alert v-else-if="target.tmCount === undefined" type="warning" variant="tonal" density="compact">
              {{ t('master.delete.unknown') }}
            </v-alert>
            <div v-else class="text-body-2">{{ t('master.delete.allowed') }}</div>
          </template>

          <template v-if="view.showForm">
            <div>
              <div class="font-weight-bold">{{ t('master.form.title') }}</div>
              <div class="text-caption text-medium-emphasis">{{ view.formHint }}</div>
            </div>
            <template v-if="panel === 'update' && target">
              <v-text-field
                v-model="form.serialNo"
                :label="t('col.serial')"
                class="font-mono"
                :color="serialChanged ? 'warning' : undefined"
                :error-messages="serialTaken ? t('master.serialTaken') : undefined"
                hide-details="auto"
              />
              <v-alert
                v-if="serialChanged && !serialTaken"
                type="warning"
                variant="tonal"
                density="compact"
                :title="t('master.serialChanged.title')"
              >
                {{ t('master.serialChanged.text', { serial: target.serialNo }) }}
              </v-alert>
            </template>
            <v-row dense>
              <v-col cols="6">
                <v-select
                  v-model="form.categoryId"
                  :items="master?.categories ?? []"
                  item-title="categoryId"
                  item-value="categoryId"
                  :label="t('col.category')"
                  hide-details
                  @update:model-value="form.GPSModelCode = null"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="form.GPSModelCode"
                  :items="gpsModels"
                  item-title="gpsModelName"
                  item-value="gpsModelCode"
                  :label="t('col.gpsModel')"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="form.plateNo"
                  :label="t('master.form.plateNo')"
                  :placeholder="t('master.form.platePlaceholder')"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-autocomplete
                  v-model="form.provinceCode"
                  :items="master?.provinces ?? []"
                  item-title="provinceName"
                  item-value="provinceId"
                  :label="t('master.form.province')"
                  hide-details
                />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="form.accountId" label="accountID" hide-details />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="form.deviceId" label="deviceID" hide-details />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="form.chassis"
                  :label="t('master.form.chassis')"
                  :placeholder="t('master.form.optional')"
                  hide-details
                />
              </v-col>
            </v-row>
          </template>

          <div v-if="view.steps.length">
            <v-divider class="mb-3" />
            <div class="font-weight-bold mb-2">{{ t('master.stepsTitle') }}</div>
            <ol class="steps">
              <li v-for="([title, detail], i) in view.steps" :key="i" class="d-flex ga-2 align-start text-body-2">
                <v-avatar size="22" color="primary" variant="tonal" class="text-caption font-weight-bold">{{ i + 1 }}</v-avatar>
                <span>
                  <span class="font-weight-bold">{{ title }}</span>
                  <span class="text-medium-emphasis"> {{ detail }}</span>
                </span>
              </li>
            </ol>
          </div>

          <v-sheet v-if="view.next" border rounded="lg" class="next-step d-flex ga-2 pa-3 text-body-2">
            <v-icon icon="mdi-arrow-right" color="primary" size="18" class="mt-1" />
            <span>
              {{ view.next }}
              <router-link :to="assignRoute" class="font-weight-bold">{{ t('master.goAssign') }}</router-link>
            </span>
          </v-sheet>

          <div class="d-flex ga-2">
            <v-btn variant="outlined" size="large" class="flex-1-1" @click="close">{{ t('common.cancel') }}</v-btn>
            <v-btn
              :color="view.danger ? 'error' : 'primary'"
              variant="flat"
              size="large"
              class="ok-btn"
              :disabled="view.okDisabled"
              :loading="saving"
              @click="confirm"
            >
              {{ view.ok }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
/* Segmented status filter: grey track, selected option as a white pill */
.segmented {
  height: auto !important;
  padding: 4px;
  gap: 4px;
  border-radius: 10px;
  background: rgb(var(--v-theme-surface-soft));
}
.segmented .v-btn {
  height: 36px !important;
  border-radius: 8px !important;
  font-weight: 400;
}
.segmented .v-btn--active {
  font-weight: 600;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-input-border));
}
.segmented .v-btn--active :deep(.v-btn__overlay) {
  opacity: 0;
}
.steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.next-step {
  border-style: dashed !important;
}
.ok-btn {
  flex: 2 1 0;
}
</style>
