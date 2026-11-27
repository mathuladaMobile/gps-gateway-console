import { ApiError, getData, request } from "./http";
import type * as T from "./types";
import { i18n } from "@/i18n";

export * from "./http";
export type * from "./types";

/** Query string from the set (non-empty) values of `params`. */
const queryString = (params: object) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();

/** Placeholder for endpoints the backend doesn't provide yet. */
const notAvailable = <R>(): Promise<R> =>
  Promise.reject(new ApiError(i18n.global.t("common.apiNotAvailable"), 501));

export const authApi = {
  login: (username: string, password: string) =>
    request<T.APIResponse<T.LoginResponse>>("/auth/login", {
      method: "POST",
      body: { username, password },
      headers: { "X-Device-Name": "gps-gateway-console" },
      public: true,
    }),
  logout: (refresh_token: string) =>
    request<T.MessageResponse>("/auth/logout", {
      method: "POST",
      body: { refresh_token },
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<T.MessageResponse>("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    }),
};

export const userApi = {
  /** Users whose role is below the caller's; the backend returns ACTIVE only unless `status` is given. */
  list: async (status?: T.UserStatus | "ALL"): Promise<T.UserListResponse> => {
    const qs = queryString({ status });
    const data = await getData<T.UserListResponse | T.UserListItem[]>(`/users${qs ? `?${qs}` : ""}`);
    // Older backends sent a plain array
    return Array.isArray(data) ? { items: data } : { items: data?.items ?? [], summary: data?.summary };
  },
  /** Replace the user's role (one role code, e.g. ["OPERATOR"]). */
  updateRoles: (userId: number, roles: string[]) =>
    request<T.MessageResponse>(`/users/${userId}/roles`, {
      method: "PUT",
      body: { roles },
    }),
  /** Enable (ACTIVE) or disable (INACTIVE) a user. */
  setStatus: (userId: number, status: T.UserStatus) =>
    request<T.MessageResponse>(`/users/${userId}/status`, {
      method: "PATCH",
      body: { status },
    }),
  changePassword: (username: string, newPassword: string) =>
    request<T.MessageResponse>("/users/change-password", {
      method: "POST",
      body: { username, newPassword },
    }),
  /** Create a user; they must change the password on first login. */
  register: (body: T.UserRegisterRequest) =>
    getData<T.UserListItem>("/users/register", { method: "POST", body }),
  /** Roles the caller may assign (lower than their own). */
  roles: async () =>
    (await getData<T.RoleResponse[]>("/roles")).map((r) => ({
      code: r.code ?? r.role_code ?? r.roleCode ?? "",
      name: r.name ?? r.role_name ?? r.roleName ?? r.code ?? r.role_code ?? r.roleCode ?? "",
      role_level: r.role_level ?? r.roleLevel ?? r.level,
    })).filter((r) => r.code) as T.RoleOption[],
};

export const menuApi = {
  list: () => getData<T.MenuResponse[]>("/menus"),
};

export const systemApi = {
  health: () => request<T.HealthResponse>("/health", { public: true }),
};

export const dashboardApi = {
  get: () => getData<T.DashboardResponse>("/dashboard"),
  proxyModels: (proxyCode: string) =>
    getData<T.DashboardProxyModels>(
      `/dashboard/proxy-models?${queryString({ proxyCode })}`,
    ),
};

export const categoryApi = {
  list: () => getData<T.CategoryResponse[]>("/category"),
};

export const destinationApi = {
  list: () => getData<T.DestinationSelect[]>("/destination/selected"),
  info: () => getData<T.DestinationInfoResponse[]>("/destination/info"),
};

export const deviceApi = {
  /** Every device with summary counts and the MI / Provider cache info. */
  lastStatus: () =>
    request<T.DeviceLastStatusEnvelope>("/device/laststatus", {
      method: "POST",
    }),
  master: () => getData<T.DeviceMasterResponse>("/device/master"),
  // TODO: no endpoints for these yet
  /** Number of destinations each device is sending to, keyed by mId. */
  masterDestinationCounts: () => notAvailable<Record<number, number>>(),
  /** Create a device via POST /device/master/upsert (no mId). Required: serialNo, categoryId, GPSModelCode, provinceCode. */
  masterCreate: (body: T.DeviceMasterSaveRequest) =>
    deviceApi.masterUpsert(body),
  /** Reopen a closed device via POST /device/master/upsert (deleted = 0) and update its vehicle data. */
  masterReopen: (mId: number, body: T.DeviceMasterSaveRequest) =>
    deviceApi.masterUpsert({ mId, ...body, deleted: 0 }),
  /** Update a device via POST /device/master/upsert. A changed serialNo creates a new device (new mId) with the vehicle data copied. */
  masterUpdate: (mId: number, body: T.DeviceMasterSaveRequest) =>
    deviceApi.masterUpsert({ mId, ...body }),

  // ต้องปิดส่งทุกปลายทางก่อน · เปิดกลับมาได้ด้วย POST /device/master/upsert (serial เดิม → RESTORE)
  masterDelete: (mId: number) =>
    request<T.MessageResponse>("/device/master/" + mId, {
      method: "DELETE",
    }),

  /** Update the device's data (Assign Destination, part 1); without `mId` it creates a device. */
  masterUpsert: (
    body: T.DeviceMasterUpsertRequest | { mId: number; deleted: number },
  ) =>
    request<T.MessageResponse>("/device/master/upsert", {
      method: "POST",
      body,
    }),
  /** The device plus its state on every proxy (Assign Destination). */
  destinationInfo: (mId: number) =>
    getData<T.DeviceDestinationInfo>(`/device/destination/info/${mId}`),
  /** OPEN / CLOSE a proxy that needs no registration. */
  destinationAssign: (body: T.DestinationAssignRequest) =>
    getData<T.DestinationAssignResult>("/device/destination/assign", {
      method: "POST",
      body,
    }),
  /** Latest registration of a device at a destination (fills the register popup). */
  registerInfo: (mId: number, proxyCode: string) =>
    getData<T.RegistrationInfo>(
      `/device/destination/register/info?${new URLSearchParams({ mId: String(mId), proxyCode })}`,
    ),
  /** ADD / UPDATE / REMOVE at the destination (shared by every proxy). */
  destinationRegister: (body: T.DestinationRegisterRequest) =>
    getData<T.RegisterResult>("/device/destination/register", {
      method: "POST",
      body,
    }),

  /** Devices registered at a destination now (DeviceRegistration), newest change first. */
  registrations: (q: T.DeviceRegistrationQuery) =>
    getData<T.DeviceRegistrationPage>(
      `/device/destination/registrations?${queryString(q)}`,
    ),
  /** Filter options for the registration log. */
  registrationLogInfo: () =>
    getData<T.RegistrationLogInfo>("/device/destination/registrations/log"),
  /** Every ADD / UPDATE / REMOVE call to a destination, successful or not. */
  registrationLog: (body: T.RegistrationLogQuery) =>
    getData<T.RegistrationLogPage>("/device/destination/registrations/log", {
      method: "POST",
      body,
    }),

  proxyLastStatus: (body: T.ProxyLastStatusRequest) =>
    getData<T.ProxyLastStatus[]>("/device/proxy/laststatus", {
      method: "POST",
      body,
    }),
  proxyHistoryInfo: () => getData<T.ProxyHistory>("/device/proxy/history"),
  proxyHistory: (body: T.ProxyHistoryRequest) =>
    getData<T.DeviceProxyHistoryResponse[]>("/device/proxy/history", {
      method: "POST",
      body,
    }),

  dltHistoryInfo: () => getData<T.DLTHistory>("/device/dlt/history"),
  dltHistory: (body: T.DLTHistoryRequest) =>
    getData<T.DLTHistoryResponse[]>("/device/dlt/history", {
      method: "POST",
      body,
    }),

  transmissionInfo: () =>
    getData<T.TransMonitorInfo>("/device/transmission/monitoring"),
  transmission: (serialno: string[]) =>
    getData<T.TransMonitorResponse>("/device/transmission/monitoring", {
      method: "POST",
      body: { serialno },
    }),
};

export const providerApi = {
  list: () => getData<T.CategoryResponse[]>("/provider"),
  devices: (categoryId: string) =>
    getData<(T.DeviceFELite | T.DeviceFEPro)[]>("/provider/device", {
      method: "POST",
      body: { categoryId },
    }),
  historyInfo: () =>
    request<T.APIResponse<T.Category[]>>("/provider/device/history"),
  history: (body: T.ProviderHistoryRequest) =>
    getData<T.ProviderHistoryResponse>("/provider/device/history", {
      method: "POST",
      body,
    }),
};
