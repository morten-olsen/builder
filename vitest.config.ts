import { defineConfig, type UserConfigExport } from 'vitest/config';

export default defineConfig(async () => {
  const config: UserConfigExport = {
    test: {
      coverage: {
        provider: 'v8',
        include: ['packages/**/src/**/*.ts'],
      },
    },
  };
  return config;
});
