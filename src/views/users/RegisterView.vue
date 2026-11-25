<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ApiError, userApi, type RoleOption, type UserListItem } from "@/api";

const { t } = useI18n();

type Field = "username" | "fullName" | "email" | "role";

const EMPTY = { username: "", fullName: "", email: "" };
const form = reactive({ ...EMPTY });
const password = ref("");
const showPw = ref(false);
const role = ref<string>("");
const tried = ref(false);
const saving = ref(false);
const errs = ref<Partial<Record<Field, string>>>({});
const apiErr = ref<{ code: string; message: string } | null>(null);
const created = ref<UserListItem | null>(null);

// ---- Roles: GET /roles (only roles below the caller), lowest level first ----
const roles = ref<RoleOption[]>([]);
const rolesLoading = ref(false);
const rolesError = ref("");

async function loadRoles() {
  rolesLoading.value = true;
  rolesError.value = "";
  try {
    roles.value = [...((await userApi.roles()) ?? [])].sort(
      (a, b) => (a.role_level ?? 0) - (b.role_level ?? 0),
    );
  } catch (e) {
    roles.value = [];
    rolesError.value = e instanceof Error ? e.message : String(e);
  } finally {
    rolesLoading.value = false;
  }
  // keep the pick if still offered, else default to the first role
  if (!roles.value.some((r) => r.code === role.value)) role.value = roles.value[0]?.code ?? "";
}
onMounted(loadRoles);

// ---- Validation (same limits as POST /users/register) ----
const fields = computed(() => [
  { key: "username" as const, label: t("register.username"), type: "text", max: 100, hint: t("register.usernameHint"), mono: true },
  { key: "fullName" as const, label: t("register.fullName"), type: "text", max: 255, hint: t("register.fullNameHint") },
  { key: "email" as const, label: t("register.email"), type: "email", max: 255, hint: t("register.emailHint") },
]);

function check() {
  const e: Partial<Record<Field, string>> = {};
  const u = form.username.trim();
  const n = form.fullName.trim();
  const m = form.email.trim();
  if (!u) e.username = t("common.required");
  else if (/\s/.test(u)) e.username = t("register.err.usernameSpaces");
  else if (u.length > 100) e.username = t("register.err.maxLength", { n: 100 });
  if (!n) e.fullName = t("common.required");
  else if (n.length > 255) e.fullName = t("register.err.maxLength", { n: 255 });
  if (m && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) e.email = t("register.err.emailInvalid");
  else if (m.length > 255) e.email = t("register.err.maxLength", { n: 255 });
  if (!role.value) e.role = t("common.required");
  return e;
}

/** Show a field's error once the user leaves it. */
function touch(k: Field) {
  const e = check()[k];
  errs.value = { ...errs.value, [k]: e };
}
const pwTouched = ref(false);
const pwError = computed(() =>
  !(tried.value || pwTouched.value) ? "" : !password.value ? t("common.required") : "",
);

const rules = computed(() => {
  const pw = password.value;
  return [
    { ok: pw.length >= 8, text: t("register.rule.length", { n: 8 }) },
    { ok: /[a-z]/.test(pw), text: t("register.rule.lower") },
    { ok: /[A-Z]/.test(pw), text: t("register.rule.upper") },
    { ok: /[0-9]/.test(pw), text: t("register.rule.digit") },
  ];
});
const pwOk = computed(() => rules.value.every((r) => r.ok));

function edit(k: Field) {
  if (errs.value[k]) errs.value = { ...errs.value, [k]: undefined };
  apiErr.value = null;
}

