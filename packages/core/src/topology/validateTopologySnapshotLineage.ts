import type { TopologySnapshot } from './TopologySnapshot';
import type { TopologySnapshotLineageValidationResult } from './TopologySnapshotLineageValidationResult';

/**
 * Validates lineage compatibility between two topology snapshots.
 *
 * Rules:
 * - If either snapshot lacks a lineageId, they are compatible.
 * - If both have a lineageId and they are equal, they are compatible.
 * - If both have a lineageId and they differ, they are incompatible.
 *
 * Pure, deterministic function. Mismatches are advisory only and
 * should not halt the pipeline.
 *
 * Phase 8D — Snapshot Identity & Lineage Surface
 */
export function validateTopologySnapshotLineage(
  currentSnapshot: TopologySnapshot,
  baselineSnapshot: TopologySnapshot
): TopologySnapshotLineageValidationResult {
  const currentLineageId = currentSnapshot.lineageId;
  const baselineLineageId = baselineSnapshot.lineageId;

  let compatible = true;

  if (
    currentLineageId !== undefined &&
    baselineLineageId !== undefined &&
    currentLineageId !== baselineLineageId
  ) {
    compatible = false;
  }

  return {
    compatible,
    currentLineageId,
    baselineLineageId,
  };
}
