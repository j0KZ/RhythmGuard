import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: { statements: 75, branches: 75, functions: 75, lines: 75 },
    },
  },
});
