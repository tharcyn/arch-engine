import { PolicyStackEntry } from '../policy/types.js';
import { CompositionExecutionGraph } from '../composition/CompositionGraphConstructor.js';
import { ArbitrationDecisionGraph } from '../composition/ArbitrationDecisionGraph.js';
import { COMPOSITION_RUNTIME_CAPABILITIES } from '../composition/compositionRuntimeCapabilityDescriptor.js';
import { EXECUTION_RUNTIME_CAPABILITIES } from './executionRuntimeCapabilityDescriptor.js';
import { CONTEXT_RUNTIME_CAPABILITIES } from './context/contextCapabilityDescriptor.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { isDeeplyFrozen } from '../transport/deepFreezeDeterministic.js';
import { validateEvaluationContextModel } from './context/EvaluationContextModel.js';
import { ContextNormalizationPipeline } from './context/ContextNormalizationPipeline.js';
import { ExecutionContextSerializer } from './context/ExecutionContextSerializer.js';
import { ContextCompatibilityVerifier } from './context/ContextCompatibilityVerifier.js';

import { assertCapabilityDescriptorMatrixParity, CapabilityDescriptorMatrix } from '../transport/assertCapabilityDescriptorMatrixParity.js';

export const POLICY_EXECUTION_RUNTIME_VERSION = 'v1';

/**
 * Phase 8 Objective 7: Integrate Context Into PolicyExecutionRuntime Entry Gate
 */
export function policyExecutionRuntimeEntry(
  rootMetadata: Record<string, any>, 
  executionSequence: string[],
  compositionGraph: CompositionExecutionGraph,
  arbitrationGraph: ArbitrationDecisionGraph,
  rawContext: unknown,
  remoteMatrix?: CapabilityDescriptorMatrix
): void {

  if (remoteMatrix) {
    assertCapabilityDescriptorMatrixParity(remoteMatrix);
  }

  // 1. Verify freeze. (Planner boundary compliance)
  if (!isDeeplyFrozen(rootMetadata)) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.EXECUTION_RUNTIME_ENTRY_INCOMPATIBLE_PROTOCOL,
      message: `Execution runtime entry failed: Evaluation payload relies on unfrozen metadata structure.`,
      stage: 'policyExecutionRuntimeEntry'
    });
  }

  // 2. Protocol capability alignments
  if (COMPOSITION_RUNTIME_CAPABILITIES.version !== 5 && !EXECUTION_RUNTIME_CAPABILITIES.explainabilityEmissionSupported) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.EXECUTION_RUNTIME_ENTRY_INCOMPATIBLE_PROTOCOL,
      message: `Execution runtime entry failed: Unsafe federation version boundaries detected.`,
      stage: 'policyExecutionRuntimeEntry'
    });
  }
  
  if (!compositionGraph.executionOrderingGraph) {
     throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.EXECUTION_RUNTIME_ENTRY_INCOMPATIBLE_PROTOCOL,
      message: `Execution runtime entry failed: compositionGraph lacks execution ordering mapping.`,
      stage: 'policyExecutionRuntimeEntry'
    });
  }

  // Phase 8: Context specific mapping routines
  try {
    // 3. Validation
    validateEvaluationContextModel(rawContext);
    
    // 4. Verification Check
    const contextVerifier = new ContextCompatibilityVerifier(EXECUTION_RUNTIME_CAPABILITIES, CONTEXT_RUNTIME_CAPABILITIES);
    contextVerifier.verify();
    
    // 5. Normalization Sequence
    const pipeline = new ContextNormalizationPipeline(rawContext);
    const normalizedContext = pipeline.normalize();
    
    // 6. Serialization Map
    const serializer = new ExecutionContextSerializer(normalizedContext);
    const serializationProof = serializer.serialize();

  } catch (error: any) {
     throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.EXECUTION_CONTEXT_VALIDATION_FAILURE,
      message: `Context validation failed downstream: ${error.message}`,
      stage: 'policyExecutionRuntimeEntry'
    });
  }

}
