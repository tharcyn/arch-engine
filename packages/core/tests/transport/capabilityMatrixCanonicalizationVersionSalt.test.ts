import { describe, it, expect } from 'vitest';
import * as matrixHashModule from '../../src/transport/capabilityDescriptorMatrixHash.js';
import { computeSnapshotEnvelopeStructureHash } from '../../src/transport/snapshotEnvelopeStructureHash.js';

describe('Phase 8.7 / Phase 8.9: Capability Matrix Canonicalization Version Salt', () => {

  it('Test 1: Identical descriptors + identical canonicalizationVersion -> identical matrix hash', () => {
    const hash1 = matrixHashModule.computeCapabilityDescriptorMatrixHash();
    const hash2 = matrixHashModule.computeCapabilityDescriptorMatrixHash();
    expect(hash1).toBe(hash2);
  });

  it('Test 2: capabilityDescriptorConfig is frozen — mutation throws TypeError (C-2 enforcement)', () => {
    // Phase 8.9 C-2: capabilityDescriptorConfig is Object.freeze'd at declaration.
    // Any attempt to mutate it MUST throw in strict mode.
    expect(() => {
      (matrixHashModule.capabilityDescriptorConfig as any).capabilityMatrixCanonicalizationVersion = 'v99.0';
    }).toThrow(TypeError);
    
    // Verify config retained original value
    expect(matrixHashModule.capabilityDescriptorConfig.capabilityMatrixCanonicalizationVersion).toBe('v1');
  });

  it('Test 3: structureHash is deterministic — config immutability prevents drift', () => {
    const envelope = {
      version: 'v3',
      protocolVersion: '4.13',
      entries: [],
      explainabilityGraphHash: 'test',
      manifestDigestSetHash: 'test',
      namespaceSetHash: 'test',
      registrySourceHash: 'test',
      dependencyGraphShapeHash: 'test',
      structureHash: 'test'
    };

    const hash1 = computeSnapshotEnvelopeStructureHash(envelope);
    
    // Config is frozen — this mutation attempt should throw
    expect(() => {
      (matrixHashModule.capabilityDescriptorConfig as any).capabilityMatrixCanonicalizationVersion = 'structure-hash-test';
    }).toThrow(TypeError);
    
    // Hash must remain identical since config cannot be mutated
    const hash2 = computeSnapshotEnvelopeStructureHash(envelope);
    expect(hash1).toBe(hash2);
  });

});

