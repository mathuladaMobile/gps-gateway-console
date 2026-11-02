// DTOs from GPS Gateway API swagger (/swagger/doc.json)

export interface APIResponse<T> {
  code: string
  count?: number
  data: T
  message: string
  success: boolean
  errors?: ProviderSourceError[]
}

export interface MessageResponse {
  code: string
  message: string
  success: boolean
}

// auth
export interface LoginResponse {
  access_token: string
  refresh_token: string
  full_name: string
  roles: string[]
  user_id: number
  username: string
}

export interface RefreshResponse {
  access_token: string
  refresh_token: string
}

// menu
export interface PermissionResponse {
  permission_code: string
  permission_id: number
  permission_name: string
}

export interface MenuResponse {
  menu_id: number
  menu_code: string
  parent_menu_id: number
  route: string
  icon: string
  sort_order: number
  permissions: PermissionResponse[]
  children: MenuResponse[]
}

// category / provider
export interface ConfigCategory {
  chunk_size: number
  limit_location: number
  maxback: number
  safety_time: number
}

export interface CategoryResponse {
  categoryId: string
  categoryName: string
  config: ConfigCategory
  updatedAt: string
}

export interface DeviceFELite {
  accountID: string
  chassisNo: string
  deviceID: string
  diwSendData: boolean
  dltPlateNo: string
  dltSendData: boolean
  equipmentType: string
  serialNumber: string
}

export interface DeviceFEPro {
  equipmentType: string
  serialNumber: string
}

export interface Category {
  categoryId: string
  categoryName: string
  deleted: boolean
  deviceCount: number
  updatedAt: string
  FEL: DeviceFELite[]
  FEP: DeviceFEPro[]
}

export interface ProviderSourceError {
  message: string
  source: string
}

export interface ProviderHistoryRequest {
  categoryId: string
  equipmentType: string
  serialNumber: string
  start: string
  end: string
}

export interface ProviderHistoryResponse {
  category_id: string
  items: Record<string, unknown>[]
  total: number
}

// destination
export interface DestinationSelect {
  lastsentAt: string
  name: string
  proxyCode: string
  tmId: number
  tmType: string
}

// device
export interface ProxyList {
  categoryId: string
  gpsModelName: string
  mId: number
  plateNo: string
  serialNo: string
}

export interface DeviceLastStatusResponse {
  additionalStatus: string
  ageSec: number
  categoryId: string
  createdAt: string
  customerName: string
  deviceId: string
  diffMISec: number | null
  diffProviderSec: number | null
  driveInfo: string
  engineOffTime: string
  engineStatus: boolean
  eventTime: string
  generateTime: string
  gpsModelName: string
  latitude: number
  longitude: number
  mId: number
  phoneNo: string
  plateNo: string
  receiveTime: string
  recordNo: number
  recordTime: string
  recordTimeMI: string
  recordTimeProvider: string
  serialNo: string
  swipeTime: string
  swipeType: number
  updatedAt: string
}

export interface ProxyLastStatusRequest {
  proxycode: string
  tmId?: number
}

export interface ProxyLastStatus {
  categoryId: string
  createdAt: string
  deleted: boolean
  derivedId: number
  deviceId: string
  gpsModelName: string
  mId: number
  plateNo: string
  proxyCode: string
  recordTime: string
  sentMsgReply: string
  sentStatus: number
  sentTime: string
  serialNo: string
  tlId: number
  tmId: number
  updatedAt: string
}

export interface ProxyHistory {
  destination: DestinationSelect[]
  destinationCount: number
  device: ProxyList[]
  deviceCount: number
}

export interface ProxyHistoryRequest {
  mId: number
  tmId: number
  start: string
  end: string
}

export interface DeviceProxyHistoryResponse {
  CreatedAt: string
  categoryId: string
  derivedId: number
  gpsModel: string
  locationJson: unknown
  mId: number
  plateNo: string
  proxyCode: string
  receiveTime: string
  recordTime: string
  sentMsgReply: string
  sentStatus: number
  sentTime: string
  serialNo: string
  tl_Id: number
  tmId: number
  typeLocation: string
}

export interface DLTHistory {
  device: ProxyList[]
  deviceCount: number
}

export interface DLTHistoryRequest {
  mId: number
  start: string
  end: string
}

export interface DLTHistoryResponse {
  alt: number
  categoryId: string
  course: number
  createdAt: string
  derivedId: number
  driverId: string
  engineStatus: number
  extPower: number
  extPowerStatus: number
  fix: number
  gpsModel: string
  gsmCell: number
  gsmLoc: number
  gsmRssi: number
  hdop: number
  highAccCount: number
  highDecCount: number
  jammer: number
  lat: number
  license: string
  lon: number
  mId: number
  maxSpeed: number
  mileage: number
  numSats: number
  overSpeedCount: number
  plateNo: string
  proxyCode: string
  receiveTime: string
  recordTime: string
  recvUtcTs: string
  sentStatus: number
  sentTime: string
  serialNo: string
  speed: number
  tmId: number
  typeLocation: string
  unitId: string
  utcTs: string
}

export interface DevicesResponse {
  GPSModelCode: number
  GPSModelName: string
  accountId: string
  categoryId: string
  chassis: string
  createdAt: string
  deleted: boolean
  deviceId: string
  gpsDltModelId: string
  imeiNo: string
  mId: number
  plateNo: string
  provinceCode: number
  provinceName: string
  provinceShortName: string
  serialNo: string
  updatedAt: string
}

export interface GPSModelResponse {
  categoryId: string
  gpsDltModelId: string
  gpsModelCode: number
  gpsModelName: string
}

export interface ProvinceResponse {
  provinceId: number
  provinceName: string
  provinceShortName: string
}

export interface DeviceMasterResponse {
  categories: CategoryResponse[]
  categoriesError: string
  devices: DevicesResponse[]
  devicesError: string
  gpsModels: GPSModelResponse[]
  gpsModelsError: string
  provinces: ProvinceResponse[]
  provincesError: string
}

// TODO: not in the API yet; field names follow DevicesResponse until the backend defines them
export interface DeviceMasterSaveRequest {
  serialNo: string
  categoryId: string
  GPSModelCode: number | null
  plateNo: string
  provinceCode: number | null
  accountId: string
  deviceId: string
  chassis: string
}

export interface TransMonitorInfo {
  devices: DevicesResponse[]
}

export interface ProxyLastResponse {
  proxyCode: string
  recordTime: string
  sentMsgReply: string
  sentStatus: number
  sentTime: string
  tmId: number
}

export interface DeviceTransMonitorResponse {
  GPSModelName: string | null
  driveInfo: string | null
  engineOffTime: string | null
  found: boolean
  mId: number | null
  plateNo: string | null
  provinceName: string | null
  proxy: ProxyLastResponse[] | null
  recordTime: string | null
  serialNo: string
  swipeTime: string | null
  swipeType: number | null
}

export interface TransMonitorResponse {
  devices: DeviceTransMonitorResponse[]
}

export interface HealthResponse {
  APP_ENV: string
  app: string
  go_version: string
  status: string
}
