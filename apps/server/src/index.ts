import { connectDatabase, db } from "./prisma/db.ts";
import { buildApp } from "./app.ts";
import Websocket from "./services/websocket.service.ts";
import { env } from "./config/env.ts";

const PORT = Number(env.PORT);
const HOST = env.HOST;

const start = async () => {
  const app = buildApp();
  Websocket.run(app);


  try {
    await connectDatabase();

    await app.listen({ port: PORT, host: HOST });
    console.info(`Server running on https://${HOST}:${PORT} 🚀`);
  } catch (err) {
    console.error(err);
    // await db.close();
    app.log.error(err);
    process.exit(1);
  }
};

start();
