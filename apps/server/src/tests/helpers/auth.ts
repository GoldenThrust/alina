import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { hash } from "argon2";
import { db } from "../../prisma/db.ts";

export async function createAuthenticatedUser(app: FastifyInstance) {
  const user = {
    email: `rose${crypto.randomUUID().replaceAll("-", "")}@yummy.com`,
    name: "Rose Velvet",
    password: "Password123@",
  };

  const createdUser = await db.orm.public.User.create({
    email: user.email,
    fullName: user.name,
    password: await hash(user.password),
    emailVerifiedAt: new Date(),
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: {
      email: user.email,
      password: user.password,
    },
  });

  const body = response.json();

  return {
    id: createdUser.id,
    email: user.email,
    name: user.name,
    password: user.password,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
  };
}
