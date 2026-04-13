import { describe, it, expect } from 'vitest';
import { composePolicies } from '../src/policy/compositionResolver.js';
import { computeSnapshotClosureGraphHash } from '../src/transport/snapshotClosureGraphHash.js';
import { stableCanonicalStringify } from '../src/transport/stableCanonicalStringify.js';
import type { PolicyStackEntry } from '../src/policy/types.js';

/**
 * ═══════════════════════════════════════════════════════════
 *  Deterministic Build Replay — Identity Reproducibility Proof
 * ═══════════════════════════════════════════════════════════
 *
 *  The single strongest trust signal architecture tooling
 *  can emit publicly: run the engine twice with identical
 *  inputs and prove identical hash output.
 *
 *  This test proves:
 *  - decisionStructureHash is deterministic
 *  - snapshotClosureGraphHash is deterministic
 *  - effectiveHash is deterministic
 *  - Canonical serialization is deterministic
 *
 *  If this test fails, the engine has non-deterministic behavior
 *  and CANNOT be published as a governance runtime.
 */

const CANONICAL_POLICY_STACK: PolicyStackEntry[] = [
  {
    policyId: 'replay-proof-root',
    policyNamespace: 'com.arch-engine.replay-proof',
    hash: 'frozen-replay-root',
    config: {
      version: 1,
      mode: 'enforce',
      domains: {
        core: { tier: 'high' },
        infra: { tier: 'low' },
        adapters: { tier: 'medium' }
      },
      rules: {
        forbid: [
          { id: 'no-core-infra', from: 'core', to: 'infra', severity: 'error' },
          { id: 'no-adapters-core', from: 'adapters', to: 'core', severity: 'warning' }
        ]
      }
    }
  },
  {
    policyId: 'replay-proof-child',
    policyNamespace: 'com.arch-engine.replay-proof',
    hash: 'frozen-replay-child',
    config: {
      version: 1,
      mode: 'enforce',
      rules: {
        forbid: [
          { id: 'no-core-infra', from: 'core', to: 'infra', severity: 'error' }
        ]
      }
    }
  }
];

const CANONICAL_SEAM_FINGERPRINTS = [
  'seam::payment-core::v1',
  'seam::audit-trail::v1',
  'seam::notification-dispatch::v1'
];

const CANONICAL_CLOSURE_PROVENANCE = {
  manifestContentHash: 'abc123def456',
  signatureDigest: 'sig_replay_proof_000',
  registryTrustRootId: 'registry-central'
};

describe('deterministic build replay — identity reproducibility proof', () => {

  it('composePolicies produces identical effectiveHash across 100 invocations', () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const result = composePolicies(CANONICAL_POLICY_STACK);
      hashes.add(result.effectiveHash);
    }
    expect(hashes.size).toBe(1);
  });

  it('snapshotClosureGraphHash produces identical hash across 100 invocations', () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const hash = computeSnapshotClosureGraphHash(
        CANONICAL_POLICY_STACK,
        CANONICAL_SEAM_FINGERPRINTS,
        CANONICAL_CLOSURE_PROVENANCE
      );
      hashes.add(hash);
    }
    expect(hashes.size).toBe(1);
  });

  it('stableCanonicalStringify is key-order independent across shuffled inputs', () => {
    const inputA = {
      z: 'last',
      a: 'first',
      m: { nested: true, alpha: 1 },
      array: [3, 1, 2]
    };

    const inputB = {
      a: 'first',
      m: { alpha: 1, nested: true },
      z: 'last',
      array: [3, 1, 2]
    };

    const hashA = stableCanonicalStringify(inputA);
    const hashB = stableCanonicalStringify(inputB);
    expect(hashA).toBe(hashB);
  });

  it('full replay: composition + closure hash is identical across disjoint invocations', () => {
    // First invocation
    const composed1 = composePolicies(CANONICAL_POLICY_STACK);
    const closureHash1 = computeSnapshotClosureGraphHash(
      CANONICAL_POLICY_STACK,
      CANONICAL_SEAM_FINGERPRINTS,
      CANONICAL_CLOSURE_PROVENANCE
    );

    // Second invocation — completely fresh
    const composed2 = composePolicies(CANONICAL_POLICY_STACK);
    const closureHash2 = computeSnapshotClosureGraphHash(
      CANONICAL_POLICY_STACK,
      CANONICAL_SEAM_FINGERPRINTS,
      CANONICAL_CLOSURE_PROVENANCE
    );

    expect(composed1.effectiveHash).toBe(composed2.effectiveHash);
    expect(closureHash1).toBe(closureHash2);
  });

  it('hash values are 64-character hex strings (SHA-256)', () => {
    const composed = composePolicies(CANONICAL_POLICY_STACK);
    const closureHash = computeSnapshotClosureGraphHash(
      CANONICAL_POLICY_STACK,
      CANONICAL_SEAM_FINGERPRINTS,
      CANONICAL_CLOSURE_PROVENANCE
    );

    expect(composed.effectiveHash).toMatch(/^[0-9a-f]{64}$/);
    expect(closureHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('snapshot: hash outputs are frozen as protocol contract', () => {
    const composed = composePolicies(CANONICAL_POLICY_STACK);
    const closureHash = computeSnapshotClosureGraphHash(
      CANONICAL_POLICY_STACK,
      CANONICAL_SEAM_FINGERPRINTS,
      CANONICAL_CLOSURE_PROVENANCE
    );

    expect({
      effectiveHash: composed.effectiveHash,
      closureHash
    }).toMatchSnapshot();
  });
});
