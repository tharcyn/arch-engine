import { describe, test, expect } from 'vitest';
import { detectExecutionInputMode } from '../src/detectExecutionInputMode';

/**
 * ═══════════════════════════════════════════════════════════
 *  Phase 8A — Execution Input Mode Detection Tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Tests verify deterministic mapping of input type
 *  booleans to ExecutionInputMode literals.
 */

describe('Phase 8A Execution Input Mode Detection', () => {

  test('dataset_vs_dataset_mode_detected', () => {
    const mode = detectExecutionInputMode(false, false);
    expect(mode).toBe("dataset_vs_dataset");
  });

  test('dataset_vs_snapshot_mode_detected', () => {
    const mode = detectExecutionInputMode(false, true);
    expect(mode).toBe("dataset_vs_snapshot");
  });

  test('snapshot_vs_dataset_mode_detected', () => {
    const mode = detectExecutionInputMode(true, false);
    expect(mode).toBe("snapshot_vs_dataset");
  });

  test('snapshot_vs_snapshot_mode_detected', () => {
    const mode = detectExecutionInputMode(true, true);
    expect(mode).toBe("snapshot_vs_snapshot");
  });
});
