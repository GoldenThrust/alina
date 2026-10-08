import { test as baseTest } from 'vitest'
import { buildApp } from '../app.ts'
import { createAuthenticatedUser } from './helpers/auth.ts';

export const test = baseTest
  .extend('app', async ({}, { onCleanup }) => {
    const app = await buildApp();

    onCleanup(() => app.close());
    return app;
  })
  .extend('user', async ({ app }) => {
    return await createAuthenticatedUser(app);
  })