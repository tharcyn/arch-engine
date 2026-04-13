import { describe, it, expect } from 'vitest';
import { computeSnapshotEnvelopeStructureHash } from '../../src/transport/snapshotEnvelopeStructureHash.js';
import { LOADER_PROTOCOL_CAPABILITIES } from '../../src/transport/loaderProtocolCapabilityDescriptor.js';

describe('Phase 8.6: Structure Hash Capability Matrix Sensitivity', () => {

  it('Test 1: structureHash capability matrix is frozen and mutations throw', () => {
    // Trigger deep freeze natively
    computeSnapshotEnvelopeStructureHash({ 
      version: 'v3', protocolVersion: '4.11', entries: [], explainabilityGraphHash: 'test', 
      manifestDigestSetHash: 'test', namespaceSetHash: 'test', registrySourceHash: 'test', 
      dependencyGraphShapeHash: 'test', structureHash: 'test' 
    });

    // Phase 8.8 enforces deep freeze semantic
    expect(() => {
       'use strict';
       (LOADER_PROTOCOL_CAPABILITIES as any).version = 999;
    }).toThrow();
  });

});
