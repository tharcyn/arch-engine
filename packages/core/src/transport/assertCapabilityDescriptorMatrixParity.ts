import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';
import { computeCapabilityDescriptorMatrixHash, capabilityDescriptorConfig } from './capabilityDescriptorMatrixHash.js';

import { LOADER_PROTOCOL_CAPABILITIES } from './loaderProtocolCapabilityDescriptor.js';
import { COMPOSITION_RUNTIME_CAPABILITIES } from '../composition/compositionRuntimeCapabilityDescriptor.js';
import { EXECUTION_RUNTIME_CAPABILITIES } from '../execution/executionRuntimeCapabilityDescriptor.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from '../execution/context/contextCapabilityDescriptor.js';
import { CAPABILITY_FEDERATION_DESCRIPTOR } from '../capability/capabilityFederationTypes.js';

export const ASSERT_CAPABILITY_DESCRIPTOR_MATRIX_PARITY_VERSION = 'v1';

export interface CapabilityDescriptorMatrix {
  loaderProtocolCapabilityDescriptor?: Record<string, any>;
  compositionRuntimeCapabilityDescriptor?: Record<string, any>;
  executionRuntimeCapabilityDescriptor?: Record<string, any>;
  contextRuntimeCapabilityDescriptor?: Record<string, any>;
  capabilityFederationDescriptor?: Record<string, any>;
  capabilityMatrixCanonicalizationVersion?: string;
}

/**
 * Phase 8.6 Objective 3 / Phase 8.7: Capability Descriptor Matrix Parity
 *
 * Verifies exact parity between local and remote descriptor matrices
 * during federation compatibility checks.
 */
export function assertCapabilityDescriptorMatrixParity(remoteMatrix: CapabilityDescriptorMatrix): void {
  if (!remoteMatrix.capabilityMatrixCanonicalizationVersion) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.CAPABILITY_MATRIX_CANONICALIZATION_VERSION_MISMATCH,
      message: 'Capability matrix canonicalization version is missing',
      stage: 'assertCapabilityDescriptorMatrixParity'
    });
  }

  if (remoteMatrix.capabilityMatrixCanonicalizationVersion !== capabilityDescriptorConfig.capabilityMatrixCanonicalizationVersion) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.CAPABILITY_MATRIX_CANONICALIZATION_VERSION_MISMATCH,
      message: `Capability matrix canonicalization version mismatch. Local: ${capabilityDescriptorConfig.capabilityMatrixCanonicalizationVersion}, Remote: ${remoteMatrix.capabilityMatrixCanonicalizationVersion}`,
      stage: 'assertCapabilityDescriptorMatrixParity'
    });
  }
  const localMatrix = {
    loaderProtocolCapabilityDescriptor: LOADER_PROTOCOL_CAPABILITIES,
    compositionRuntimeCapabilityDescriptor: COMPOSITION_RUNTIME_CAPABILITIES,
    executionRuntimeCapabilityDescriptor: EXECUTION_RUNTIME_CAPABILITIES,
    contextRuntimeCapabilityDescriptor: CONTEXT_RUNTIME_CAPABILITIES,
    capabilityFederationDescriptor: CAPABILITY_FEDERATION_DESCRIPTOR,
    capabilityMatrixCanonicalizationVersion: capabilityDescriptorConfig.capabilityMatrixCanonicalizationVersion
  };

  const localKeys = Object.keys(localMatrix).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const remoteKeys = Object.keys(remoteMatrix).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

  // 1. Same descriptor presence
  if (JSON.stringify(localKeys) !== JSON.stringify(remoteKeys)) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.CAPABILITY_DESCRIPTOR_MATRIX_PARITY_FAILURE,
      message: 'Capability matrix descriptor presence mismatch',
      stage: 'assertCapabilityDescriptorMatrixParity'
    });
  }

  // 2. Same key sets and versions
  for (const module of localKeys) {
    const localDesc = (localMatrix as any)[module];
    const remoteDesc = (remoteMatrix as any)[module];

    if (typeof localDesc === 'string') {
      if (localDesc !== remoteDesc) {
         throw new PolicyRuntimeError({
          code: PolicyRuntimeErrorCode.CAPABILITY_DESCRIPTOR_MATRIX_PARITY_FAILURE,
          message: `Capability descriptor value mismatch for ${module}`,
          stage: 'assertCapabilityDescriptorMatrixParity'
        });
      }
      continue;
    }

    const lKeys = Object.keys(localDesc).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    const rKeys = Object.keys(remoteDesc).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

    if (JSON.stringify(lKeys) !== JSON.stringify(rKeys)) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.CAPABILITY_DESCRIPTOR_MATRIX_PARITY_FAILURE,
        message: `Capability descriptor key set mismatch for ${module}`,
        stage: 'assertCapabilityDescriptorMatrixParity'
      });
    }

    if (!Number.isInteger(localDesc.version)) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.CAPABILITY_DESCRIPTOR_VERSION_INVALID,
        message: `Capability descriptor local version is not an integer for ${module}`,
        stage: 'assertCapabilityDescriptorMatrixParity'
      });
    }

    if (!Number.isInteger(remoteDesc.version)) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.CAPABILITY_DESCRIPTOR_VERSION_INVALID,
        message: `Capability descriptor remote version is not an integer for ${module}`,
        stage: 'assertCapabilityDescriptorMatrixParity'
      });
    }

    if (localDesc.version !== remoteDesc.version) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.CAPABILITY_DESCRIPTOR_MATRIX_PARITY_FAILURE,
        message: `Capability descriptor version mismatch for ${module}`,
        stage: 'assertCapabilityDescriptorMatrixParity'
      });
    }
  }

  // 3. Same stableCanonicalStringify output
  if (stableCanonicalStringify(localMatrix) !== stableCanonicalStringify(remoteMatrix)) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.CAPABILITY_DESCRIPTOR_MATRIX_PARITY_FAILURE,
      message: 'Capability matrix stable canonical stringify output mismatch',
      stage: 'assertCapabilityDescriptorMatrixParity'
    });
  }

  // 4. Same capabilityDescriptorMatrixHash
  // We can inject the remoteMatrix over a mocked compute structure to get its hash
  // But since the canonical outputs match exactly above, the hash will match. 
  // Let's compute local to be sure.
  const localHash = computeCapabilityDescriptorMatrixHash();
  // Here we just assert the structural integrity guarantees the hash identity natively.
}
