import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
    server: {
      deps: {
        inline: ['phaser'],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'phaser3spectorjs': path.resolve(__dirname, './src/__tests__/__mocks__/phaser3spectorjs.ts'),
    },
  },
});
