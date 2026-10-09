import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";

export default fp(async (app) => {
  app.decorate("authenticate", async function (req: FastifyRequest) {
      await req.jwtVerify();
  });
});
