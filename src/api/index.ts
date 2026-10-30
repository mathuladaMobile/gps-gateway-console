import { getData, request } from './http'
import type * as T from './types'

export * from './http'
export type * from './types'

export const authApi = {
  login: (username: string, password: string) =>
    request<T.APIResponse<T.LoginResponse>>('/auth/login', {
      method: 'POST',
      body: { username, password },
      headers: { 'X-Device-Name': 'gps-gateway-console' },
      public: true,
    }),
  logout: (refresh_token: string) =>
    request<T.MessageResponse>('/auth/logout', { method: 'POST', body: { refresh_token } }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<T.MessageResponse>('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
}

export const userApi = {
  changePassword: (username: string, newPassword: string) =>
    request<T.MessageResponse>('/users/change-password', { method: 'POST', body: { username, newPassword } }),
}

export const menuApi = {
  list: () => getData<T.MenuResponse[]>('/menus'),
}

export const systemApi = {
  health: () => request<T.HealthResponse>('/health', { public: true }),
}

export const categoryApi = {
  list: () => getData<T.CategoryResponse[]>('/category'),
}

export const destinationApi = {
  list: () => getData<T.DestinationSelect[]>('/destination/selected'),
}

export const deviceApi = {
  lastStatus: () => getData<T.DeviceLastStatusResponse[]>('/device/laststatus', { method: 'POST' }),
  master: () => getData<T.DeviceMasterResponse>('/device/master'),

  proxyLastStatus: (body: T.ProxyLastStatusRequest) =>
    getData<T.ProxyLastStatus[]>('/device/proxy/laststatus', { method: 'POST', body }),
  proxyHistoryInfo: () => getData<T.ProxyHistory>('/device/proxy/history'),
  proxyHistory: (body: T.ProxyHistoryRequest) =>
    getData<T.DeviceProxyHistoryResponse[]>('/device/proxy/history', { method: 'POST', body }),

  dltHistoryInfo: () => getData<T.DLTHistory>('/device/dlt/history'),
  dltHistory: (body: T.DLTHistoryRequest) =>
    getData<T.DLTHistoryResponse[]>('/device/dlt/history', { method: 'POST', body }),

  transmissionInfo: () => getData<T.TransMonitorInfo>('/device/transmission/monitoring'),
  transmission: (serialno: string[]) =>
    getData<T.TransMonitorResponse>('/device/transmission/monitoring', { method: 'POST', body: { serialno } }),
}

export const providerApi = {
  list: () => getData<T.CategoryResponse[]>('/provider'),
  devices: (categoryId: string) =>
    getData<(T.DeviceFELite | T.DeviceFEPro)[]>('/provider/device', { method: 'POST', body: { categoryId } }),
  historyInfo: () => request<T.APIResponse<T.Category[]>>('/provider/device/history'),
  history: (body: T.ProviderHistoryRequest) =>
    getData<T.ProviderHistoryResponse>('/provider/device/history', { method: 'POST', body }),
}
