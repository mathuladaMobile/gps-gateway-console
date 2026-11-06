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
  lastStatus: () =>
    getData<T.DeviceLastStatusResponse[]>("/device/laststatus", {
      method: "POST",
    }),
  master: () => getData<T.DeviceMasterResponse>("/device/master"),
  // TODO: no endpoints for these yet
  /** Number of destinations each device is sending to, keyed by mId. */
  masterDestinationCounts: () => notAvailable<Record<number, number>>(),
  masterCreate: (_body: T.DeviceMasterSaveRequest) =>
    notAvailable<T.MessageResponse>(),
  /** Set deleted = 0 on a closed device and update its vehicle data. */
  masterReopen: (_mId: number, _body: T.DeviceMasterSaveRequest) =>
    notAvailable<T.MessageResponse>(),
  /** A changed serialNo creates a new device (new mId) with the vehicle data copied. */
  masterUpdate: (_mId: number, _body: T.DeviceMasterSaveRequest) =>
    notAvailable<T.MessageResponse>(),
  /** Set deleted = 1; history is kept. */
  masterDelete: (_mId: number) => notAvailable<T.MessageResponse>(),
  /** Destinations of a device, with sending / registration state. */
  destinations: (_mId: number) =>
    notAvailable<T.DeviceDestinationStatus[]>(),
  /** OPEN / CLOSE a proxy that needs no registration (/device/destination/assign). */
  destinationAssign: (_body: T.DestinationAssignRequest) =>
    notAvailable<T.MessageResponse>(),
  /** Register dialog fields; `fromMId` fills the form from another device (Duplicate). */
  registerForm: (
    _mId: number,
    _proxyCode: string,
    _action: T.RegisterAction,
    _fromMId?: number,
  ) => notAvailable<T.RegisterFormResponse>(),
  /** ADD / UPDATE / REMOVE at the destination (/device/destination/register). */
  destinationRegister: (_body: T.DestinationRegisterRequest) =>
    notAvailable<T.MessageResponse>(),

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
