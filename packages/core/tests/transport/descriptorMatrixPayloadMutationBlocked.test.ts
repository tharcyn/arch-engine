import { describe, it, expect } from 'vitest';
import * as crypto from 'node:crypto';
import { computeCapabilityDescriptorMatrixHash } from '../../src/transport/capabilityDescriptorMatrixHash.js';
import { LOADER_PROTOCOL_CAPABILITIES } from '../../src/transport/loaderProtocolCapabilityDescriptor.js';

describe('Phase 8.8: Descriptor Matrix Payload Mutation Blocked', () => {

  it('Test 1: Mutating capability properties after initialization fails', () => {
    // LOADER_PROTOCOL_CAPABILITIES is deeply frozen. Therefore, mutation is mechanically blocked.
    // We are validating that the system inherently rejects mutations on constant descriptor exports, 
    // ensuring the hash generator constructs pure payloads.
    
    computeCapabilityDescriptorMatrixHash(); // Trigger deep freeze

    // JS throws TypeError on frozen mutation in strict mode
    expect(() => {
      'use strict';
      const mutated = Object.assign({}, LOADER_PROTOCOL_CAPABILITIES);
      (mutated as any).version = 999;
      // Note: We can mutate copies, but we can't mutate the raw exports.
      // Additionally, the capabilityDescriptorMatrixHash logic deeply freezes the wrapped container.
    }).not.toThrow();

    expect(() => {
       'use strict';
       (LOADER_PROTOCOL_CAPABILITIES as any).version = 999;
    }).toThrow();
  });

  it('Test 2: computeCapabilityDescriptorMatrixHash produces stable deterministic hash implicitly protected from transport injection', () => {
     const hash1 = computeCapabilityDescriptorMatrixHash();
     const hash2 = computeCapabilityDescriptorMatrixHash();
     expect(hash1).toBe(hash2);
  });
});
