import type { Component } from "vue";
import { ALL, SA, SA_A, SA_A_OP, type Role } from "./roles";
// ROLES: SA = Super Admin, SA_A = Super Admin + Admin, SA_A_OP = Super Admin + Admin + Operator, ALL = All roles

/** Actions a page may expose; each maps to the roles allowed to perform it. */
export type Action =
  | "view"
  | "export"
  | "add"
  | "update"
  | "delete"
  | "duplicate";
export type Permissions = Partial<Record<Action, Role[]>>;

export interface MenuItem {
  /** English fallback; the UI shows the i18n text */
  title: string;
  path: string;
  name: string;
  icon?: string;
  /** Roles that can see the menu / open the page. */
  roles: Role[];
  /** Per-action permissions inside the page (view defaults to `roles`). */
  permissions?: Permissions;
  /** Data retention for history pages, e.g. '7D', '6M'. */
  retention?: string;
  component: () => Promise<Component>;
}

export interface MenuGroup {
  /** i18n key under `group.` */
  id: string;
  /** English fallback; the UI shows the i18n text */
  title: string;
  icon: string;
  items: MenuItem[];
}

const viewExport = (roles: Role[] = ALL): Permissions => ({
  view: roles,
  export: roles,
});
const manage = (roles: Role[]): Permissions => ({
  add: roles,
  update: roles,
  delete: roles,
  duplicate: roles,
});

