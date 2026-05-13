/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-emitter
 * ═══════════════════════════════════════════════════════════
 *
 *  Private, experimental MVP emitter that converts Arch-Engine
 *  JSON v2 reports into deterministic AGP canonical bundles:
 *
 *    agp/
 *      snapshot.json
 *      records.ndjson
 *
 *  This package is `"private": true`. It is NOT published to npm
 *  and is NOT wired into the main `arch-engine` CLI. The CLI
 *  integration happens later, after a real-repo bundle trial.
 *
 *  Spec:
 *    - docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md
 *  Schemas:
 *    - docs/agp/schemas/v1/
 *  Conformance corpus:
 *    - docs/agp/conformance/v1/
 */

export { emitAgpBundle } from './emitAgpBundle.js';
export {
  emitAgpBundleToDirectory,
  type EmitAgpBundleToDirectoryOptions,
  type EmitAgpBundleToDirectoryResult,
} from './emitAgpBundleToDirectory.js';
export { AgpEmitterError, isAgpEmitterError, type AgpEmitterErrorCode } from './errors.js';
export type {
  AgpBundleResult,
  AgpEmitterOptions,
  AgpPlane,
  AgpRecord,
  AgpRecordFamily,
  AgpSnapshot,
  AgpSnapshotCounts,
  AgpSnapshotManifestEntry,
  ArchEngineCommand,
  ArchEngineJsonV2Envelope,
  SupportedArchEngineCommand,
} from './types.js';
