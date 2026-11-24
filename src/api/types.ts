// DTOs from GPS Gateway API swagger (/swagger/doc.json)

export interface APIResponse<T> {
  code: string;
  count?: number;
  data: T;
  message: string;
  success: boolean;
  errors?: ProviderSourceError[];
}

export interface MessageResponse {
  code: string;
  message: string;
  success: boolean;
}

// auth
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  full_name: string;
  roles: string[];
  user_id: number;
  username: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

// menu
export interface PermissionResponse {
  permission_code: string;
  permission_id: number;
  permission_name: string;
}

export interface MenuResponse {
  menu_id: number;
  menu_code: string;
  parent_menu_id: number;
  route: string;
  icon: string;
  sort_order: number;
  permissions: PermissionResponse[];
  children: MenuResponse[];
}

// category / provider
export interface ConfigCategory {
  chunk_size: number;
  limit_location: number;
  maxback: number;
  safety_time: number;
}

export interface CategoryResponse {
  categoryId: string;
  categoryName: string;
  config: ConfigCategory;
  updatedAt: string;
}

export interface DeviceFELite {
  accountID: string;
  chassisNo: string;
  deviceID: string;
  diwSendData: boolean;
  dltPlateNo: string;
  dltSendData: boolean;
  equipmentType: string;
  serialNumber: string;
}

export interface DeviceFEPro {
  equipmentType: string;
  serialNumber: string;
}

export interface Category {
  categoryId: string;
  categoryName: string;
  deleted: boolean;
  deviceCount: number;
  updatedAt: string;
  FEL: DeviceFELite[];
  /** /provider/device/history returns only the serial for FEP (Pro) devices */
  FEP: HistoryDeviceFEP[];
}

export interface HistoryDeviceFEP {
  serialNumber: string;
}

/** A device in the GPS Data History picker: FEL has equipmentType, FEP only a serial */
export type HistoryDevice = DeviceFELite | HistoryDeviceFEP;

export interface ProviderSourceError {
  message: string;
  source: string;
}

export interface ProviderHistoryRequest {
  categoryId: string;
  /** Sent for FEL devices only; FEP devices have no equipmentType */
  equipmentType?: string;
  serialNumber: string;
  start: string;
  end: string;
}

export interface ProviderHistoryResponse {
  category_id: string;
  items: Record<string, unknown>[];
  total: number;
}

// destination
export interface DestinationSelect {
  lastsentAt: string;
  name: string;
  proxyCode: string;
  tmId: number;
  tmType: string;
}

export interface Models {
  gpsModelCode: number;
  name: string;
  categoryId: string;
}
export interface DestinationInfoResponse {
  proxyCode: string;
  registerType: string;
  canRemove: boolean;
  sendLines: number;
  modelCount: number;
  models: Models[];
}

// device
export interface ProxyList {
  categoryId: string;
  gpsModelName: string;
  mId: number;
  plateNo: string;
  serialNo: string;
}

export interface DeviceLastStatusResponse {
  additionalStatus: string;
  ageSec: number;
  categoryId: string;
  createdAt: string;
  customerName: string;
  deviceId: string;
  diffMISec: number | null;
  diffProviderSec: number | null;
  driveInfo: string;
  engineOffTime: string;
  engineStatus: boolean;
  eventTime: string;
  generateTime: string;
  gpsModelName: string;
  latitude: number;
  longitude: number;
  mId: number;
  phoneNo: string;
  plateNo: string;
  receiveTime: string;
  recordNo: number;
  recordTime: string;
  recordTimeMI: string;
  recordTimeProvider: string;
  serialNo: string;
  provinceName?: string;
  /** ONLINE = ageSec ≤ summary.onlineMinutes · OFFLINE = older · NEVER = no recordTime yet */
  status: DeviceLastStatus;
  swipeTime: string;
  swipeType: number;
  updatedAt: string;
}

export type DeviceLastStatus = "ONLINE" | "OFFLINE" | "NEVER";

export interface DeviceLastStatusSummary {
  total: number;
  online: number;
  offline: number;
  never: number;
  /** |diffMISec| > mismatchSec */
  mismatchMI: number;
  /** |diffProviderSec| > mismatchSec */
  mismatchProvider: number;
  mismatchSec: number;
  onlineMinutes: number;
}

