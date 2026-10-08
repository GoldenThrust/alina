import { describe, expect, it } from 'vitest';
import { createApp } from './index.js';

describe('Alina API baseline', () => {
  it('reports health and returns the first-use skin baseline', async () => {
    const app = await createApp();
    await app.ready();

    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: 'ok' });

    const baseline = await app.inject({ method: 'GET', url: '/api/baseline' });
    expect(baseline.statusCode).toBe(200);
    expect(baseline.json()).toMatchObject({
      hasScan: false,
      title: 'Your skin story starts here',
      action: 'Start Your First Skin Scan'
    });

    await app.close();
  });
});
