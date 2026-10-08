import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';

export async function createApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });

  app.get('/health', async () => ({ status: 'ok', service: 'alina-api' }));
  app.get('/api/baseline', async () => ({
    hasScan: false,
    title: 'Your skin story starts here',
    action: 'Start Your First Skin Scan',
    message: 'A first scan will become the starting point for your personal skin history.'
  }));

  return app;
}

const isDirectExecution = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectExecution) {
  const app = await createApp();
  await app.listen({ port: 4000, host: '0.0.0.0' });
  console.log('Alina API listening on http://localhost:4000');
}
