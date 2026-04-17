/**
 * Result of comparing two snapshot lineages.
 *
 * Phase 8D — Snapshot Identity & Lineage Surface
 */
export interface TopologySnapshotLineageValidationResult {
  readonly compatible: boolean;
  readonly currentLineageId?: string;
  readonly baselineLineageId?: string;
}
