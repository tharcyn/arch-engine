import { describe, it, expect } from 'vitest';
import { assertCapabilityDescriptorMatrixParity } from '../../src/transport/assertCapabilityDescriptorMatrixParity.js';
import { capabilityDescriptorConfig } from '../../src/transport/capabilityDescriptorMatrixHash.js';

import { LOADER_PROTOCOL_CAPABILITIES } from '../../src/transport/loaderProtocolCapabilityDescriptor.js';
import { COMPOSITION_RUNTIME_CAPABILITIES } from '../../src/composition/compositionRuntimeCapabilityDescriptor.js';
import { EXECUTION_RUNTIME_CAPABILITIES } from '../../src/execution/executionRuntimeCapabilityDescriptor.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from '../../src/execution/context/contextCapabilityDescriptor.js';
import { CAPABILITY_FEDERATION_DESCRIPTOR } from '../../src/capability/capabilityFederationTypes.js';

describe('Phase 8.8: Descriptor Version Float Rejected', () => {

  const baseRemoteMatrix = {
    loaderProtocolCapabilityDescriptor: JSON.parse(JSON.stringify(LOADER_PROTOCOL_CAPABILITIES)),
    compositionRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(COMPOSITION_RUNTIME_CAPABILITIES)),
    executionRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(EXECUTION_RUNTIME_CAPABILITIES)),
    contextRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(CONTEXT_RUNTIME_CAPABILITIES)),
    capabilityFederationDescriptor: JSON.parse(JSON.stringify(CAPABILITY_FEDERATION_DESCRIPTOR)),
    capabilityMatrixCanonicalizationVersion: capabilityDescriptorConfig.capabilityMatrixCanonicalizationVersion
  };

  it('Test 1: Rejects float versions for remote matrix descriptors', () => {
    const floatMatrix = JSON.parse(JSON.stringify(baseRemoteMatrix));
    floatMatrix.loaderProtocolCapabilityDescriptor.version = 4.13;
    
    expect(() => assertCapabilityDescriptorMatrixParity(floatMatrix))
      .toThrow('Capability descriptor remote version is not an integer');
  });

});
