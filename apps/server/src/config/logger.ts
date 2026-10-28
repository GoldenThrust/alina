import pino from "pino";
import client from "prom-client";
import { env } from "./env";

// export const logger = pino({
//   transport: {
//     targets: [
//     //   { target: "pino/file", options: { destination: 1 } }, // stdout
//       {
//         target: "pino-loki",
//         options: {
//           host: "http://192.168.1.100:3100",
//           labels: { app: "fastify", env: "prod" },
//           batching: true,
//           interval: 5,
//         },
//       },
//     ],
//   },
// });

export const logger = pino({
  ...(env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-loki",
          options: {
            host: "http://192.168.1.100:3100",
            labels: { app: "fastify", env: "prod" },
            batching: true,
            interval: 5,
          },
        },
      }
    : {}),
});

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export { register };
