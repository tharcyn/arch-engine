import { describe, it, expect } from 'vitest';
import { assertCapabilityDescriptorMatrixParity } from '../../src/transport/assertCapabilityDescriptorMatrixParity.js';
import { capabilityDescriptorConfig } from '../../src/transport/capabilityDescriptorMatrixHash.js';

import { LOADER_PROTOCOL_CAPABILITIES } from '../../src/transport/loaderProtocolCapabilityDescriptor.js';
import { COMPOSITION_RUNTIME_CAPABILITIES } from '../../src/composition/compositionRuntimeCapabilityDescriptor.js';
import { EXECUTION_RUNTIME_CAPABILITIES } from '../../src/execution/executionRuntimeCapabilityDescriptor.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from '../../src/execution/context/contextCapabilityDescriptor.js';

describe('Phase 8.8: Canonicalization Version Mismatch Rejected', () => {

  const baseRemoteMatrix = {
    loaderProtocolCapabilityDescriptor: JSON.parse(JSON.stringify(LOADER_PROTOCOL_CAPABILITIES)),
    compositionRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(COMPOSITION_RUNTIME_CAPABILITIES)),
    executionRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(EXECUTION_RUNTIME_CAPABILITIES)),
    contextRuntimeCapabilityDescriptor: JSON.parse(JSON.stringify(CONTEXT_RUNTIME_CAPABILITIES)),
    capabilityMatrixCanonicalizationVersion: capabilityDescriptorConfig.capabilityMatrixCanonicalizationVersion
  };

  it('Test 1: Rejects mismatched canonicalizationVersion', () => {
    const mismatchMatrix = JSON.parse(JSON.stringify(baseRemoteMatrix));
    mismatchMatrix.capabilityMatrixCanonicalizationVersion = 'v9.9.9-bad';
    
    expect(() => assertCapabilityDescriptorMatrixParity(mismatchMatrix))
      .toThrow('Capability matrix canonicalization version mismatch');
  });

});
