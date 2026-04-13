import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../../errors/policyErrors.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from './contextCapabilityDescriptor.js';
import { isDeeplyFrozen, deepFreezeDeterministic } from '../../transport/deepFreezeDeterministic.js';
import { assertCapabilityDescriptorMatrixParity, CapabilityDescriptorMatrix } from '../../transport/assertCapabilityDescriptorMatrixParity.js';
import { capabilityDescriptorConfig, computeCapabilityDescriptorMatrixHash } from '../../transport/capabilityDescriptorMatrixHash.js';

export const ASSERT_CONTEXT_FEDERATION_COMPATIBILITY_VERSION = 'v1';

export function assertCapabilityDescriptorParity(
  localCaps: Record<string, any>,
  remoteCaps: Record<string, any>,
  surfaceName: string
): void {
  const localKeys = Object.keys(localCaps).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const remoteKeys = Object.keys(remoteCaps).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

  if (JSON.stringify(localKeys) !== JSON.stringify(remoteKeys)) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.CONTEXT_FEDERATION_INCOMPATIBLE,
      message: `${surfaceName} Capability Descriptor shape mismatch. Prevented silent downgrade attack vector.`,
      stage: 'assertCapabilityDescriptorParity'
    });
  }

  // Freeze verification
  if (!isDeeplyFrozen(remoteCaps)) {
    deepFreezeDeterministic(remoteCaps, `${surfaceName}_remote`);
  }
}

/**
 * Phase 8.5 Objective 5 & 6: Assert Context Federation Compatibility
 */
export function assertContextFederationCompatibility(
  incomingVersion: string,
  incomingCapabilities: Record<string, boolean>,
  remoteMatrix?: CapabilityDescriptorMatrix
): void {

  if (remoteMatrix) {
    assertCapabilityDescriptorMatrixParity(remoteMatrix);
  }

  assertCapabilityDescriptorParity(CONTEXT_RUNTIME_CAPABILITIES, incomingCapabilities, 'Context');

  const missingParity: string[] = [];

  // Enforce rigid lock-step deterministic serialization expectations
  if (incomingCapabilities.deterministicSerialization !== CONTEXT_RUNTIME_CAPABILITIES.deterministicSerialization) {
    missingParity.push('Serialization stability mapping parity broken.');
  }

  // Cross-reference signal availability parity 
  if (incomingCapabilities.principalSignalsSupported !== CONTEXT_RUNTIME_CAPABILITIES.principalSignalsSupported) {
    missingParity.push('Principal mapping surface parity broken.');
  }

  if (missingParity.length > 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.CONTEXT_FEDERATION_INCOMPATIBLE,
      message: `Context federation alignment failed. Incompatible logic bounds detected: [${missingParity.join(' ')}]`,
      stage: 'assertContextFederationCompatibility',
      federationRejectionDiagnostics: {
        expectedCanonicalizationVersion: remoteMatrix ? capabilityDescriptorConfig.capabilityMatrixCanonicalizationVersion : undefined,
        receivedCanonicalizationVersion: remoteMatrix?.capabilityMatrixCanonicalizationVersion,
        expectedDescriptorVersions: CONTEXT_RUNTIME_CAPABILITIES.version,
        receivedDescriptorVersions: incomingVersion,
        matrixHashLocal: remoteMatrix ? computeCapabilityDescriptorMatrixHash() : undefined,
        matrixHashRemote: undefined
      }
    });
  }
}
