// ExecutionInputMode enables explicit topology comparison semantics
// supporting snapshot-native governance workflows and future CI artifact pipelines

/**
 * Classifies the topology comparison mode based on input types.
 *
 * Phase 8A — Snapshot Pair Comparison Surface
 */
export type ExecutionInputMode =
  | "dataset_vs_dataset"
  | "dataset_vs_snapshot"
  | "snapshot_vs_dataset"
  | "snapshot_vs_snapshot";
