import type { FastifyInstance } from "fastify";
import authRoutes from "../modules/auth/auth.route.ts";
import scanRoutes from "../modules/scan/scans.route.ts";
import routineRoutes from "../modules/routines/routines.route.ts";
import productRoutes from "../modules/products/products.route.ts";
import recommendationRoutes from "../modules/recommendations/recommendations.route.ts";
import messageRoutes from "../modules/messages/messages.route.ts";
import preferenceRoutes from "../modules/preferences/preferences.route.ts";
import ordersRoutes from "../modules/orders/orders.route.ts";
import subscriptionsRoutes from "../modules/subscriptions/subscriptions.route.ts";

export default async function apiRoutes(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: "/auth" });
  fastify.register(scanRoutes, { prefix: "/scans" });
  fastify.register(routineRoutes, { prefix: "/routines" });
  fastify.register(productRoutes, { prefix: "/products" });
  fastify.register(recommendationRoutes, { prefix: "/recommendations" });
  fastify.register(messageRoutes, { prefix: "/messages" });
  fastify.register(preferenceRoutes, { prefix: "/preferences" });
  fastify.register(ordersRoutes, { prefix: "/orders" });
  fastify.register(subscriptionsRoutes, { prefix: "/subscriptions" });
}
