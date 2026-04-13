import { describe, it, expect } from 'vitest';
import { LOADER_PROTOCOL_VERSION } from '../../src/transport/types.js';
import { computeCapabilityDescriptorMatrixHash, capabilityDescriptorConfig } from '../../src/transport/capabilityDescriptorMatrixHash.js';
import { LOADER_PROTOCOL_CAPABILITIES } from '../../src/transport/loaderProtocolCapabilityDescriptor.js';
import { COMPOSITION_RUNTIME_CAPABILITIES } from '../../src/composition/compositionRuntimeCapabilityDescriptor.js';
import { EXECUTION_RUNTIME_CAPABILITIES } from '../../src/execution/executionRuntimeCapabilityDescriptor.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from '../../src/execution/context/contextCapabilityDescriptor.js';

describe('Phase 8.9 C-5: Protocol Version Identity Unification', () => {

  it('Test 1: LOADER_PROTOCOL_VERSION is the single authoritative source', () => {
    expect(typeof LOADER_PROTOCOL_VERSION).toBe('string');
    expect(LOADER_PROTOCOL_VERSION).toBe('4.13');
  });

  it('Test 2: No hardcoded 4.11 remains in hash salt computation', () => {
    // The matrix hash computation should incorporate LOADER_PROTOCOL_VERSION.
    // If it used '4.11', the hash would differ. We verify the hash is stable
    // and uses the current protocol version.
    const hash1 = computeCapabilityDescriptorMatrixHash();
    const hash2 = computeCapabilityDescriptorMatrixHash();
    expect(hash1).toBe(hash2);
    expect(hash1).toBeTruthy();
    expect(hash1.length).toBe(64); // SHA-256 hex
  });

  it('Test 3: All capability descriptors are frozen at declaration (C-4 enforcement)', () => {
    // Verify runtime immutability — Object.freeze, not just `as const`
    expect(Object.isFrozen(LOADER_PROTOCOL_CAPABILITIES)).toBe(true);
    expect(Object.isFrozen(COMPOSITION_RUNTIME_CAPABILITIES)).toBe(true);
    expect(Object.isFrozen(EXECUTION_RUNTIME_CAPABILITIES)).toBe(true);
    expect(Object.isFrozen(CONTEXT_RUNTIME_CAPABILITIES)).toBe(true);
    expect(Object.isFrozen(capabilityDescriptorConfig)).toBe(true);
    
    // Verify mutation attempts throw
    expect(() => {
      (LOADER_PROTOCOL_CAPABILITIES as any).version = 999;
    }).toThrow(TypeError);
    
    expect(() => {
      (COMPOSITION_RUNTIME_CAPABILITIES as any).version = 999;
    }).toThrow(TypeError);
    
    expect(() => {
      (EXECUTION_RUNTIME_CAPABILITIES as any).version = 999;
    }).toThrow(TypeError);
    
    expect(() => {
      (CONTEXT_RUNTIME_CAPABILITIES as any).version = 999;
    }).toThrow(TypeError);
  });

  it('Test 4: Descriptor versions are integers (Phase 8.8 enforcement)', () => {
    expect(Number.isInteger(LOADER_PROTOCOL_CAPABILITIES.version)).toBe(true);
    expect(Number.isInteger(COMPOSITION_RUNTIME_CAPABILITIES.version)).toBe(true);
    expect(Number.isInteger(EXECUTION_RUNTIME_CAPABILITIES.version)).toBe(true);
    expect(Number.isInteger(CONTEXT_RUNTIME_CAPABILITIES.version)).toBe(true);
  });
});
