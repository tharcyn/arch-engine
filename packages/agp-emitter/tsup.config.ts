import { defineConfig } from 'tsup';

export default defineConfig({
  // Programmatic API + CLI binary. The CLI's shebang line is added in
  // src/cli.ts; tsup preserves it verbatim.
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  splitting: false,
  sourcemap: false,
  target: 'node18',
  tsconfig: './tsconfig.json',
});
