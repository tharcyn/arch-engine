import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../../errors/policyErrors.js';
import { assertPlainObjectGraph } from '../../transport/assertPlainObjectGraph.js';

export const EVALUATION_CONTEXT_MODEL_VERSION = 'v1';

export interface EvaluationContextModel {
  principal: Record<string, string | number | boolean | null>;
  resource: Record<string, string | number | boolean | null>;
  tenant: string;
  environment: Record<string, string | number | boolean | null>;
  request: Record<string, string | number | boolean | null>;
  temporal: Record<string, string | number | boolean | null>;
  trustAnchors: Record<string, string>;
  featureFlags: Record<string, boolean>;
  customSignals: Record<string, unknown>;
}

/**
 * Phase 8 Objective 1: Evaluation Context Model
 *
 * Defines and guards the canonical context structure. Rejects unsafe objects
 * to guarantee serialization, equality, hash checks and deterministic replay.
 */
export function validateEvaluationContextModel(context: unknown): asserts context is EvaluationContextModel {
  if (!context || typeof context !== 'object') {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.EVALUATION_CONTEXT_INVALID_STRUCTURE,
      message: 'Evaluation context must be an object.',
      stage: 'evaluationContextModel'
    });
  }

  const model = context as any;
  const requiredKeys = [
    'principal', 'resource', 'tenant', 'environment', 
    'request', 'temporal', 'trustAnchors', 'featureFlags', 'customSignals'
  ];

  for (const key of requiredKeys) {
    if (!(key in model)) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.EVALUATION_CONTEXT_INVALID_STRUCTURE,
        message: `Evaluation context is missing required key: ${key}`,
        stage: 'evaluationContextModel'
      });
    }
  }

  // Ensure plain-object purity globally across context nodes
  try {
    assertPlainObjectGraph(context);
  } catch (error: any) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.EVALUATION_CONTEXT_INVALID_STRUCTURE,
      message: `Evaluation context contains non-plain-object types: ${error.message}`,
      stage: 'evaluationContextModel'
    });
  }
}
