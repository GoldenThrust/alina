import type { FastifyInstance } from "fastify";
import {
  loginSchema,
  registerSchema,
  requestResetPasswordSchema,
  resetPasswordSchema,
  updateSchema,
  tokenParamSchema,
  revertResetEmailSchema,
} from "./auth.schema.ts";
import {
  GoogleCallbackHandler,
  XCallbackHandler,
  FacebookCallbackHandler,
  registerHandler,
  verifyAccountHandler,
  loginHandler,
  logoutHandler,
  refreshTokenHandler,
  getUserHandler,
  updateProfileHandler,
  requestResetPasswordHandler,
  requestResetEmailHandler,
  resetPasswordHandler,
  resetEmailHandler,
  revertResetEmailHandler,
} from "./auth.controller.ts";

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (request, reply) => {
    return { message: "Auth route is working!" };
  });
  
  fastify.get(
    "/user",
    {
      preHandler: [fastify.authenticate],
    },
    getUserHandler,
  );

  fastify.put(
    "/user",
    {
      preHandler: [fastify.authenticate],
      schema: updateSchema,
    },
    updateProfileHandler,
  );

  fastify.post(
    "/refresh",
    {
      preHandler: [fastify.authenticate],
    },
    refreshTokenHandler,
  );

  fastify.post("/login", { schema: loginSchema }, loginHandler);

  fastify.post(
    "/register",
    {
      schema: registerSchema,
    },
    registerHandler,
  );

  fastify.get("/google/callback", GoogleCallbackHandler);

  fastify.get("/X/callback", XCallbackHandler);

  fastify.get("/facebook/callback", FacebookCallbackHandler);

  fastify.get(
    "/account-verify/:token",
    { schema: tokenParamSchema },
    verifyAccountHandler,
  );

  fastify.post(
    "/reset-password",
    {
      schema: requestResetPasswordSchema,
    },
    requestResetPasswordHandler,
  );
  fastify.get(
    "/reset-password",
    {
      preHandler: [fastify.authenticate]
    },
    requestResetPasswordHandler,
  );

  fastify.post(
    "/reset-password/:token",
    {
      schema: resetPasswordSchema,
    },
    resetPasswordHandler,
  );

  fastify.post(
    "/reset-email",
    {
      preHandler: [fastify.authenticate],
      schema: loginSchema,
    },
    requestResetEmailHandler,
  );

  fastify.get(
    "/reset-email/:token",
    {
      schema: tokenParamSchema,
    },
    resetEmailHandler,
  );

  fastify.post(
    "/reset-email/:token/revert",
    {
      schema: revertResetEmailSchema,
    },
    revertResetEmailHandler,
  );

  fastify.get(
    "/logout", 
    {
      preHandler: [fastify.authenticate],
    },
    logoutHandler,
  );
}