/** MI / Provider comparison data comes from a cache refreshed every ttlSec. */
export interface DeviceLastStatusRef {
  /** When the comparison data was last fetched, `YYYY-MM-DD HH:mm:ss` */
  at: string;
  ageSec: number;
  ttlSec: number;
}

export interface ProviderSourceError {
  /** WIALON | FEL | FEP | PROVINCE */
  source: string;
  message: string;
}

/** POST /device/laststatus */
export interface DeviceLastStatusEnvelope {
  success: boolean;
  /** SUCCESS | PARTIAL_SUCCESS */
  code: string;
  count: number;
  data: DeviceLastStatusResponse[];
  summary?: DeviceLastStatusSummary;
  ref?: DeviceLastStatusRef;
  /** Set when code = PARTIAL_SUCCESS */
  errors?: ProviderSourceError[];
}

export interface ProxyLastStatusRequest {
  proxycode: string;
  tmId?: number;
}

export interface ProxyLastStatus {
  categoryId: string;
  createdAt: string;
  deleted: boolean;
  derivedId: number;
  deviceId: string;
  gpsModelName: string;
  mId: number;
  plateNo: string;
  proxyCode: string;
  recordTime: string;
  sentMsgReply: string;
  sentStatus: number;
  sentTime: string;
  serialNo: string;
  tlId: number;
  tmId: number;
  updatedAt: string;
}

export interface ProxyHistory {
  destination: DestinationSelect[];
  destinationCount: number;
  device: ProxyList[];
  deviceCount: number;
}

export interface ProxyHistoryRequest {
  mId: number;
  tmId: number;
  start: string;
  end: string;
}

export interface DeviceProxyHistoryResponse {
  CreatedAt: string;
  categoryId: string;
  derivedId: number;
  gpsModel: string;
  locationJson: unknown;
  mId: number;
  plateNo: string;
  proxyCode: string;
  receiveTime: string;
  recordTime: string;
  sentMsgReply: string;
  sentStatus: number;
  sentTime: string;
  serialNo: string;
  tl_Id: number;
  tmId: number;
  typeLocation: string;
}

export interface DLTHistory {
  device: ProxyList[];
  deviceCount: number;
}

export interface DLTHistoryRequest {
  mId: number;
  start: string;
  end: string;
}

export interface DLTHistoryResponse {
  alt: number;
  categoryId: string;
  course: number;
  createdAt: string;
  derivedId: number;
  driverId: string;
  engineStatus: number;
  extPower: number;
  extPowerStatus: number;
  fix: number;
  gpsModel: string;
  gsmCell: number;
  gsmLoc: number;
  gsmRssi: number;
  hdop: number;
  highAccCount: number;
  highDecCount: number;
  jammer: number;
  lat: number;
  license: string;
  lon: number;
  mId: number;
  maxSpeed: number;
  mileage: number;
  numSats: number;
  overSpeedCount: number;
  plateNo: string;
  proxyCode: string;
  receiveTime: string;
  recordTime: string;
  recvUtcTs: string;
  sentStatus: number;
  sentTime: string;
  serialNo: string;
  speed: number;
  tmId: number;
  typeLocation: string;
  unitId: string;
  utcTs: string;
}

export interface DevicesResponse {
  GPSModelCode: number;
  GPSModelName: string;
  accountId: string;
  categoryId: string;
  chassis: string;
  createdAt: string;
  deleted: boolean;
  deviceId: string;
  gpsDltModelId: string;
  imeiNo: string;
  mId: number;
  plateNo: string;
  provinceCode: number;
  provinceName: string;
  provinceShortName: string;
  serialNo: string;
  updatedAt: string;
}

export interface GPSModelResponse {
  categoryId: string;
  gpsDltModelId: string;
  gpsModelCode: number;
  gpsModelName: string;
}

export interface ProvinceResponse {
  provinceId: number;
  provinceName: string;
  provinceShortName: string;
}

export interface DeviceMasterResponse {
  categories: CategoryResponse[];
  categoriesError: string;
  devices: DevicesResponse[];
  devicesError: string;
  gpsModels: GPSModelResponse[];
  gpsModelsError: string;
  provinces: ProvinceResponse[];
  provincesError: string;
}

// TODO: not in the API yet; field names follow DevicesResponse until the backend defines them
export interface DeviceMasterSaveRequest {
  serialNo: string;
  categoryId: string;
  GPSModelCode: number | null;
  plateNo: string;
  provinceCode: number | null;
  accountId: string;
  deviceId: string;
  chassis: string;
  imeiNo: string;
}

