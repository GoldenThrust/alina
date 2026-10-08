
import { prisma } from './config/prisma.ts';
import { buildApp } from "./app.ts";
import { env } from './config/env.ts';

const PORT = Number(env.PORT);
const HOST = env.HOST;


const start = async () => {
  const app = buildApp();
  
  try {
    await app.listen({ port: PORT, host: HOST });
    console.info(`Server running on http://${HOST}:${PORT} 🚀`);
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    app.log.error(err);
    process.exit(1);
  }
};

start();
