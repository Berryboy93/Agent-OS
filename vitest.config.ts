import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    include: [
      '**/tests/**/*.{test,spec}.ts',
      '**/__tests__/**/*.{test,spec}.ts',
    ],

    exclude: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.audit/**',
      '**/.deployment-backups/**',
      '**/.refactor-backups/**',
      '**/.type-repair-backups/**',
      '**/.quarantine/**',
      '**/src.stub-backup/**',
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
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.audit/**',
        '**/.deployment-backups/**',
        '**/.refactor-backups/**',
        '**/.type-repair-backups/**',
        '**/.quarantine/**',
        '**/src.stub-backup/**',
      ],
    },
  },
});
