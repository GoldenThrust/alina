import type { FastifyInstance } from "fastify";
import authRoutes from "../modules/auth/auth.route.ts";

export default async function apiRoutes(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: "/auth" });
}
