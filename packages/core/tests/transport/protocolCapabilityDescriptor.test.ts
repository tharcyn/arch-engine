import { describe, it, expect } from 'vitest';
import { LOADER_PROTOCOL_CAPABILITIES } from '../../src/transport/loaderProtocolCapabilityDescriptor.js';

describe('Phase 4.13: Loader Protocol Capability Descriptor', () => {

  it('Test 1: Should correctly document the protocol version', () => {
    expect(LOADER_PROTOCOL_CAPABILITIES.version).toBe(4);
  });

  it('Test 2: Should correctly document snapshot envelope version', () => {
    expect(LOADER_PROTOCOL_CAPABILITIES.snapshotEnvelopeVersion).toBe('v3');
  });

  it('Test 3: Should list protocol features correctly as true', () => {
    expect(LOADER_PROTOCOL_CAPABILITIES.deterministicTopology).toBe(true);
    expect(LOADER_PROTOCOL_CAPABILITIES.manifestEntropyAwareIdentity).toBe(true);
    expect(LOADER_PROTOCOL_CAPABILITIES.registryProvenanceTracing).toBe(true);
    expect(LOADER_PROTOCOL_CAPABILITIES.deepMetadataImmutability).toBe(true);
    expect(LOADER_PROTOCOL_CAPABILITIES.envelopeFieldWhitelisted).toBe(true);
    expect(LOADER_PROTOCOL_CAPABILITIES.plainObjectMetadataEnforced).toBe(true);
    expect(LOADER_PROTOCOL_CAPABILITIES.transportCompatibilityCertified).toBe(true);
  });

  it('Test 4: Should correctly document pipeline contract version', () => {
    expect(LOADER_PROTOCOL_CAPABILITIES.pipelineContractVersion).toBe('v5');
  });

});
