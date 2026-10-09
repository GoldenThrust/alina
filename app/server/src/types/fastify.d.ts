import "fastify";
import type { Redis } from "ioredis";
import type { PrismaClient } from "../generated/prisma/client.ts";

import { OAuth2Namespace } from "@fastify/oauth2";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    authenticate: any;

    facebookOAuth2: OAuth2Namespace;
    XOAuth2: OAuth2Namespace;
    googleOAuth2: OAuth2Namespace;
  }
}
