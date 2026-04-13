#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Execution Entrypoint
 * ═══════════════════════════════════════════════════════════
 */

import { run } from './cli.js';

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
