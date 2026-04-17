import type { TopologySnapshotCompatibilityResult } from './TopologySnapshotCompatibilityResult';

// Ensures baseline snapshot compatibility before diff execution
// Prevents silent architecture drift misclassification across snapshot surface upgrades

/**
 * Validates that a baseline snapshot is version-compatible
 * with the current snapshot surface contract.
 *
 * Returns a deterministic compatibility result.
 * Never throws exceptions.
 *
 * Phase 7C — Snapshot Compatibility Validation Surface
 */
export function validateTopologySnapshotCompatibility(
  snapshot: unknown
): TopologySnapshotCompatibilityResult {
  if (
    snapshot === null ||
    snapshot === undefined ||
    typeof snapshot !== 'object'
  ) {
    return {
      compatible: false,
      expectedVersion: "1.0.0",
      actualVersion: undefined,
    };
  }

  const record = snapshot as Record<string, unknown>;
  const actualVersion =
    typeof record.snapshotSurfaceVersion === 'string'
      ? record.snapshotSurfaceVersion
      : undefined;

  if (actualVersion !== "1.0.0") {
    return {
      compatible: false,
      expectedVersion: "1.0.0",
      actualVersion,
    };
  }

  return {
    compatible: true,
    expectedVersion: "1.0.0",
    actualVersion,
  };
}
