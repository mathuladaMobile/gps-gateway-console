# GPS Gateway Console (v1.0.0)

Vue 3 + Vuetify 3 + Vue Router + Pinia (TypeScript, Vite).

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## API

- Swagger: http://192.168.10.154:9000/swagger/ (spec: `/swagger/doc.json`)
- `VITE_API_BASE_URL` (default `/api/v1`)
- Dev: Vite proxies `/api` to `VITE_API_PROXY_TARGET` (`.env.development`), because the API does not allow CORS.
- Production: serve the app behind a reverse proxy that forwards `/api` to the API, or set `VITE_API_BASE_URL` to a full URL once CORS is enabled.
- Auth: `POST /auth/login` → Bearer token; on 401 the client calls `/auth/refresh` once, then redirects to login.

## Structure

- `src/api/` – fetch client (`http.ts`), DTO types (`types.ts`), endpoint functions (`index.ts`)
- `src/config/roles.ts` – roles: SUPER_ADMIN, ADMIN, OPERATOR, VIEWER
- `src/config/menu.ts` – menu, routes and per-role / per-action permissions (from `GPS_Gateway_Console(Struct).csv`)
- `src/router/index.ts` – routes generated from the menu, role guard (roles come from the login response)
- `src/composables/usePermission.ts` – `can('export' | 'add' | 'update' | 'delete' | 'duplicate')` for the current page
- `src/components/DataTablePage.vue` – shared list page (filters slot, client-side filter, CSV export, CRUD buttons by permission)
- `src/views/**` – one view per menu item

## Page ↔ endpoint

| Page | Endpoint |
| --- | --- |
| Device Last Status | `POST /device/laststatus` |
| Proxy Last Status | `GET /destination/selected`, `POST /device/proxy/laststatus` |
| Proxy History (7D) | `GET` / `POST /device/proxy/history` |
| DLT History (6M) | `GET` / `POST /device/dlt/history` |
| GPS Data History | `GET` / `POST /provider/device/history` (max 24h per search) |
| Device Data Transmission | `GET` / `POST /device/transmission/monitoring` (max 10 serials) |
| Device Master | `GET /device/master` |
| Provider | `GET /provider`, `POST /provider/device` |
| Config › Category | `GET /category` |
| Config › Destination | `GET /destination/selected` |
| System Monitor › App Status | `GET /health` |
| Change Password | `POST /auth/change-password` |
| Change User Password | `POST /users/change-password` |

No API yet: Dashboard, Provider (Wialon Lite), Assign Destination, Register, Proxy System, GPS Gateway System,
Transaction Log, Config › App / Destination Schedule, and create/update/delete on Master.
