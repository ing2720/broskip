import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    environmentOptions: { jsdom: { url: 'https://www.netflix.com/watch/123' } },
    restoreMocks: true,
  },
});