/** Random password that meets the policy (one of each class + 6 more, shuffled). */
function generate() {
  const sets = ["abcdefghijkmnpqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ", "23456789"];
  const all = sets.join("");
  const pick = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const chars = [...sets.map(pick), ...Array.from({ length: 7 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  password.value = chars.join("");
  showPw.value = true;
  apiErr.value = null;
}

// API error code → field it belongs to
const FIELD_OF: Record<string, Field> = {
  USERNAME_EXISTS: "username",
  EMAIL_EXISTS: "email",
  ROLE_INVALID: "role",
  ROLE_LEVEL_DENIED: "role",
};

async function submit() {
  tried.value = true;
  errs.value = check();
  if (Object.values(errs.value).some(Boolean) || !pwOk.value) return;
  saving.value = true;
  apiErr.value = null;
  try {
    const email = form.email.trim();
    created.value = await userApi.register({
      username: form.username.trim(),
      password: password.value,
      fullName: form.fullName.trim(),
      ...(email ? { email } : {}),
      roles: [role.value],
    });
    tried.value = false;
  } catch (e) {
    const code = e instanceof ApiError && e.code ? e.code : "ERROR";
    const message = e instanceof Error ? e.message : String(e);
    apiErr.value = { code, message };
    const f = FIELD_OF[code];
    if (f) errs.value = { ...errs.value, [f]: code };
  } finally {
    saving.value = false;
  }
}

function reset() {
  Object.assign(form, EMPTY);
  password.value = "";
  showPw.value = false;
  tried.value = false;
  pwTouched.value = false;
  errs.value = {};
  apiErr.value = null;
}

function again() {
  reset();
  created.value = null;
}

const roleName = (code: string) => roles.value.find((r) => r.code === code)?.name ?? code;
</script>

<template>
  <div class="d-flex flex-column ga-4 register">
    <p class="text-medium-emphasis mb-0">{{ t("register.subtitle") }}</p>

    <!-- Form -->
    <template v-if="!created">
      <v-alert v-if="apiErr" type="error" variant="tonal" density="compact">
        <strong>{{ apiErr.code }}</strong> · {{ apiErr.message }}
      </v-alert>

      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">1. {{ t("register.account") }}</v-card-title>
        <v-card-text>
          <div class="grid">
            <v-text-field
              v-for="f in fields"
              :key="f.key"
              v-model="form[f.key]"
              :label="f.label"
              :type="f.type"
              :maxlength="f.max"
              :hint="f.hint"
              persistent-hint
              autocomplete="off"
              :class="{ mono: f.mono }"
              :error-messages="errs[f.key] ? [errs[f.key]!] : []"
              @update:model-value="edit(f.key)"
              @blur="touch(f.key)"
            />
          </div>
        </v-card-text>
      </v-card>

      <v-card>
        <v-card-title class="text-subtitle-1 font-weight-bold">2. {{ t("register.tempPassword") }}</v-card-title>
        <v-card-text class="d-flex flex-column ga-3">
          <div class="d-flex flex-wrap ga-2 align-start">
            <v-text-field
              v-model="password"
              :label="t('register.password')"
              :type="showPw ? 'text' : 'password'"
              autocomplete="new-password"
              class="mono pw"
              :error="tried && !pwOk"
              :error-messages="pwError ? [pwError] : []"
              :hide-details="!pwError"
              @update:model-value="apiErr = null"
              @blur="pwTouched = true"
            />
            <v-btn variant="outlined" height="56" @click="showPw = !showPw">
              {{ showPw ? t("register.hide") : t("register.show") }}
            </v-btn>
            <v-btn variant="outlined" height="56" @click="generate">{{ t("register.generate") }}</v-btn>
          </div>
          <ul class="rules">
            <li v-for="r in rules" :key="r.text" :class="r.ok ? 'text-success' : 'text-medium-emphasis'">
              {{ r.ok ? "✓" : "•" }} {{ r.text }}
            </li>
          </ul>
          <div v-if="tried && password && !pwOk" class="text-body-2 text-error">
            PASSWORD_POLICY_INVALID · {{ t("register.err.policy") }}
          </div>
          <p class="text-body-2 text-medium-emphasis mb-0">{{ t("register.pwNote") }}</p>
        </v-card-text>
      </v-card>

      <v-card>
        <v-card-title class="d-flex flex-wrap align-baseline justify-space-between ga-2">
          <span class="text-subtitle-1 font-weight-bold">3. {{ t("register.role") }}</span>
          <span class="text-body-2 text-medium-emphasis">{{ t("register.roleHint") }}</span>
        </v-card-title>
        <v-card-text>
          <v-progress-linear v-if="rolesLoading" indeterminate class="mb-2" />
          <v-alert v-else-if="rolesError" type="error" variant="tonal" density="compact" class="mb-2">
            <div class="d-flex flex-wrap align-center ga-2">
              <span>GET /roles · {{ rolesError }}</span>
              <v-spacer />
              <v-btn size="small" variant="outlined" @click="loadRoles">{{ t("common.refresh") }}</v-btn>
            </div>
          </v-alert>
          <div v-else-if="!roles.length" class="text-body-2 text-medium-emphasis mb-2">
            {{ t("register.noRoles") }}
          </div>
          <v-radio-group v-model="role" hide-details @update:model-value="edit('role')">
            <div class="grid roles">
              <label
                v-for="r in roles"
                :key="r.code"
                class="role-box"
                :class="{ 'role-box--on': role === r.code }"
              >
                <v-radio :value="r.code" density="compact" hide-details class="flex-grow-0" />
                <span class="font-weight-bold">{{ r.name }}</span>
                <span class="text-caption font-mono text-medium-emphasis">{{ r.code }}</span>
              </label>
            </div>
          </v-radio-group>
          <div v-if="errs.role" class="text-body-2 text-error mt-2">{{ errs.role }}</div>
        </v-card-text>
      </v-card>

      <div class="d-flex flex-wrap justify-end ga-2">
        <v-btn variant="outlined" @click="reset">{{ t("register.reset") }}</v-btn>
        <v-btn color="primary" :loading="saving" @click="submit">{{ t("register.submit") }}</v-btn>
      </div>
    </template>

    <!-- Done -->
    <v-card v-else>
      <v-card-text class="d-flex flex-column ga-4">
        <div class="d-flex align-center ga-3">
          <v-avatar color="success" variant="tonal" size="32"><v-icon icon="mdi-check" /></v-avatar>
          <span class="text-h6 font-weight-bold">{{ t("register.done.title") }}</span>
        </div>
        <div class="grid summary">
          <div>
            <div class="text-caption text-medium-emphasis">{{ t("register.done.username") }}</div>
            <span class="font-mono">{{ created.username }}</span>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">{{ t("register.done.fullName") }}</div>
            {{ created.full_name }}
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">{{ t("register.done.email") }}</div>
            {{ created.email || "-" }}
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">{{ t("register.done.roles") }}</div>
            {{ (created.roles ?? []).map((c) => `${roleName(c)} (${c})`).join(", ") }}
          </div>
          <div>
            <div class="text-caption text-medium-emphasis">{{ t("register.done.status") }}</div>
            <v-chip size="small" color="warning" variant="tonal">{{ t("register.done.mustChange") }}</v-chip>
          </div>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">{{ t("register.done.note") }}</p>
        <div class="d-flex flex-wrap ga-2">
          <v-btn color="primary" @click="again">{{ t("register.done.again") }}</v-btn>
          <v-btn variant="outlined" to="/users/change-password">{{ t("register.done.toPassword") }}</v-btn>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.grid.roles {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  width: 100%;
}
.grid.summary {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}
.pw {
  flex: 1 1 260px;
}
.mono :deep(input) {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
}
.font-mono {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
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
.role-box {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  cursor: pointer;
}
.role-box--on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
}
</style>
