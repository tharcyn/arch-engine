import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./packages/core/tests/freeze/setup.ts'],
    include: ['packages/**/__tests__/**/*.test.ts', 'packages/**/tests/**/*.test.ts'],
    // adapter-conformance tests are factory functions (defineXxxTests) consumed
    // by adapter test suites — they have no top-level describe() and are not
    // standalone tests. They live in a private workspace outside the v1.0.x
    // published contract; excluding them avoids false "No test suite found"
    // failures while keeping their factories available to consuming adapters.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'packages/adapters/conformance/tests/**',
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/index.ts'],
    },
  },
});
