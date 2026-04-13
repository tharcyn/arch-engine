import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { CompositionRuntimeCapabilities } from './compositionRuntimeCapabilityDescriptor.js';
import { LoaderProtocolCapabilities } from '../transport/loaderProtocolCapabilityDescriptor.js';
import { assertCapabilityDescriptorMatrixParity, CapabilityDescriptorMatrix } from '../transport/assertCapabilityDescriptorMatrixParity.js';

export const COMPOSITION_RUNTIME_COMPATIBILITY_VERSION = 'v1';

/**
 * Phase 5 Objective 7: Transport Capability Negotiation Hook
 */
export function assertCompositionRuntimeCompatibility(
  loaderCapabilities: LoaderProtocolCapabilities,
  runtimeCapabilities: CompositionRuntimeCapabilities,
  remoteMatrix?: CapabilityDescriptorMatrix
): void {

  if (remoteMatrix) {
    assertCapabilityDescriptorMatrixParity(remoteMatrix);
  }

  const failures: string[] = [];

  // Currently we demand the runtime explicitly supports planner boundary compliance.
  // We mirror the prompt requirements directly.
  if (loaderCapabilities.deterministicTopology && !runtimeCapabilities.deterministicTierResolution) {
    failures.push('deterministic topology is required but deterministic tier resolution is not supported by runtime');
  }

  // Planner boundary compliance is non-negotiable for a Phase-5 runtime
  if (loaderCapabilities.plannerBoundaryEnforced && !runtimeCapabilities.plannerBoundaryCompliance) {
    failures.push('loader boundary enforced but runtime lacks planner boundary compliance');
  }

  // Precedence graph planning is required if deep immutability relies on external conflict checks
  if (loaderCapabilities.deepMetadataImmutability && !runtimeCapabilities.precedenceGraphPlanning) {
    failures.push('deep metadata immutability requires runtime precedence graph planning');
  }

  // Predictability mismatch on entropy awareness
  if (loaderCapabilities.manifestEntropyAwareIdentity && !runtimeCapabilities.conflictSurfaceDetection) {
    failures.push('manifest entropy identity requires runtime conflict surface detection');
  }

  if (failures.length > 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.COMPOSITION_RUNTIME_CAPABILITY_MISMATCH,
      message: `Composition runtime capability negotiation failed: [${failures.join('; ')}]. ` +
        `Contract: ${COMPOSITION_RUNTIME_COMPATIBILITY_VERSION}`,
      stage: 'compositionCapabilityNegotiation'
    });
  }
}
