import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
// import { redisService } from "../services/redis.service.ts";
import APIError from "../../errors/APIError.ts";

import crypto from "node:crypto";
import { db } from "../../prisma/db.ts";
import type { Models } from "../../prisma/contract";
import { Temporal } from "@js-temporal/polyfill";

/**
 * Generate JWT access and refresh tokens with session management
 * @param req - Fastify request object
 * @param res - Fastify response object for setting cookies
 * @param user - User object from database
 * @param sessionId - Optional existing session ID for upsert
 * @returns Object with accessToken and refreshToken
 */
export async function generateTokens(
  req: FastifyRequest,
  res: FastifyReply,
  user: User,
  sessionId?: string,
) {
  const accessPayload = {
    sub: user.id.toString(),
    email: user.email,
  };

  const accessToken = req.server.jwt.sign(accessPayload, {
    expiresIn: "15m",
  });

  const refreshSecret = crypto.randomUUID();

  const session = await db.orm.public.Session.upsert({
    where: {
      id: sessionId ?? "",
    },
    update: {
      refreshSecret,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
      expiresAt: Temporal.Now.instant().add({ hours: 7 * 24 }),
    },
    create: {
      userId: user.id,
      refreshSecret,

      ipAddress: req.ip,

      userAgent: req.headers["user-agent"] as string,

      expiresAt: Temporal.Now.instant().add({ hours: 7 * 24 }),
    },
  });

  const refreshPayload = {
    sub: user.id.toString(),

    sessionId: session.id,

    secret: refreshSecret,
  };

  const refreshToken = req.server.jwt.sign(refreshPayload, {
    expiresIn: "7d",
  });

  res.setCookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });

  res.setCookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/auth/refresh",
  });

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Verify refresh token and validate associated session
 * @param req - Fastify request object
 * @param token - JWT refresh token string
 * @returns Object with payload (JWT claims) and session data
 * @throws APIError if token invalid, expired, or session revoked
 */
export async function verifyRefreshToken(req: FastifyRequest, token: string) {
  try {
    const payload = req.server.jwt.verify<JwtPayload>(token);

    const session = await db.orm.public.Session.where({
      id: payload.sessionId!,
    }).first();

    if (!session) {
      throw new APIError("Session not found", 401);
    }

    if (session.revokedAt) {
      throw new APIError("Session has been revoked", 401);
    }

    const tokenExpiry = Temporal.Instant.from(session.expiresAt);
    if (Temporal.Instant.compare(tokenExpiry, Temporal.Now.instant()) < 0) {
      throw new APIError("Session expired", 401);
    }

    if (session.refreshSecret !== payload.secret) {
      throw new APIError("Invalid refresh token", 401);
    }

    return {
      payload,
      session,
    };
  } catch (error: any) {
    if (error instanceof APIError) {
      throw error;
    }

    if (error?.name === "TokenExpiredError") {
      throw new APIError("Refresh token expired", 401);
    }

    throw new APIError("Invalid refresh token", 401);
  }
}

/**
 * Verify JWT access token and extract claims
 * @param app - Fastify application instance
 * @param token - JWT access token string
 * @returns Decoded JWT payload with user claims (sub, email, role)
 * @throws APIError if token invalid or expired
 */
export function verifyAccessToken(
  app: FastifyInstance,
  token: string,
): JwtPayload {
  try {
    return app.jwt.verify<JwtPayload>(token);
  } catch (error: any) {
    if (error?.name === "TokenExpiredError") {
      throw new APIError("Verification token has expired", 401);
    }

    throw new APIError("Invalid verification token", 401);
  }
}
