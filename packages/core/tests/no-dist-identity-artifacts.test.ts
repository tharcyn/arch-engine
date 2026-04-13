import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * ═══════════════════════════════════════════════════════════
 *  Distribution-Layer Identity Artifact Enforcement
 * ═══════════════════════════════════════════════════════════
 *
 *  The identity entry point (src/identity/index.ts) was
 *  intentionally sealed from public distribution in the
 *  v0.1.0-preview certification pass.
 *
 *  This test ensures no dist/identity.* artifacts exist,
 *  converting the sealing from a build convention into
 *  an enforced invariant.
 *
 *  If this test fails, it means someone re-added 'identity'
 *  to tsup.config.ts entry points. That is a surface leak.
 */

const DIST_DIR = path.resolve(__dirname, '../dist');

const FORBIDDEN_IDENTITY_ARTIFACTS = [
  'identity.js',
  'identity.cjs',
  'identity.d.ts',
  'identity.d.cts',
  'identity.js.map',
  'identity.cjs.map',
];

describe('identity distribution artifact sealing enforcement', () => {

  for (const artifact of FORBIDDEN_IDENTITY_ARTIFACTS) {
    it(`dist/${artifact} must not exist`, () => {
      const artifactPath = path.join(DIST_DIR, artifact);
      expect(
        fs.existsSync(artifactPath),
        `IDENTITY SURFACE LEAK: dist/${artifact} exists. Remove 'identity' from tsup.config.ts entry points.`
      ).toBe(false);
    });
  }
});
