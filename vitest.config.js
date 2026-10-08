import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'shared', include: ['shared/**/*.test.js'] } },
      {
        test: {
          name: 'server',
          include: ['server/test/**/*.test.js'],
          globalSetup: ['server/test/global-setup.js'],
          setupFiles: ['server/test/setup.js'],
          testTimeout: 20000,
          hookTimeout: 60000,
        },
      },
      { test: { name: 'client', include: ['client/src/**/*.test.js'] } },
    ],
  },
});
