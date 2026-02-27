/**
 * Vitest configuration — REAL INTEGRATION TESTS ONLY
 * =====================================================
 * No vi.mock() in any test under this config.
 * All tests hit real running services at localhost:3000.
 *
 * How to run:
 *   npx vitest run --config vitest.real.config.ts
 *   or: npm run test:real
 *
 * Prerequisites:
 *   1. Run start-all.ps1 (or docker-compose up)
 *   2. All 7 services healthy on ports 3000-3006
 *   3. DB seeded (npm run seed or scripts/seed-data.js)
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests in this order to ensure auth happens before payment/account tests
    include: ['tests/real-integration/**/*.test.ts'],
    // Longer timeout — real HTTP calls, DB queries, Kafka publishing
    testTimeout: 30000,
    hookTimeout: 15000,
    // Run serially by default to avoid rate-limit saturation across test files
    pool: 'forks',
    poolOptions: {
      forks: {
        // one file at a time so auth tokens are consistent
        singleFork: true,
      },
    },
    // Show all console.log output from tests (real latency numbers, balances, etc.)
    silent: false,
    // Reporters
    reporters: ['verbose'],
    // No coverage needed here — this is integration, not unit coverage
    coverage: {
      enabled: false,
    },
    // Environment
    environment: 'node',
  },
});
