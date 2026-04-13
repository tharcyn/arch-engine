import { describe, it, expect } from 'vitest';

export type ReplayCompatibilityState =
  | 'SUPPORTED'
  | 'UNSUPPORTED_FUTURE_PROTOCOL'
  | 'UNSUPPORTED_LEGACY_PROTOCOL';

export function evaluateSnapshotCompatibility(snapshotProtocol: string, engineProtocol: string): ReplayCompatibilityState {
  if (snapshotProtocol === engineProtocol) return 'SUPPORTED';
  return snapshotProtocol > engineProtocol ? 'UNSUPPORTED_FUTURE_PROTOCOL' : 'UNSUPPORTED_LEGACY_PROTOCOL';
}

describe('Phase 10 Hard Invariant: snapshot_protocol_rejection', () => {

  it('rejects unsupported future protocols deterministically', () => {
    expect(evaluateSnapshotCompatibility('5.0', '4.13')).toBe('UNSUPPORTED_FUTURE_PROTOCOL');
  });

  it('rejects unsupported legacy protocols deterministically', () => {
    expect(evaluateSnapshotCompatibility('3.0', '4.13')).toBe('UNSUPPORTED_LEGACY_PROTOCOL');
  });

  it('evaluates exactly identical supported mappings accurately', () => {
    expect(evaluateSnapshotCompatibility('4.13', '4.13')).toBe('SUPPORTED');
  });

});
