import { describe, it, expect } from 'vitest';
import { assertSnapshotEnvelopeVersionInvariant } from '../../src/transport/assertSnapshotEnvelopeVersionInvariant.js';
import { SNAPSHOT_ENVELOPE_VERSION } from '../../src/transport/types.js';

describe('Phase 4.11: Snapshot Envelope Version Invariant', () => {

  it('Test 1: Matching version passes', () => {
    expect(() => assertSnapshotEnvelopeVersionInvariant(SNAPSHOT_ENVELOPE_VERSION)).not.toThrow();
  });

  it('Test 2: Mismatched version throws SNAPSHOT_ENVELOPE_VERSION_DRIFT', () => {
    expect(() => assertSnapshotEnvelopeVersionInvariant('v1')).toThrow('version drift');
  });

  it('Test 3: Custom expected version comparison', () => {
    expect(() => assertSnapshotEnvelopeVersionInvariant('v2', 'v2')).not.toThrow();
    expect(() => assertSnapshotEnvelopeVersionInvariant('v3', 'v2')).toThrow('version drift');
  });

  it('Test 4: Current version is v3', () => {
    expect(SNAPSHOT_ENVELOPE_VERSION).toBe('v3');
  });

});
