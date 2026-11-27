// pm2 process file.
//   npm run build && pm2 start ecosystem.config.cjs --only gps-console      (built app, port 8080)
//   pm2 start ecosystem.config.cjs --only gps-console-dev                   (Vite dev server, port 3000)
module.exports = {
  apps: [
    {
      name: "gps-console",
      script: "server.mjs",
      cwd: __dirname,
      // fork mode: pm2's cluster mode doesn't start ESM (.mjs) scripts reliably, especially on Windows
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: 8080,
        // 0.0.0.0 = every interface. Don't put a specific IP here: on a machine without that IP, listen fails (EADDRNOTAVAIL)
        HOST: "0.0.0.0",
        API_TARGET: "http://10.10.10.41",
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
