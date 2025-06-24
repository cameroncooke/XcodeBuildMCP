import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'build/**'
    ],
    pool: 'vmThreads',
    poolOptions: {
      vmThreads: {
        maxThreads: 1
      }
    },
    env: {
      NODE_OPTIONS: '--max-old-space-size=4096'
    },
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'build/**',
        'tests/**',
        'experiments/**',
        '**/*.config.*',
        '**/*.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      // Handle .js imports in TypeScript files
      '^(\\.{1,2}/.*)\\.js$': '$1'
    }
  }
});