import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    pool: 'forks',
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
