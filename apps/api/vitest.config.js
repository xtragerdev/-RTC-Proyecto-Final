import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    fileParallelism: false,
    hookTimeout: 300000,
    coverage: { reporter: ['text', 'html'] },
  },
});
