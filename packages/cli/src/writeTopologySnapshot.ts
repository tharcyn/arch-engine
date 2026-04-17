import type { TopologySnapshot } from '@arch-engine/core';
import * as fs from 'node:fs';

/**
 * Writes a TopologySnapshot to disk as deterministic JSON.
 *
 * Serialization uses 2-space indentation with a trailing newline.
 * No console output inside this function.
 * No platform-dependent line endings.
 *
 * Phase 7B — Snapshot Persistence Surface
 */
export function writeTopologySnapshot(
  snapshot: TopologySnapshot,
  outputPath: string
): void {
  const content = JSON.stringify(snapshot, null, 2) + "\n";
  fs.writeFileSync(outputPath, content, 'utf-8');
}
