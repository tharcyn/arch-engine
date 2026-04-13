import { describe, it, expect } from 'vitest';
import { assertCapabilityDescriptorMatrixParity } from '../../src/transport/assertCapabilityDescriptorMatrixParity.js';
import { capabilityDescriptorConfig } from '../../src/transport/capabilityDescriptorMatrixHash.js';

import { LOADER_PROTOCOL_CAPABILITIES } from '../../src/transport/loaderProtocolCapabilityDescriptor.js';
import { COMPOSITION_RUNTIME_CAPABILITIES } from '../../src/composition/compositionRuntimeCapabilityDescriptor.js';
import { EXECUTION_RUNTIME_CAPABILITIES } from '../../src/execution/executionRuntimeCapabilityDescriptor.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from '../../src/execution/context/contextCapabilityDescriptor.js';
import { CAPABILITY_FEDERATION_DESCRIPTOR } from '../../src/capability/capabilityFederationTypes.js';

describe('Phase 8.7: Capability Matrix Canonicalization Parity', () => {

  const baseRemoteMatrix = {
    loaderProtocolCapabilityDescriptor: JSON.parse(JSON.stringify(LOADER_PROTOCOL_CAPABILITIES)),
    compositionRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(COMPOSITION_RUNTIME_CAPABILITIES)),
    executionRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(EXECUTION_RUNTIME_CAPABILITIES)),
    contextRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(CONTEXT_RUNTIME_CAPABILITIES)),
    capabilityFederationDescriptor: JSON.parse(JSON.stringify(CAPABILITY_FEDERATION_DESCRIPTOR)),
    capabilityMatrixCanonicalizationVersion: capabilityDescriptorConfig.capabilityMatrixCanonicalizationVersion
  };

  it('Test 1: Identical canonicalizationVersion parity passes', () => {
    expect(() => assertCapabilityDescriptorMatrixParity(baseRemoteMatrix)).not.toThrow();
  });

  it('Test 2: Rejects mismatched canonicalizationVersion parity', () => {
    const brokenMatrix = JSON.parse(JSON.stringify(baseRemoteMatrix));
    brokenMatrix.capabilityMatrixCanonicalizationVersion = 'v99.9-drift';
    
    expect(() => assertCapabilityDescriptorMatrixParity(brokenMatrix))
      .toThrow('Capability matrix canonicalization version mismatch');
  });
});
