/**
 * Result of validating a baseline snapshot's surface version compatibility.
 *
 * Phase 7C — Snapshot Compatibility Validation Surface
 */
export interface TopologySnapshotCompatibilityResult {

  readonly compatible: boolean;

  readonly expectedVersion: "1.0.0";

  readonly actualVersion: string | undefined;
}
