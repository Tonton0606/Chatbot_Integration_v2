module.exports = {
  apps: [
    {
      name: "hermes-api",
      script: "server.js",
      instances: process.env.PM2_INSTANCES || 1,
      exec_mode: "fork",

      // Crash recovery
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,

      // Memory guard — restart before OOM kill
      max_memory_restart: process.env.PM2_MAX_MEMORY || "450M",

      // Graceful shutdown: allow 10s for in-flight requests to drain
      kill_timeout: 10000,
      listen_timeout: 8000,
      shutdown_with_message: true,

      // Environment
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 5000,
      },

      // Structured logging goes to stdout/stderr so Docker captures them
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      combine_logs: true,
      out_file: "/dev/stdout",
      error_file: "/dev/stderr",
      merge_logs: true,
    },
  ],
};
