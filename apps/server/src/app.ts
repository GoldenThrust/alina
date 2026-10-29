import Fastify, { type FastifyRequest } from "fastify";
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

import { env } from "./config/env.ts";
import { allowUrls } from "./common/utils/constant.ts";
import { readFileSync } from "node:fs";
import { httpDuration, logger, register } from "./config/logger.ts";
import fastifyStatic from "@fastify/static";
// import { existsSync } from "node:fs";

import "./queues/index.ts";
import { AIProcessingJob } from "./queues/ai/ai.producer.ts";
import path from "node:path";

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

  app.post(
    "/ai",
    async (req: FastifyRequest<{ Body: { input: unknown } }>, reply) => {
      const input = req.body?.input as any;
      await AIProcessingJob({
        userId: input?.userId as string,
        scanId: input?.scanId as string,
        input: {
          type: "text",
          text: JSON.stringify(input) as string,
        },
      });
      return reply.send({ message: "AI job queued" });
    },
  );

  app.post(
    "/chat",
    async (req: FastifyRequest<{ Body: { input: unknown } }>, reply) => {
      const input = req.body?.input as any;
      await AIProcessingJob({
        userId: input?.userId as string,
        input: {
          type: "text",
          text: JSON.stringify(input) as string,
        },
      });
      return reply.send({ message: "AI job queued" });
    },
  );

  app.get("/health", async () => ({ status: "ok", service: "alina-api" }));

  // app.get("/", function (_, reply) {
  //   reply.send("Welcome to Alina API! Visit /api for API routes.");
  // });

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

  const clientRoot = path.join(process.cwd(), "client");

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
