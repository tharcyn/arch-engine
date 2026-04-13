import { describe, it, expect } from 'vitest';
import { computeCapabilityDescriptorMatrixHash } from '../../src/transport/capabilityDescriptorMatrixHash.js';
import { LOADER_PROTOCOL_CAPABILITIES } from '../../src/transport/loaderProtocolCapabilityDescriptor.js';

describe('Phase 8.6: Capability Descriptor Matrix Hash', () => {

  it('Test 1: Identical descriptor sets produce identical hash', () => {
    const hash1 = computeCapabilityDescriptorMatrixHash();
    const hash2 = computeCapabilityDescriptorMatrixHash();
    expect(hash1).toBe(hash2);
  });

  it('Test 2: Descriptor version change produces different hash (blocked by freeze)', () => {
    computeCapabilityDescriptorMatrixHash(); // Trigger freeze
    expect(() => {
       'use strict';
       (LOADER_PROTOCOL_CAPABILITIES as any).version = 999;
    }).toThrow();
  });

  it('Test 3: Descriptor key set change produces different hash (blocked by freeze)', () => {
    computeCapabilityDescriptorMatrixHash(); // Trigger freeze
    expect(() => {
       'use strict';
       (LOADER_PROTOCOL_CAPABILITIES as any).newArbitraryKey = true;
    }).toThrow();
  });
});
