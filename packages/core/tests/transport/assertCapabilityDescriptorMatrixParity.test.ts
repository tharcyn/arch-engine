import { describe, it, expect } from 'vitest';
import { assertCapabilityDescriptorMatrixParity } from '../../src/transport/assertCapabilityDescriptorMatrixParity.js';

import { LOADER_PROTOCOL_CAPABILITIES } from '../../src/transport/loaderProtocolCapabilityDescriptor.js';
import { COMPOSITION_RUNTIME_CAPABILITIES } from '../../src/composition/compositionRuntimeCapabilityDescriptor.js';
import { EXECUTION_RUNTIME_CAPABILITIES } from '../../src/execution/executionRuntimeCapabilityDescriptor.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from '../../src/execution/context/contextCapabilityDescriptor.js';
import { CAPABILITY_FEDERATION_DESCRIPTOR } from '../../src/capability/capabilityFederationTypes.js';

import { capabilityDescriptorConfig } from '../../src/transport/capabilityDescriptorMatrixHash.js';

describe('Phase 8.6: Capability Descriptor Matrix Parity', () => {

  const baseRemoteMatrix = {
    loaderProtocolCapabilityDescriptor: JSON.parse(JSON.stringify(LOADER_PROTOCOL_CAPABILITIES)),
    compositionRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(COMPOSITION_RUNTIME_CAPABILITIES)),
    executionRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(EXECUTION_RUNTIME_CAPABILITIES)),
    contextRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(CONTEXT_RUNTIME_CAPABILITIES)),
    capabilityFederationDescriptor: JSON.parse(JSON.stringify(CAPABILITY_FEDERATION_DESCRIPTOR)),
    capabilityMatrixCanonicalizationVersion: capabilityDescriptorConfig.capabilityMatrixCanonicalizationVersion
  };

  it('Test 1: Identical matrix passes without error', () => {
    expect(() => assertCapabilityDescriptorMatrixParity(baseRemoteMatrix)).not.toThrow();
  });

  it('Test 2: Rejects mismatched descriptor matrices (wrong version)', () => {
    const brokenMatrix = JSON.parse(JSON.stringify(baseRemoteMatrix));
    brokenMatrix.loaderProtocolCapabilityDescriptor.version = 999;
    expect(() => assertCapabilityDescriptorMatrixParity(brokenMatrix))
      .toThrow('Capability descriptor version mismatch');
  });

  it('Test 3: Rejects missing keys in descriptor', () => {
    const brokenMatrix = JSON.parse(JSON.stringify(baseRemoteMatrix));
    delete brokenMatrix.loaderProtocolCapabilityDescriptor.version;
    expect(() => assertCapabilityDescriptorMatrixParity(brokenMatrix))
      .toThrow('Capability descriptor key set mismatch');
  });

  it('Test 4: Rejects modified presence', () => {
    const brokenMatrix = JSON.parse(JSON.stringify(baseRemoteMatrix));
    delete brokenMatrix.compositionRuntimeCapabilityDescriptor;
    expect(() => assertCapabilityDescriptorMatrixParity(brokenMatrix))
      .toThrow('Capability matrix descriptor presence mismatch');
  });

});
