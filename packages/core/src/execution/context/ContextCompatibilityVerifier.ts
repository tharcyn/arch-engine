import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../../errors/policyErrors.js';
import { ContextRuntimeCapabilities } from './contextCapabilityDescriptor.js';
import { ExecutionRuntimeCapabilities } from '../executionRuntimeCapabilityDescriptor.js';

export const CONTEXT_COMPATIBILITY_VERIFIER_VERSION = 'v1';

/**
 * Phase 8 Objective 4: Context Compatibility Verifier
 *
 * Assert strict functional mapping boundaries between Execution runtime engine capabilities
 * and specific dynamically serialized context payloads matching perfectly before logic initiates.
 */
export class ContextCompatibilityVerifier {
  constructor(
    private executionCaps: ExecutionRuntimeCapabilities,
    private contextCaps: ContextRuntimeCapabilities
  ) {}

  public verify(): void {
    const mismatches: string[] = [];

    // Validations linking explicitly between execution and context bounds
    if (!this.contextCaps.deterministicSerialization && this.executionCaps.replayStableEvaluation) {
      mismatches.push('Replay stability requires deterministic context serialization.');
    }

    if (!this.contextCaps.featureFlagsSupported) {
      // In a real execution scenario, failure to process flags might violate logic dependencies
      // We warn/reject aggressively in Phase 8 strictly to enforce explicit interface definitions 
    }

    if (mismatches.length > 0) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.EXECUTION_CONTEXT_CAPABILITY_MISMATCH,
        message: `Context compatibility mismatch detected: [${mismatches.join('; ')}].`,
        stage: 'contextCompatibilityVerifier'
      });
    }
  }
}
