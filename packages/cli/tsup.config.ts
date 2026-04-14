import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/bin.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  minify: false,
  dts: false,
  external: ['@arch-engine/adapter-monorepo'],
});
