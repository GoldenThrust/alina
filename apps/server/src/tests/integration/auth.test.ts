import { afterEach, describe, expect, vi } from "vitest";
import crypto, { createHash } from "node:crypto";
import { hash } from "argon2";

import { prisma } from "../../config/prisma.ts";
import {
  FacebookCallbackHandler,
  GoogleCallbackHandler,
  XCallbackHandler,
} from "../../modules/auth/auth.controller.ts";
import { redisService } from "../../services/redis.service.ts";
import { test } from "../base.ts";

const redisStore = new Map<string, string>();

vi.mock("bullmq", () => {
  class Queue {
    async add() {
      return { id: "mock-job" };
    }
  }

  class Worker {
    constructor() {}
  }

  return {
    Queue,
    Worker,
  };
});

vi.mock("ioredis", () => {
  class Redis {
    constructor() {}

    async setex(key: string, _seconds: number, value: string) {
      redisStore.set(key, value);
      return "OK";
    }

    async get(key: string) {
      return redisStore.get(key) ?? null;
    }

    async del(key: string) {
      redisStore.delete(key);
      return 1;
    }

    async set(key: string, value: string) {
      redisStore.set(key, value);
      return "OK";
    }
  }

  return {
    Redis,
    default: Redis,
  };
});

afterEach(async () => {
  redisStore.clear();
  vi.restoreAllMocks();

  await prisma.oAuthAccount.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
});

function uniqueEmail(prefix: string) {
  return `${prefix}${crypto.randomUUID().replaceAll("-", "")}@yummy.com`;
}

async function createUserRecord({
  email = uniqueEmail("auth"),
  name = "Mike Tom",
  password = "Password123@",
  verified = true,
}: {
  email?: string;
  name?: string;
  password?: string;
  verified?: boolean;
} = {}) {
  return await prisma.user.create({
    data: {
      email,
      name,
      password: await hash(password),
      emailVerifiedAt: verified ? new Date() : null,
    },
  });
}

function mockOAuthProvider(app: any, property: string, accessToken: string) {
  Object.defineProperty(app, property, {
    configurable: true,
    writable: true,
    value: {
      getAccessTokenFromAuthorizationCodeFlow: vi.fn().mockResolvedValue({
        token: {
          access_token: accessToken,
        },
      }),
    },
  });
}