// Source: GPS_Gateway_Console(Struct).csv - V.1.0.0
export const menu: MenuGroup[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: "mdi-view-dashboard",
    items: [
      {
        title: "Home",
        path: "/dashboard",
        name: "home",
        icon: "mdi-home",
        roles: ALL,
        component: () => import("@/views/dashboard/HomeView.vue"),
      },
    ],
  },
  {
    id: "monitoring",
    title: "Monitoring",
    icon: "mdi-monitor-eye",
    items: [
      {
        title: "Device Last Status",
        path: "/monitoring/device-last-status",
        name: "device-last-status",
        roles: ALL,
        permissions: viewExport(),
        component: () => import("@/views/monitoring/DeviceLastStatusView.vue"),
      },
      {
        title: "Proxy Last Status",
        path: "/monitoring/proxy-last-status",
        name: "proxy-last-status",
        roles: ALL,
        permissions: viewExport(),
        component: () => import("@/views/monitoring/ProxyLastStatusView.vue"),
      },
      {
        title: "Proxy History (7D)",
        path: "/monitoring/proxy-history",
        name: "proxy-history",
        roles: ALL,
        permissions: viewExport(),
        retention: "7D",
        component: () => import("@/views/monitoring/ProxyHistoryView.vue"),
      },
      {
        title: "DLT History (6M)",
        path: "/monitoring/dlt-history",
        name: "dlt-history",
        roles: ALL,
        permissions: viewExport(),
        retention: "6M",
        component: () => import("@/views/monitoring/DltHistoryView.vue"),
      },
      {
        title: "GPS Data History (6M)",
        path: "/monitoring/gps-data-history",
        name: "gps-data-history",
        roles: ALL,
        permissions: viewExport(),
        retention: "6M",
        component: () => import("@/views/monitoring/GpsDataHistoryView.vue"),
      },
      {
        title: "Device Data Transmission",
        path: "/monitoring/device-data-transmission",
        name: "device-data-transmission",
        roles: ALL,
        component: () =>
          import("@/views/monitoring/DeviceDataTransmissionView.vue"),
      },
    ],
  },
  {
    id: "device",
    title: "Device Management",
    icon: "mdi-cellphone-link",
    items: [
      {
        title: "Master",
        path: "/device/master",
        name: "device-master",
        roles: ALL,
        permissions: {
          ...viewExport(),
          add: SA_A_OP,
          update: SA_A_OP,
          delete: SA_A_OP,
        },
        component: () => import("@/views/device/MasterView.vue"),
      },
      {
        title: "Provider",
        path: "/device/provider",
        name: "device-provider",
        roles: ALL,
        permissions: viewExport(),
        component: () => import("@/views/device/ProviderView.vue"),
      },
      {
        title: "Provider (Wialon Lite)",
        path: "/device/provider-wialon-lite",
        name: "device-provider-wialon-lite",
        roles: SA_A_OP,
        permissions: { ...viewExport(SA_A_OP), ...manage(SA_A_OP) },
        component: () => import("@/views/device/ProviderWialonLiteView.vue"),
      },
    ],
  },
  {
    id: "proxy",
    title: "Proxy",
    icon: "mdi-swap-horizontal",
    items: [
      {
        title: "Assign Destination",
        path: "/proxy/assign-destination",
        name: "proxy-assign-destination",
        roles: SA_A_OP,
        permissions: manage(SA_A_OP),
        component: () => import("@/views/proxy/AssignDestinationView.vue"),
      },
    ],
  },
  {
    id: "users",
    title: "User Management",
    icon: "mdi-account-group",
    items: [
      {
        title: "Register",
        path: "/users/register",
        name: "user-register",
        roles: SA,
        component: () => import("@/views/users/RegisterView.vue"),
      },
      {
        title: "Change User Password",
        path: "/users/change-password",
        name: "user-change-password",
        roles: SA,
        component: () => import("@/views/users/ChangeUserPasswordView.vue"),
      },
      {
        title: "Roles & Permissions",
        path: "/users/roles-permissions",
        name: "user-roles-permissions",
        roles: SA,
        component: () => import("@/views/users/RolesPermissionsView.vue"),
      },
    ],
  },
  {
    id: "systemMonitor",
    title: "System Monitor",
    icon: "mdi-server",
    items: [
      {
        title: "Proxy System",
        path: "/system-monitor/proxy-system",
        name: "sm-proxy-system",
        roles: SA_A,
        component: () => import("@/views/system-monitor/ProxySystemView.vue"),
      },
      {
        title: "GPS Gateway System",
        path: "/system-monitor/gps-gateway-system",
        name: "sm-gps-gateway-system",
        roles: SA_A,
        component: () =>
          import("@/views/system-monitor/GpsGatewaySystemView.vue"),
      },
      {
        title: "App Status",
        path: "/system-monitor/app-status",
        name: "sm-app-status",
        roles: SA_A,
        component: () => import("@/views/system-monitor/AppStatusView.vue"),
      },
      {
        title: "Transaction Log",
        path: "/system-monitor/transaction-log",
        name: "sm-transaction-log",
        roles: SA_A,
        component: () =>
          import("@/views/system-monitor/TransactionLogView.vue"),
      },
    ],
  },
  {
    id: "config",
    title: "System Configuration",
    icon: "mdi-cog",
    items: [
      {
        title: "App",
        path: "/config/app",
        name: "config-app",
        roles: SA,
        permissions: manage(SA),
        component: () => import("@/views/config/AppView.vue"),
      },
      {
        title: "Category",
        path: "/config/category",
        name: "config-category",
        roles: SA,
        permissions: manage(SA),
        component: () => import("@/views/config/CategoryView.vue"),
      },
      {
        title: "Destination",
        path: "/config/destination",
        name: "config-destination",
        roles: SA,
        component: () => import("@/views/config/DestinationView.vue"),
      },
      {
        title: "Destination Schedule",
        path: "/config/destination-schedule",
        name: "config-destination-schedule",
        roles: SA,
        permissions: manage(SA),
        component: () => import("@/views/config/DestinationScheduleView.vue"),
      },
    ],
  },
  {
    id: "account",
    title: "Account",
    icon: "mdi-account-circle",
    items: [
      {
        title: "Change Password",
        path: "/account/change-password",
        name: "account-change-password",
        roles: ALL,
        component: () => import("@/views/account/ChangePasswordView.vue"),
      },
    ],
  },
];

export const menuItems = menu.flatMap((g) => g.items);
