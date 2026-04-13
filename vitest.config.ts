import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./packages/core/tests/freeze/setup.ts'],
    include: ['packages/**/__tests__/**/*.test.ts', 'packages/**/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/index.ts'],
    },
  },
});