/** POST /device/master/upsert: with `mId` updates that device, without it creates one. */
export interface DeviceMasterUpsertRequest extends DeviceMasterSaveRequest {
  mId?: number;
  /** 0 reopens a closed device, 1 closes it. */
  deleted?: number;
}

export type AssignAction = "OPEN" | "CLOSE";
export type RegisterAction = "ADD" | "UPDATE" | "REMOVE";

/** One sending line (DeviceDestination) of a proxy. */
export interface DestinationLine {
  tmId: number;
  tmType: string;
  description: string;
  sending: boolean;
}

/** A device's state on one proxy (dto.ProxyDestination). */
export interface ProxyDestination {
  proxyCode: string;
  /** The device's GPS model is in this proxy's ProxyDeviceType; false = can only be closed */
  supported: boolean;
  /** GPS models this proxy supports, to show when `supported` is false */
  supportedModels: string[];
  /** Sending on at least one line */
  sending: boolean;
  /** Sending on only some lines (old data) */
  partial: boolean;
  lines: DestinationLine[];
  /** From DestinationRegister (no row = false) */
  requireRegister: boolean;
  /** From DeviceRegistration */
  registered: boolean;
  registeredAt: string | null;
  /** ADD | UPDATE, only when requireRegister */
  nextAction?: "ADD" | "UPDATE" | "";
  canAdd: boolean;
  canUpdate: boolean;
  canRemove: boolean;
}

/** GET /device/destination/info/:mId */
export interface DeviceDestinationInfo {
  device: DevicesResponse;
  supported: ProxyDestination[];
  /** Proxies the device's model supports */
  supportedCount: number;
  /** Proxies currently sending */
  sendingCount: number;
}

export interface DestinationAssignRequest {
  mId: number;
  proxyCode: string;
  action: AssignAction;
}

export interface DestinationAssignResult {
  action: string;
  /** DeviceDestination lines added / reopened / removed */
  lines: number;
  mId: number;
  proxyCode: string;
}

