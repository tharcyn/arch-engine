/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-verifier — Filesystem entrypoint
 * ═══════════════════════════════════════════════════════════
 *
 *  Reads a bundle directory and runs verification.
 *
 *  Throws `AgpVerifierError` on hard IO/parse failures (missing
 *  directory, missing files, malformed snapshot.json). Returns
 *  `AgpVerificationResult` for all other outcomes.
 *
 *  Does NOT mutate the bundle directory. Does NOT write any
 *  output files. Does NOT execute repository code.
 */

import { readBundleDirectory } from './readBundle.js';
import { verifyAgpBundle } from './verifyAgpBundle.js';
import type { AgpVerificationResult, AgpVerifierOptions } from './types.js';

export interface VerifyAgpBundleDirectoryArgs {
  readonly bundleDir: string;
  readonly options?: AgpVerifierOptions;
}

export function verifyAgpBundleDirectory(
  args: VerifyAgpBundleDirectoryArgs,
): AgpVerificationResult {
  const { bundleDir, options = {} } = args;

  const read = readBundleDirectory(bundleDir);
  // If readBundleDirectory returned without a bundle (parse errors
  // on snapshot.json would have thrown), fall through with the
  // pre-issues only.
  if (!read.bundle) {
    throw new Error(
      'AGP verifier internal error: readBundleDirectory returned no bundle without throwing',
    );
  }

  return verifyAgpBundle({
    bundle: read.bundle,
    preIssues: read.issues,
    bundlePath: bundleDir,
    options,
  });
}
