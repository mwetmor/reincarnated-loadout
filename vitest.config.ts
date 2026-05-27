/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

// Separate vitest config — kept distinct from vite.config.ts to avoid
// plugin type conflicts between vite@8 (project) and vitest@3 (bundled vite@7).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    globals: false,
  },
});
