import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'test/e2e/**',
      'test/rules/**',
      'functions/lib/**',
      '**/*.smoke.test.ts',
    ],
  },
});
