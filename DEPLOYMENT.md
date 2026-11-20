# Deployment Guide — GPS Gateway Console

The console is a static single-page app (Vue 3 + Vite). Deploying it means:

1. Building static files into `dist/`.
2. Serving `dist/` from a web server.
3. Having that same web server forward `/api` to the GPS Gateway API.

Step 3 is required. The API does not allow CORS, and it returns **403** for any request whose `Origin` header it doesn't accept. The browser has to call the API on the same origin as the console, through the reverse proxy.

---

## 1. Prerequisites

| Item | Version / note |
| --- | --- |
| Node.js | 18.18+ (20 LTS recommended), only needed on the build machine |
| npm | Comes with Node |
| Web server | Nginx (examples below), IIS or Apache also work |
| API | GPS Gateway API reachable from the web server (e.g. `http://192.168.10.154:9000`) |

---

## 2. Configuration

Settings are read from `.env.production` **at build time** and compiled into the bundle. If you change a value, rebuild.

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Prefix for all API calls. Keep it relative (`/api/v1`) so calls go through the reverse proxy. |

`VITE_API_PROXY_TARGET` in `.env.development` is used only by the dev server (`npm run dev`). It has no effect on production builds.

To override a value for one server without editing the committed file, create `.env.production.local`. Git ignores it (`*.local`).

---

## 3. Build

```bash
git pull
npm ci              # clean install from package-lock.json
npm run build       # type-checks (vue-tsc), then builds into dist/
```

If there are TypeScript errors, the build fails and no `dist/` is produced. Fix the errors before you deploy.

To check the build locally before you deploy:

```bash
npm run preview     # serves dist/ at http://localhost:3000
```

`vite preview` does not proxy `/api`, so API calls will fail there. Use it only to check that pages load.

Output:

```
dist/
├── index.html
└── assets/         # hashed JS/CSS/fonts, safe to cache long-term
```

---

## 4. Web server setup (Nginx)

The app uses HTML5 history routing (`createWebHistory`), so any unknown path must return `index.html`. Otherwise refreshing a page such as `/device/master` returns 404.

The app is built to be served at the **domain root** (`/`). To host it under a sub-path such as `/console/`, set `base: '/console/'` in [vite.config.ts](vite.config.ts) and pass the same base to `createWebHistory()` in [src/router/index.ts](src/router/index.ts), then rebuild.

`/etc/nginx/conf.d/gps-gateway-console.conf`:

```nginx
server {
    listen 80;
    server_name gps-console.example.local;   # change

    root /var/www/gps-gateway-console;       # contents of dist/
    index index.html;

    # API reverse proxy (required, the API has no CORS)
    location /api/ {
        proxy_pass http://192.168.10.154:9000;   # API host, no trailing slash so the /api path is kept
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # The API rejects (403) requests carrying an Origin it doesn't allow.
        proxy_set_header Origin "";

        proxy_read_timeout 120s;   # history / export queries can be slow
    }

    # Hashed assets: cache for a long time
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA fallback; never cache index.html so new releases load right away
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

For HTTPS, add `listen 443 ssl;` with your certificate, and redirect port 80 to 443.

Check the config and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. Deploy / release

```bash
# on the build machine
npm ci && npm run build

# copy to the server (keep the previous release for rollback)
RELEASE=$(date +%Y%m%d-%H%M%S)
scp -r dist/ user@server:/var/www/releases/$RELEASE

# on the server: switch the symlink
ln -sfn /var/www/releases/$RELEASE /var/www/gps-gateway-console
```

Nginx doesn't need a reload for a content-only change.

### Rollback

Point the symlink back at the previous release folder:

```bash
ls /var/www/releases
ln -sfn /var/www/releases/<previous> /var/www/gps-gateway-console
```

---

## 6. Optional: Docker

`Dockerfile`:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Use the Nginx config from section 4 as `deploy/nginx.conf`, with `root /usr/share/nginx/html;`. Add a `.dockerignore` containing `node_modules` and `dist`.

```bash
docker build -t gps-gateway-console:1.0.0 .
docker run -d --name gps-console -p 8080:80 --restart unless-stopped gps-gateway-console:1.0.0
```

---

## 6b. Optional: pm2 (no Nginx)

[server.mjs](server.mjs) serves `dist/` with the SPA fallback and forwards `/api` to the API with the `Origin` header removed, like the Nginx config above. It uses only Node built-ins. [ecosystem.config.cjs](ecosystem.config.cjs) runs it under pm2.

```bash
npm i -g pm2
npm ci
npm run pm2:start      # build, then start "gps-console" on http://<host>:8080
npm run pm2:restart    # after git pull: rebuild and restart
npm run pm2:logs
```

Change `PORT`, `HOST` or `API_TARGET` in `ecosystem.config.cjs`, then run `pm2 restart gps-console --update-env`.

`npm run pm2:dev` runs the Vite dev server (port 3000) under pm2 instead.

To start on boot, run `pm2 save`. On Linux, also run `pm2 startup` and follow what it prints. Windows has no `pm2 startup`; use a package such as `pm2-installer` or a scheduled task that runs `pm2 resurrect`.

---

## 7. Post-deploy checks

- [ ] `http://<host>/` shows the login page.
- [ ] Logging in works (`POST /api/v1/auth/login` returns 200 in DevTools → Network).
- [ ] Refreshing a deep link (e.g. `/device/master`) loads the page instead of a 404.
- [ ] **System Monitor → App Status** shows the API as healthy (`GET /api/v1/health`).
- [ ] Excel export downloads a file on **Device Last Status**.
- [ ] After a release, a hard refresh is not needed (index.html is served `no-cache`).

---

## 8. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| 404 when refreshing a page | The SPA fallback is missing. Add `try_files $uri $uri/ /index.html;`. |
| API calls return **403** | The `Origin` header is reaching the API. Add `proxy_set_header Origin "";` to the `/api/` block. |
| API calls return 404 / HTML instead of JSON | `/api/` isn't proxied, or `proxy_pass` has a trailing slash that strips `/api`. |
| CORS error in the browser console | `VITE_API_BASE_URL` points to another host. Set it to `/api/v1` and rebuild. |
| 502 Bad Gateway | The web server can't reach the API host or port. Check the firewall and `curl http://<api>:9000/api/v1/health` from the server. |
| Logged out unexpectedly | The token refresh (`/auth/refresh`) failed. Check the API logs. |
| Old UI after a release | The browser cached `index.html`. Make sure it's served with `Cache-Control: no-cache`. |
| Blank page, JS 404s in the console | The app is hosted under a sub-path without setting `base`. See section 4. |
