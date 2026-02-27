import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: '.',
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
      },
      include: ['src/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        'src/index.ts',
        '**/*.test.ts',
        '**/*.d.ts',
      ],
    },
    include: ['tests/**/*.test.ts'],
  },
});
