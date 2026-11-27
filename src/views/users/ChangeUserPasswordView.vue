<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ApiError, userApi, type RoleOption, type UserListItem, type UserListSummary } from "@/api";
import { useNotify } from "@/composables/useNotify";
import { useAuthStore } from "@/stores/auth";
import { formatDateTime } from "@/utils/format";
import { generatePassword, PASSWORD_MIN, passwordChecks } from "@/utils/password";

const { t } = useI18n();
const notify = useNotify();
const auth = useAuthStore();

// ---- Users (GET /users: only roles below the caller) + roles the caller may assign (GET /roles) ----
const users = ref<UserListItem[]>([]);
const summary = ref<UserListSummary | undefined>();
const roles = ref<RoleOption[]>([]);
const loading = ref(false);
const loadError = ref("");

// ---- Tabs + search (the tab is sent as ?status=, the backend defaults to ACTIVE only) ----
type Tab = "active" | "disabled" | "all";
const tab = ref<Tab>("active");
const search = ref("");
const TAB_STATUS = { active: "ACTIVE", disabled: "INACTIVE", all: "ALL" } as const;

let seq = 0;
async function loadUsers() {
  const mine = ++seq;
  const res = await userApi.list(TAB_STATUS[tab.value]);
  if (mine !== seq) return; // a newer tab switch already won
  users.value = res.items;
  summary.value = res.summary;
}

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    const [, r] = await Promise.all([loadUsers(), userApi.roles()]);
    roles.value = [...(r ?? [])].sort((a, b) => (a.role_level ?? 0) - (b.role_level ?? 0));
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

