import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { config } from "./config/index.ts";
import APIError from "./errors/APIError.ts";
import "./queues/index.ts";
import fastifyOauth2 from "@fastify/oauth2";
import superjson from "superjson";
import multipart from "@fastify/multipart";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.ts";
import { allowUrls } from "./common/utils/constant.ts";
import { readFileSync } from "node:fs";
import { httpDuration, logger, register } from "./config/logger.ts";
import fastifyStatic from "@fastify/static";
// import { existsSync } from "node:fs";

import "./queues/index.ts";
import { AIProcessingJob } from "./queues/ai/ai.producer.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { GOOGLE_CONFIGURATION, FACEBOOK_CONFIGURATION, X_CONFIGURATION } =
  fastifyOauth2;

export function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    ...(config.env.NODE_ENV === "development"
      ? {
          https: {
            key: readFileSync("C:\\Users\\adeni\\Documents\\Cert\\key.pem"),
            cert: readFileSync("C:\\Users\\adeni\\Documents\\Cert\\cert.pem"),
          },
        }
      : {}),
  });

  app.withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setReplySerializer((payload) => {
    return JSON.stringify(superjson.serialize(payload)["json"]);
  });

  app.setErrorHandler((error: any, req, res) => {
    if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    if (error.statusCode === 429) {
      return res.status(429).send({
        message: "You hit the rate limit! Slow down Please!",
      });
    }

    if (error.validation) {
      return res.status(400).send({
        message: error.message || "Validation failed",
        errors: error.message,
      });
    }

    req.log.error(error);

    return res.status(error.statusCode || 500).send({
      message: error.message || "Internal Server Error",
    });
  });

  // register plugins
  app.register(import("@fastify/rate-limit"), {
    max: 100,
    timeWindow: "1 minute",
  });
  // app.register(import("@fastify/helmet"));
  app.register(import("@fastify/cors"), {
    origin: allowUrls,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    // headers: ["Content-Type", "Authorization"],
  });

  app.register(import("@fastify/jwt"), {
    secret: config.env.ACCESS_TOKEN_SECRET,
  });

  app.register(import("./plugins/auth.ts"));

  app.register(fastifyOauth2, {
    name: "googleOAuth2",
    scope: ["profile", "email"],
    credentials: {
      client: {
        id: config.env.GOOGLE_CLIENT_ID,
        secret: config.env.GOOGLE_CLIENT_SECRET,
      },
      auth: GOOGLE_CONFIGURATION,
    },
    startRedirectPath: "/auth/google",
    callbackUri: config.env.GOOGLE_CALLBACK_URL,
  });

  app.register(fastifyOauth2, {
    name: "XOAuth2",
    scope: ["tweet.read", "users.read", "offline.access"],
    credentials: {
      client: {
        id: config.env.X_CLIENT_ID,
        secret: config.env.X_CLIENT_SECRET,
      },
      auth: X_CONFIGURATION,
    },
    startRedirectPath: "/auth/X",
    callbackUri: config.env.X_CALLBACK_URL,
  });

  app.register(fastifyOauth2, {
    name: "facebookOAuth2",
    scope: ["email"],
    credentials: {
      client: {
        id: config.env.FACEBOOK_CLIENT_ID,
        secret: config.env.FACEBOOK_CLIENT_SECRET,
      },
      auth: FACEBOOK_CONFIGURATION,
    },
    startRedirectPath: "/auth/facebook",
    callbackUri: config.env.FACEBOOK_CALLBACK_URL,
  });

  app.register(import("./plugins/prisma.ts"));
  app.register(import("./plugins/redis.ts"));

  // app.register(fastifyStatic, {
  //   root: path.join(__dirname, "../../client/dist"),
  //   prefix: "/",
  //   wildcard: false,
  // });

  app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
      files: 1,
    },
  });

  // register routes
  app.register(import("./routes/api.routes.ts"), {
    prefix: "/api",
  });

  app.get("/health", async () => ({ status: "ok", service: "alina-api" }));

  // app.get("/", function (_, reply) {
  //   reply.send("Welcome to Alina API! Visit /api for API routes.");
  // });

  app.get("/hello", function (_, reply) {
    reply.send("Hello from Alina API! Visit /api for API routes.");
  });

  app.addHook("onResponse", async (req, reply) => {
    // routeOptions.url avoids high-cardinality labels like /users/123
    const route = req.routeOptions?.url ?? "unknown";
    if (route === "/metrics") return;
    httpDuration
      .labels(req.method, route, String(reply.statusCode))
      .observe(reply.elapsedTime / 1000);
  });

  app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", register.contentType);
    return register.metrics();
  });

  // Hooks
  // app.addHook("onClose", async () => {
  //   await db.close();
  // });

  // app.addHook("onError", async () => {
  //   await db.close();
  // });

  const clientRoot = path.join(__dirname, "../client/dist");

  app.register(fastifyStatic, {
    root: env.UPLOAD_DIR,
    prefix: "/uploads/",
    decorateReply: false,
  });

  app.register(fastifyStatic, {
    root: clientRoot,
    prefix: "/",
    wildcard: false,
  });

  app.get("/ai", async (req, reply) => {
    await AIProcessingJob({
      userId: "9f71831f-dea6-46be-9605-a17daff52b2a",
      scanId: "f38c92e6-2689-425e-9148-26e2cc6de661",
      input: JSON.stringify({
        event: "skin_scan_completed",
        userId: "9f71831f-dea6-46be-9605-a17daff52b2a",
        scanId: "f38c92e6-2689-425e-9148-26e2cc6de661",
        scan: {
          id: "f38c92e6-2689-425e-9148-26e2cc6de661",
          score: 75,
          skinAge: 42,
          analysis: {
            skinAnalysisRecord: {
              acne: 65.14305114746094,
              ageSpot: 68.45236206054688,
              createdAt: "2026-10-25T14:54:27.230564Z",
              darkCircle: 84.8574548959732,
              droopyLowerEyelid: 75.63382387161255,
              droopyUpperEyelid: 76.64582133293152,
              eyeBag: 67.0788049697876,
              firmness: 75.73339343070984,
              id: "6331c977-33fe-4a9b-8dde-e8b02bef35da",
              moisture: 30.307036638259888,
              oiliness: 54.66094207763672,
              pore: {
                forehead: 63.31388473510742,
                nose: 100,
                cheek: 60.170738220214844,
                whole: 70.9138412475586,
              },
              radiance: 63.66661787033081,
              redness: 94.74559783935547,
              scanId: "f38c92e6-2689-425e-9148-26e2cc6de661",
              skinType: { whole: "Oily", t_zone: "Oily", u_zone: "Oily" },
              tearTrough: 37.81869411468506,
              texture: 61.01176470588236,
              wrinkle: {
                forehead: 73.59118700027466,
                glabellar: 99,
                crowfeet: 97.55990982055664,
                periocular: 76.87321186065674,
                nasolabial: 99,
                marionette: 99,
                whole: 85.80000042915344,
              },
            },
            skinTone: "#634838",
            fitzpatrick: "VI",
          },
        },
      }),
    });

    return reply.send({ message: "AI job queued" });
  });
  // SPA fallback: anything not matched by routes/static serves index.html
  app.setNotFoundHandler((req, reply) => {
    if (
      req.raw.url?.startsWith("/api") ||
      req.raw.url?.startsWith("/uploads")
    ) {
      return reply.status(404).send({ message: "Route not found" });
    }
    return reply.sendFile("index.html");
  });
  app.get("/*", async (req, reply) => {
    return reply.sendFile("index.html");
  });

  return app;
}
