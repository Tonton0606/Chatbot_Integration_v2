const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

// Grafana Cloud Loki — active only when GRAFANA_LOKI_URL is set (Render prod).
// In dev, Promtail scrapes Docker json-file logs — no in-process transport needed.
// When env var is absent in prod, logs stay on stdout as plain JSON (safe fallback).
const getTransport = () => {
  if (isDev) {
    return {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    };
  }

  if (process.env.GRAFANA_LOKI_URL) {
    return {
      target: 'pino-loki',
      options: {
        host: process.env.GRAFANA_LOKI_URL,
        basicAuth: {
          username: process.env.GRAFANA_LOKI_USER,
          password: process.env.GRAFANA_LOKI_API_KEY,
        },
        labels: {
          app: 'hermes-server',
          env: process.env.NODE_ENV || 'production',
          service: process.env.SERVICE_NAME || 'server',
        },
        batching: true,
        interval: 5,
        replaceTimestamp: false,
      },
    };
  }

  return undefined; // stdout JSON — pino default, works on any platform
};

const transport = getTransport();

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(transport && { transport }),
});

module.exports = logger;