/** A page of rows from a server-paginated endpoint. */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** GET /device/destination/registrations: one device's current registration at one destination. */
export interface DeviceRegistrationRow {
  mId: number;
  serialNo: string;
  plateNo: string | null;
  deviceId: string | null;
  imeiNo: string | null;
  categoryId: string | null;
  proxyCode: string;
  regRef: string | null;
  /** ADD | UPDATE (REMOVEd devices are not listed) */
  lastAction: RegisterAction;
  /** Body of the last successful register call */
  payload: Record<string, unknown> | null;
  /** Destination's answer to that call */
  response: unknown;
  registeredAt: string | null;
  registeredBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface DeviceRegistrationQuery {
  proxyCode?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export interface DeviceRegistrationPage extends Paged<DeviceRegistrationRow> {
  /** Registered devices per proxy; only on page 1 and not affected by the filters */
  byProxy?: { proxyCode: string; count: number }[];
}

export type RegistrationResult = "SUCCESS" | "FAILED";

/** GET /device/destination/registrations/log: options for the filters. */
export interface RegistrationLogInfo {
  proxies: string[];
  /** Devices with a log in the last year, with the proxies they have a log at */
  devices: {
    mId: number;
    serialNo: string;
    plateNo: string | null;
    proxyCodes: string[];
  }[];
  actions: RegisterAction[];
  results: RegistrationResult[];
}

/** POST /device/destination/registrations/log: `from` / `to` are required, other filters left empty are omitted. */
export interface RegistrationLogQuery {
  /** `YYYY-MM-DD HH:mm:ss` */
  from: string;
  /** `YYYY-MM-DD HH:mm:ss` */
  to: string;
  mId?: number;
  proxyCode?: string;
  action?: RegisterAction;
  result?: RegistrationResult;
  search?: string;
  page: number;
  pageSize: number;
}

/** One call to a destination's register API (DeviceRegistrationLog). */
export interface RegistrationLogRow {
  logId: number;
  mId: number;
  serialNo: string;
  deviceId: string | null;
  imeiNo: string | null;
  plateNo: string | null;
  proxyCode: string;
  action: RegisterAction;
  result: RegistrationResult;
  /** null when the request never got an HTTP answer (timeout, validation) */
  httpStatus: number | null;
  /** Why the call failed; empty on success */
  errorMessage: string | null;
  payload: unknown;
  response: unknown;
  createdAt: string;
  createdBy: string | null;
}

export type RegistrationLogPage = Paged<RegistrationLogRow>;

/** GET /device/destination/register/info: the device's current registration at a destination. */
export interface RegistrationInfo {
  mId: number;
  proxyCode: string;
  registered: boolean;
  /** ADD (not registered yet) | UPDATE (already registered) */
  nextAction: "ADD" | "UPDATE";
  lastAction: string | null;
  regRef: string | null;
  /** Last sent register data; fills the popup first */
  payload: Record<string, unknown> | null;
  /** Default values from the destination config, for fields missing from `payload` */
  defaults: Record<string, unknown> | null;
  registeredAt: string | null;
  registeredBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

/** POST /device/destination/register */
export interface DestinationRegisterRequest {
  mId: number;
  proxyCode: string;
  action: RegisterAction;
  form?: Record<string, unknown>;
}

export interface RegisterResult {
  action: string;
  httpStatus: number;
  /** DeviceRegistrationLog.logId */
  logId: number;
  mId: number;
  proxyCode: string;
  payload: unknown;
  response: string;
}

export interface TransMonitorInfo {
  devices: DevicesResponse[];
}

export interface ProxyLastResponse {
  proxyCode: string;
  recordTime: string;
  sentMsgReply: string;
  sentStatus: number;
  sentTime: string;
  tmId: number;
}

export interface DeviceTransMonitorResponse {
  GPSModelName: string | null;
  driveInfo: string | null;
  engineOffTime: string | null;
  found: boolean;
  mId: number | null;
  plateNo: string | null;
  provinceName: string | null;
  proxy: ProxyLastResponse[] | null;
  recordTime: string | null;
  serialNo: string;
  swipeTime: string | null;
  swipeType: number | null;
}

export interface TransMonitorResponse {
  devices: DeviceTransMonitorResponse[];
}

export interface HealthResponse {
  APP_ENV: string;
  app: string;
  go_version: string;
  status: string;
}

// dashboard
export interface DashboardSummary {
  /** tmId × category with bound devices */
  destinations: number;
  alert: number;
  wait: number;
  ok: number;
  devices: number;
  online: number;
  offline: number;
  /** Categories with needAlert */
  genAlert: number;
  /** ERROR / STALE apps; counted for SUPER_ADMIN / ADMIN only */
  appProblems: number;
  /** alert + wait + genAlert + appProblems */
  problems: number;
}

export interface DashboardModelStat {
  categoryId: string;
  model: string;
  total: number;
  online: number;
  offline: number;
}

export interface DashboardGenerator {
  /** FEL | FEP */
  categoryId: string;
  /** Latest data of the category, `YYYY-MM-DD HH:mm:ss.SSS` */
  maxRecordTime: string | null;
  /** Minutes from maxRecordTime to now (DB time) */
  agoMinute: number | null;
  needAlert: boolean;
  devices: number;
  online: number;
  offline: number;
  models: DashboardModelStat[];
}

export type DashboardAlertStatus = "ALERT" | "WAIT" | "OK";

export interface DashboardDestination {
  alertStatus: DashboardAlertStatus;
  proxyCode: string;
  tmId: number;
  tmType: string;
  categoryId: string;
  vehicleCount: number;
  lastSuccessTime: string | null;
  /** Minutes since the last successful send */
  successDiffM: number | null;
  /** Minutes since the latest data waiting to be sent */
  recordDiffM: number | null;
}

export interface DashboardApp {
  appId: string;
  appName: string;
  /** ERROR | STALE */
  health: "ERROR" | "STALE";
  healthNote: string;
  lastStatus: string;
  agoSec: number;
}

/** GET /dashboard */
export interface DashboardResponse {
  summary: DashboardSummary;
  onlineMinutes: number;
  generators: DashboardGenerator[];
  /** Every destination, ALERT → WAIT → OK */
  destinations: DashboardDestination[];
  /** Options for the "by destination" proxy dropdown */
  proxyCodes: string[];
  /** null unless SUPER_ADMIN / ADMIN */
  apps: { problems: DashboardApp[]; total: number } | null;
}

/** GET /dashboard/proxy-models?proxyCode= */
export interface DashboardProxyModels {
  proxyCode: string;
  /** tmType of the open send lines */
  lines: string[];
  total: number;
  online: number;
  offline: number;
  models: DashboardModelStat[];
}