watch(tab, async () => {
  loading.value = true;
  loadError.value = "";
  try {
    await loadUsers();
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
});

const isActive = (u: UserListItem) => u.status?.toUpperCase() === "ACTIVE";

// Counts come from the API summary; without one, count what was loaded
const tabs = computed(() => {
  const s = summary.value;
  const active = s?.ACTIVE ?? users.value.filter(isActive).length;
  const all = s?.ALL ?? users.value.length;
  return [
    { value: "active" as const, count: active },
    { value: "disabled" as const, count: s?.INACTIVE ?? all - active },
    { value: "all" as const, count: all },
  ];
});

const rows = computed(() => {
  const q = search.value.trim().toLowerCase();
  return users.value
    .filter((u) => tab.value === "all" || isActive(u) === (tab.value === "active"))
    .filter(
      (u) =>
        !q ||
        [u.username, u.full_name, u.email].some((v) => v?.toLowerCase().includes(q)),
    )
    .sort((a, b) => (b.role_level ?? 0) - (a.role_level ?? 0) || a.username.localeCompare(b.username));
});

const scope = computed(() =>
  t("userAdmin.scope", {
    role: auth.role ?? "-",
    roles: roles.value.map((r) => r.code).join(" / ") || "-",
  }),
);

// ---- Dialog: reset password / change role / enable-disable ----
type Mode = "reset" | "role" | "status";
const dialog = ref(false);
const mode = ref<Mode>("reset");
const target = ref<UserListItem | null>(null);
const saving = ref(false);
const apiErr = ref<{ code: string; message: string } | null>(null);

const password = ref("");
const showPw = ref(false);
const tried = ref(false);
const role = ref("");

const checks = computed(() =>
  passwordChecks(password.value).map((c) => ({
    ok: c.ok,
    text: t(`register.rule.${c.key}`, { n: PASSWORD_MIN }),
  })),
);
const pwOk = computed(() => checks.value.every((c) => c.ok));

function open(m: Mode, u: UserListItem) {
  mode.value = m;
  target.value = u;
  apiErr.value = null;
  tried.value = false;
  password.value = "";
  showPw.value = false;
  role.value = u.roles?.[0] ?? "";
  dialog.value = true;
}

function generate() {
  password.value = generatePassword();
  showPw.value = true;
  apiErr.value = null;
}

const title = computed(() => {
  const username = target.value?.username ?? "";
  if (mode.value === "status") {
    return t(target.value && isActive(target.value) ? "userAdmin.disable.title" : "userAdmin.enable.title", { username });
  }
  return t(`userAdmin.${mode.value}.title`, { username });
});

const roleName = (code: string) => roles.value.find((r) => r.code === code)?.name ?? code;

async function confirm() {
  const u = target.value;
  if (!u) return;
  if (mode.value === "reset") {
    tried.value = true;
    if (!pwOk.value) return;
  }
  if (mode.value === "role" && (!role.value || role.value === u.roles?.[0])) {
    dialog.value = false;
    return;
  }
  saving.value = true;
  apiErr.value = null;
  try {
    let message: string;
    if (mode.value === "reset") {
      const res = await userApi.changePassword(u.username, password.value);
      message = res.message || t("userAdmin.reset.done", { username: u.username });
    } else if (mode.value === "role") {
      const res = await userApi.updateRoles(u.user_id, [role.value]);
      message = res.message || t("userAdmin.role.done", { username: u.username, role: role.value });
    } else {
      const enable = !isActive(u);
      const res = await userApi.setStatus(u.user_id, enable ? "ACTIVE" : "INACTIVE");
      message =
        res.message || t(enable ? "userAdmin.enable.done" : "userAdmin.disable.done", { username: u.username });
    }
    dialog.value = false;
    notify.success(message);
    await load();
  } catch (e) {
    apiErr.value = {
      code: e instanceof ApiError && e.code ? e.code : "ERROR",
      message: e instanceof Error ? e.message : String(e),
    };
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <p class="text-medium-emphasis mb-0">{{ t("userAdmin.subtitle") }}</p>

    <v-card>
      <div class="d-flex flex-wrap align-center ga-3 pa-4">
        <v-btn-toggle v-model="tab" mandatory class="segmented" :aria-label="t('userAdmin.col.status')">
          <v-btn v-for="f in tabs" :key="f.value" :value="f.value" variant="text">
            {{ t(`userAdmin.tab.${f.value}`) }}<span class="text-medium-emphasis ms-1">{{ f.count }}</span>
          </v-btn>
        </v-btn-toggle>
        <v-spacer />
        <v-text-field
          v-model="search"
          :placeholder="t('userAdmin.search')"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          hide-details
          clearable
          class="search"
        />
      </div>

      <v-alert v-if="loadError" type="error" variant="tonal" density="compact" class="mx-4 mb-4">
        <div class="d-flex flex-wrap align-center ga-2">
          <span>GET /users · {{ loadError }}</span>
          <v-spacer />
          <v-btn size="small" variant="outlined" @click="load">{{ t("common.refresh") }}</v-btn>
        </div>
      </v-alert>

      <v-progress-linear v-if="loading" indeterminate />
      <v-table class="users">
        <thead>
          <tr>
            <th>{{ t("userAdmin.col.username") }}</th>
            <th>{{ t("userAdmin.col.name") }}</th>
            <th>{{ t("userAdmin.col.role") }}</th>
            <th>{{ t("userAdmin.col.status") }}</th>
            <th>{{ t("userAdmin.col.lastLogin") }}</th>
            <th class="text-end">{{ t("userAdmin.col.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in rows" :key="u.user_id">
            <td class="font-mono">{{ u.username }}</td>
            <td>
              <div>{{ u.full_name }}</div>
              <div class="text-caption text-medium-emphasis">{{ u.email || "-" }}</div>
            </td>
            <td>
              <v-chip
                v-for="r in u.roles"
                :key="r"
                size="small"
                color="primary"
                variant="tonal"
                class="font-mono font-weight-bold me-1"
              >
                {{ r }}
              </v-chip>
            </td>
            <td>
              <div class="d-flex flex-wrap ga-1">
                <v-chip v-if="isActive(u)" size="small" color="success" variant="tonal">
                  {{ t("userAdmin.status.active") }}
                </v-chip>
                <v-chip v-else size="small" variant="tonal">{{ t("userAdmin.status.disabled") }}</v-chip>
                <v-chip v-if="u.must_change_password" size="small" color="warning" variant="tonal">
                  {{ t("userAdmin.status.mustChange") }}
                </v-chip>
              </div>
            </td>
            <td class="text-no-wrap">{{ u.last_login_at ? formatDateTime(u.last_login_at) : "-" }}</td>
            <td>
              <div class="d-flex justify-end ga-2">
                <v-btn size="small" variant="outlined" @click="open('reset', u)">
                  {{ t("userAdmin.action.reset") }}
                </v-btn>
                <v-btn size="small" variant="outlined" @click="open('role', u)">
                  {{ t("userAdmin.action.role") }}
                </v-btn>
                <v-btn
                  size="small"
                  variant="outlined"
                  :color="isActive(u) ? 'error' : 'success'"
                  @click="open('status', u)"
                >
                  {{ t(isActive(u) ? "userAdmin.action.disable" : "userAdmin.action.enable") }}
                </v-btn>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !rows.length">
            <td colspan="6" class="text-center text-medium-emphasis py-6">{{ t("userAdmin.empty") }}</td>
          </tr>
        </tbody>
      </v-table>

      <v-divider />
      <div class="text-body-2 text-medium-emphasis pa-4">{{ scope }}</div>
    </v-card>

    <v-dialog v-model="dialog" max-width="520" :persistent="saving">
      <v-card v-if="target">
        <v-card-title class="text-subtitle-1 font-weight-bold">{{ title }}</v-card-title>
        <v-card-text class="d-flex flex-column ga-3">
          <v-alert v-if="apiErr" type="error" variant="tonal" density="compact">
            <strong>{{ apiErr.code }}</strong> · {{ apiErr.message }}
          </v-alert>

          <!-- Reset password -->
          <template v-if="mode === 'reset'">
            <div class="d-flex flex-wrap ga-2 align-start">
              <v-text-field
                v-model="password"
                :label="t('password.new')"
                :type="showPw ? 'text' : 'password'"
                autocomplete="new-password"
                class="font-mono pw"
                :error="tried && !pwOk"
                hide-details
                autofocus
                @update:model-value="apiErr = null"
              />
              <v-btn variant="outlined" height="56" @click="showPw = !showPw">
                {{ showPw ? t("register.hide") : t("register.show") }}
              </v-btn>
              <v-btn variant="outlined" height="56" @click="generate">{{ t("register.generate") }}</v-btn>
            </div>
            <ul class="rules">
              <li v-for="c in checks" :key="c.text" :class="c.ok ? 'text-success' : 'text-medium-emphasis'">
                {{ c.ok ? "✓" : "•" }} {{ c.text }}
              </li>
            </ul>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ t("userAdmin.reset.note") }}</p>
          </template>

          <!-- Change role -->
          <v-radio-group v-else-if="mode === 'role'" v-model="role" hide-details>
            <v-radio v-for="r in roles" :key="r.code" :value="r.code">
              <template #label>
                <span class="font-weight-bold me-2">{{ r.name }}</span>
                <span class="text-caption font-mono text-medium-emphasis">{{ r.code }}</span>
              </template>
            </v-radio>
            <div v-if="!roles.length" class="text-body-2 text-medium-emphasis">{{ t("register.noRoles") }}</div>
          </v-radio-group>

          <!-- Enable / disable -->
          <p v-else class="mb-0">
            {{ t(isActive(target) ? "userAdmin.disable.text" : "userAdmin.enable.text") }}
          </p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="dialog = false">{{ t("common.cancel") }}</v-btn>
          <v-btn
            variant="flat"
            :color="mode === 'status' && isActive(target) ? 'error' : 'primary'"
            :loading="saving"
            @click="confirm"
          >
            {{
              mode === "status"
                ? t(isActive(target) ? "userAdmin.action.disable" : "userAdmin.action.enable")
                : t("common.save")
            }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
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
.search {
  flex: 0 1 320px;
  min-width: 200px;
}
.users td {
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}
.font-mono,
.font-mono :deep(input) {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
}
.pw {
  flex: 1 1 220px;
}
.rules {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 12px;
  font-size: 13px;
}
</style>
