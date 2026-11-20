// Production server for pm2: serves dist/ as an SPA and forwards /api to the GPS Gateway API.
// No dependencies, only Node's built-ins. Settings come from environment variables:
//   PORT        listen port              (default 8080)
//   HOST        listen address           (default 0.0.0.0 = every interface, reachable on the LAN)
//   API_TARGET  API base URL, no slash   (default http://192.168.10.154:9000)
import http from "node:http";
import https from "node:https";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? "0.0.0.0";
const API_TARGET = new URL(process.env.API_TARGET ?? "http://192.168.10.154:9000");
const DIST = join(fileURLToPath(new URL(".", import.meta.url)), "dist");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

function proxy(req, res) {
  const client = API_TARGET.protocol === "https:" ? https : http;
  const headers = { ...req.headers, host: API_TARGET.host };
  // The API rejects (403) any request carrying an Origin it doesn't allow
  delete headers.origin;
  const upstream = client.request(
    {
      protocol: API_TARGET.protocol,
      hostname: API_TARGET.hostname,
      port: API_TARGET.port,
      method: req.method,
      path: req.url,
      headers,
      timeout: 120_000, // history / export queries can be slow
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.on("timeout", () => upstream.destroy(new Error("upstream timeout")));
  upstream.on("error", (e) => {
    console.error(`[api] ${req.method} ${req.url}: ${e.message}`);
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end("Bad Gateway");
  });
  req.pipe(upstream);
}

async function sendFile(res, file, cache) {
  res.writeHead(200, {
    "content-type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    "cache-control": cache,
  });
  createReadStream(file).pipe(res);
}

async function serveStatic(req, res) {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const file = normalize(join(DIST, path));
  // Never serve anything outside dist/
  if (file !== DIST && !file.startsWith(DIST + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isFile()) {
      // Hashed assets can be cached for a long time; everything else is revalidated
      const cache = path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";
      return sendFile(res, file, cache);
    }
  } catch {
    // not found: fall through
  }
  // Missing files under /assets are real 404s; any other path is an SPA route
  if (path.startsWith("/assets/")) {
    res.writeHead(404).end();
    return;
  }
  sendFile(res, join(DIST, "index.html"), "no-cache");
}

http
  .createServer((req, res) => {
    if (req.url === "/api" || req.url.startsWith("/api/")) return proxy(req, res);
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405).end();
      return;
    }
    serveStatic(req, res);
  })
  .listen(PORT, HOST, () => {
    console.log(`GPS Gateway Console on http://${HOST}:${PORT} · /api -> ${API_TARGET.origin}`);
  });
