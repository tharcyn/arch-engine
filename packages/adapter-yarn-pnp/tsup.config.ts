import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  // DTS emission is delegated to `tsc` via the package build script
  // because tsup's rollup-plugin-dts struggles with multi-file
  // packages under `composite: true` base configs. Mirrors the
  // adapter-pnpm tsup config for consistency.
  dts: false,
  clean: true,
  splitting: false,
  sourcemap: false,
  target: 'node18',
  tsconfig: './tsconfig.json',
});
