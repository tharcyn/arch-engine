/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-verifier
 * ═══════════════════════════════════════════════════════════
 *
 *  Private, experimental MVP verifier for AGP canonical bundles
 *  emitted by `@arch-engine/agp-emitter`.
 *
 *  Reads:
 *    <bundleDir>/
 *      snapshot.json
 *      records.ndjson
 *
 *  Returns a deterministic verdict in:
 *    { valid, valid_with_warnings, invalid, unsupported_schema, tampered }
 *
 *  This package is `"private": true`. It is NOT published to npm
 *  and is NOT wired into the main `arch-engine` CLI.
 *
 *  Spec:
 *    - docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md §16
 *  Schemas:
 *    - docs/agp/schemas/v1/
 *  Conformance corpus:
 *    - docs/agp/conformance/v1/
 */

export { verifyAgpBundle, type VerifyAgpBundleArgs } from './verifyAgpBundle.js';
export {
  verifyAgpBundleDirectory,
  type VerifyAgpBundleDirectoryArgs,
} from './verifyAgpBundleDirectory.js';
export { readBundleDirectory, type ReadBundleResult } from './readBundle.js';
export {
  AgpVerifierError,
  isAgpVerifierError,
  type AgpVerifierIssueCode,
} from './errors.js';
export type {
  AgpParsedBundle,
  AgpPlane,
  AgpRecord,
  AgpRecordFamily,
  AgpSnapshot,
  AgpSnapshotCounts,
  AgpSnapshotManifestEntry,
  AgpVerificationIssue,
  AgpVerificationResult,
  AgpVerificationSeverity,
  AgpVerificationSummary,
  AgpVerificationVerdict,
  AgpVerifierOptions,
} from './types.js';
