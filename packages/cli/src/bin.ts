#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Execution Entrypoint
 * ═══════════════════════════════════════════════════════════
 *
 *  Phase 10 (v1.1.0): we inspect raw argv BEFORE importing the rest
 *  of the CLI so `--ci` and `--no-color` can flip `NO_COLOR=1` in
 *  the environment ahead of `picocolors` reading it. picocolors
 *  caches its color-support decision at import time, so setting
 *  `NO_COLOR` later in `cli-options.ts` does not retroactively
 *  disable colour. Doing it here, with a dynamic import, ensures
 *  the env var is set before any other module loads.
 *
 *  ESM hoists static `import` statements to the top of the module,
 *  so a static `import` would run BEFORE this check. We use
 *  `import()` (dynamic) so the side-effects on `process.env` happen
 *  first, then the rest of the CLI loads.
 */

if (process.argv.includes('--ci') || process.argv.includes('--no-color')) {
  process.env.NO_COLOR = '1';
}

const { run } = await import('./cli.js');

await run().catch((error) => {
  // The structured renderer in cli.ts handles known errors. Anything
  // that escapes is a hard bug — print and exit non-zero.
  console.error(error);
  process.exit(1);
});
