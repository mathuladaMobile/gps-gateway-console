// pm2 process file.
//   npm run build && pm2 start ecosystem.config.cjs --only gps-console      (built app, port 8080)
//   pm2 start ecosystem.config.cjs --only gps-console-dev                   (Vite dev server, port 3000)
module.exports = {
  apps: [
    {
      name: "gps-console",
      script: "server.mjs",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: 8080,
        HOST: "192.168.10.169",
        API_TARGET: "http://192.168.10.154:9000",
      },
    },
    {
      name: "gps-console-dev",
      // Run Vite's JS entry directly so it works on Windows too (npm's .cmd shims don't start under pm2)
      script: "node_modules/vite/bin/vite.js",
      cwd: __dirname,
      autorestart: true,
      watch: false,
      time: true,
      env: { NODE_ENV: "development" },
    },
  ],
};
