import type { ExecutionInputMode } from './ExecutionInputMode';

/**
 * Detects the execution input mode based on whether the current
 * and baseline inputs are snapshots or datasets.
 *
 * Pure, deterministic, side-effect free.
 *
 * Phase 8A — Snapshot Pair Comparison Surface
 */
export function detectExecutionInputMode(
  currentInputIsSnapshot: boolean,
  baselineInputIsSnapshot: boolean
): ExecutionInputMode {
  if (currentInputIsSnapshot && baselineInputIsSnapshot) {
    return "snapshot_vs_snapshot";
  }
  if (currentInputIsSnapshot && !baselineInputIsSnapshot) {
    return "snapshot_vs_dataset";
  }
  if (!currentInputIsSnapshot && baselineInputIsSnapshot) {
    return "dataset_vs_snapshot";
  }
  return "dataset_vs_dataset";
}
