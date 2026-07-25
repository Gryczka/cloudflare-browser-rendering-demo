import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
  resolve: {
    alias: {
      // `cloudflare:workers` is a virtual module provided by the Workers
      // runtime, so Vite cannot resolve it under Vitest. Point it at a stub
      // that exposes a mutable `env` plus fake rate limiter bindings.
      'cloudflare:workers': fileURLToPath(
        new URL('./src/__tests__/mocks/cloudflare-workers.ts', import.meta.url)
      ),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    css: false,
  },
});
