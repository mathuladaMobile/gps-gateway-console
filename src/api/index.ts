import { ApiError, getData, request } from "./http";
import type * as T from "./types";
import { i18n } from "@/i18n";

export * from "./http";
export type * from "./types";

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
  changePassword: (username: string, newPassword: string) =>
    request<T.MessageResponse>("/users/change-password", {
      method: "POST",
      body: { username, newPassword },
    }),
};

export const menuApi = {
  list: () => getData<T.MenuResponse[]>("/menus"),
};

export const systemApi = {
  health: () => request<T.HealthResponse>("/health", { public: true }),
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
  masterCreate: (body: T.DeviceMasterSaveRequest) => deviceApi.masterUpsert(body),
  /** Reopen a closed device via POST /device/master/upsert (deleted = 0) and update its vehicle data. */
  masterReopen: (mId: number, body: T.DeviceMasterSaveRequest) =>
    deviceApi.masterUpsert({ mId, ...body, deleted: 0 }),
  /** Update a device via POST /device/master/upsert. A changed serialNo creates a new device (new mId) with the vehicle data copied. */
  masterUpdate: (mId: number, body: T.DeviceMasterSaveRequest) =>
    deviceApi.masterUpsert({ mId, ...body }),
  /** Close a device via POST /device/master/upsert with only mId and deleted = 1; history is kept. */
  masterDelete: (mId: number) => deviceApi.masterUpsert({ mId, deleted: 1 }),
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