function createMockReply() {
  return {
    setCookie: vi.fn(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn((payload: any) => payload),
  } as any;
}

async function seedEmailResetTarget(
  userId: string,
  email: string,
  token: string,
  ttl: number,
) {
  await redisService.setAccountEmail(
    createHash("sha256").update(token).digest("hex"),
    `${userId}|${email}`,
    ttl,
  );
}

describe("Auth Routes", () => {
  test("POST /register creates a user", async ({ app }) => {
    const email = uniqueEmail("register");

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        name: "Mike Tom",
        email,
        password: "Password123@",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      message: "User created. Verification email sent",
    });

    const createdUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    expect(createdUser).toBeTruthy();
    expect(createdUser?.emailVerifiedAt).toBeNull();
  });

  test("POST /login returns tokens for a verified user", async ({
    app,
    user,
  }) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: user.email,
        password: user.password,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: "Login successful",
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  test("GET /user returns the current user profile", async ({ app, user }) => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/user",
      headers: {
        authorization: `Bearer ${user.accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: "User retrieved successfully",
      user: {
        email: user.email,
        name: user.name,
      },
    });
  });

  test("PUT /user updates the profile", async ({ app, user }) => {
    const updatedName = "Mike Thomas";

    const response = await app.inject({
      method: "PUT",
      url: "/api/auth/user",
      headers: {
        authorization: `Bearer ${user.accessToken}`,
      },
      payload: {
        name: updatedName,
      },
    });

    expect(response.statusCode).toBe(200);

    const updatedUser = await prisma.user.findUnique({
      where: {
        email: user.email,
      },
    });

    expect(updatedUser?.name).toBe(updatedName);
  });

  test("GET /refresh exchanges a refresh token for new tokens", async ({
    app,
    user,
  }) => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/refresh",
      headers: {
        authorization: `Bearer ${user.refreshToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: "New access token generated successfully",
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  test("GET /account-verify/:token verifies the account", async ({ app }) => {
    const token = crypto.randomUUID();
    const userRecord = await createUserRecord({ verified: false });

    await redisService.setAccountVerificationToken(
      createHash("sha256").update(token).digest("hex"),
      userRecord.id.toString(),
      60 * 30,
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/auth/account-verify/${token}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: "Account verified successfully",
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });

    const verifiedUser = await prisma.user.findUnique({
      where: {
        id: userRecord.id,
      },
    });

    expect(verifiedUser?.emailVerifiedAt).toBeTruthy();
  });

  test("POST /reset-password sends a reset request", async ({ app, user }) => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: {
        email: user.email,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: "Password reset email sent. Please check your inbox.",
    });
  });

  test("POST /reset-password sends a reset request by an authenticated user", async ({ app, user }) => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/reset-password",
      headers: {
        authorization: `Bearer ${user.refreshToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: "Password reset email sent. Please check your inbox.",
    });
  });

  test("POST /reset-password/:token updates the password", async ({
    app,
    user,
  }) => {
    const token = crypto.randomUUID();
    const newPassword = "NewPassword123@";

    await redisService.setAccountPasswordResetToken(
      createHash("sha256").update(token).digest("hex"),
      user.id.toString(),
      60 * 30,
    );

    const response = await app.inject({
      method: "POST",
      url: `/api/auth/reset-password/${token}`,
      payload: {
        password: newPassword,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: "Account verified successfully",
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: user.email,
        password: newPassword,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
  });

  test("POST /reset-email requests a new email address", async ({ app }) => {
    const requestedEmail = uniqueEmail("pendingemail");
    const localUser = await createUserRecord();
    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: localUser.email,
        password: "Password123@",
      },
    });
    const loginBody = loginResponse.json();

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/reset-email",
      headers: {
        authorization: `Bearer ${loginBody.accessToken}`,
      },
      payload: {
        email: requestedEmail,
        password: "Password123@",
      },
    });

    expect(response.statusCode).toBe(200);
  });

  test("GET /reset-email/:token applies the requested email", async ({
    app,
  }) => {
    const userRecord = await createUserRecord();
    const token = crypto.randomUUID();
    const pendingEmail = uniqueEmail("updatedemail");

    await seedEmailResetTarget(userRecord.id, pendingEmail, token, 60 * 15);

    const response = await app.inject({
      method: "GET",
      url: `/api/auth/reset-email/${token}`,
    });

    expect(response.statusCode).toBe(200);

    const updatedUser = await prisma.user.findUnique({
      where: {
        id: userRecord.id,
      },
    });

    expect(updatedUser?.email).toBe(pendingEmail);
  });

  test("POST /reset-email/:token/revert restores the pending email", async ({
    app,
    user,
  }) => {
    const token = crypto.randomUUID();
    const pendingEmail = uniqueEmail("revertemail");
    const password = "RevertPassword123@";

    await seedEmailResetTarget(user.id, pendingEmail, token, 60 * 60 * 24 * 7);

    const response = await app.inject({
      method: "POST",
      url: `/api/auth/reset-email/${token}/revert`,
      payload: {
        password,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: "Email reverted successfully",
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        email: pendingEmail,
        password,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
  });

  test("GET /logout revokes the active session", async ({ app, user }) => {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/logout",
      headers: {
        authorization: `Bearer ${user.refreshToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: "Logged out successfully",
    });

    const refreshResponse = await app.inject({
      method: "GET",
      url: "/api/auth/refresh",
      headers: {
        authorization: `Bearer ${user.refreshToken}`,
      },
    });

    expect(refreshResponse.statusCode).toBe(401);
  });

  test("GET /google/callback signs in with Google", async ({ app }) => {
    mockOAuthProvider(app, "googleOAuth2", "google-access-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({
        id: "google-provider-id",
        email: uniqueEmail("google"),
        name: "Google User",
      }),
    } as any);

    const req = {
      server: app,
      headers: {
        "user-agent": "vitest",
      },
      ip: "127.0.0.1",
    } as any;
    const res = createMockReply();

    const response = await GoogleCallbackHandler(req, res);

    expect(response).toMatchObject({
      message: "Login successfully",
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  test("GET /X/callback signs in with X", async ({ app }) => {
    mockOAuthProvider(app, "XOAuth2", "x-access-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({
        data: {
          id: "x-provider-id",
          name: "X User",
        },
      }),
    } as any);

    const req = {
      server: app,
      headers: {
        "user-agent": "vitest",
      },
      ip: "127.0.0.1",
    } as any;
    const res = createMockReply();

    const response = await XCallbackHandler(req, res);

    expect(response).toMatchObject({
      message: "Login successfully",
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  test("GET /facebook/callback signs in with Facebook", async ({ app }) => {
    mockOAuthProvider(app, "facebookOAuth2", "facebook-access-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({
        id: "facebook-provider-id",
        email: uniqueEmail("facebook"),
        name: "Facebook User",
      }),
    } as any);

    const req = {
      server: app,
      headers: {
        "user-agent": "vitest",
      },
      ip: "127.0.0.1",
    } as any;
    const res = createMockReply();

    const response = await FacebookCallbackHandler(req, res);

    expect(response).toMatchObject({
      message: "Login successfully",
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });
});
