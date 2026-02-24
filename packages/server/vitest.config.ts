import { defineConfig } from 'vitest/config';
import { getAliases } from '@morten-olsen/builder-tests/vitest';

export default defineConfig(async () => {
  const aliases = await getAliases();
  return {
    resolve: {
      alias: aliases,
    },
    test: {
      exclude: ['dist/**', 'node_modules/**'],
    },
  };
});
