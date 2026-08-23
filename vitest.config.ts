import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,

    environment: 'node',

    include: [
      '**/__tests__/**/*.test.ts',
      '**/__tests__/**/*.spec.ts',
    ],

    coverage: {
      provider: 'v8',

      reporter: [
        'text',
        'html',
        'json-summary',
      ],

      reportsDirectory: './coverage',

      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
      ],
    },
  },
});
