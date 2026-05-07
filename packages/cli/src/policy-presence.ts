/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Policy-presence detection
 * ═══════════════════════════════════════════════════════════
 *
 *  Single shared helper used by `doctor`, `analyze`, and
 *  `check` to decide whether the user has configured a
 *  policy file. Centralised so that all three commands ask
 *  the same question.
 *
 *  Policy presence drives output calibration: when no policy
 *  is configured, headlines must NOT use negative tiers like
 *  "CRITICAL". See the CLI Experience Specification §5.3 and
 *  §5.4 for the rendering rules.
 *
 *  This helper does not parse the policy. It returns true if
 *  any of the recognised policy file paths exists, false
 *  otherwise. Parsing is left to `@arch-engine/core`'s
 *  `loadPolicyConfig`.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface PolicyPresence {
  readonly configured: boolean;
  readonly path: string | null;
}

const KNOWN_POLICY_PATHS: ReadonlyArray<string> = [
  // Canonical (matches @arch-engine/core's loadPolicyConfig).
  '.archengine/policy.yml',
  // Friendlier names mentioned historically in messages.
  'arch-policy.yml',
  'arch-engine.yml',
];

export function detectPolicyFile(cwd: string): PolicyPresence {
  for (const candidate of KNOWN_POLICY_PATHS) {
    const full = path.join(cwd, candidate);
    if (fs.existsSync(full)) {
      return { configured: true, path: candidate };
    }
  }
  return { configured: false, path: null };
}
